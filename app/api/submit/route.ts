import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { z } from 'zod'
import { sendNewReportEmail } from '@/lib/mail'

const submitSchema = z.object({
    clientGeneratedId: z.string().min(1).optional(),
    hasConsent: z.boolean(),
    wantContact: z.boolean(),
    contactName: z.string().optional().nullable(),
    contactPhone: z.string().optional().nullable(),
    districtOrCity: z.string().optional().nullable(),
    interactionDate: z.string().optional().nullable(),
    interactionTime: z.string().optional().nullable(),
    incidentType: z.string().optional().nullable(),
    responseTime: z.string().optional().nullable(),
    patrolRef: z.string().optional().nullable(),
    officerName: z.string().optional().nullable(),
    badgeNumber: z.string().optional().nullable(),
    ratings: z.object({
        politeness: z.number().min(1).max(5),
        professionalism: z.number().min(1).max(5),
        effectiveness: z.number().min(1).max(5),
        overall: z.number().min(1).max(5),
    }),
    comment: z.string().optional().nullable(),
    geoPoint: z.object({
        lat: z.number(),
        lon: z.number(),
        accuracyMeters: z.number().optional().nullable(),
        source: z.string().optional().nullable(),
        precisionMode: z.enum(['approx', 'exact']).optional().nullable(),
    }).optional().nullable(),
    attachmentIds: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Validate input
        const validation = submitSchema.safeParse(body)
        if (!validation.success) {
            console.error('Validation failed:', validation.error.format())
            return NextResponse.json({
                error: 'Invalid data',
                details: validation.error.issues
            }, { status: 400 })
        }

        const data = validation.data
        const headerPayload = await headers()

        const ip = headerPayload.get('x-forwarded-for') || 'unknown'
        const ipHash = crypto.createHash('sha256').update(ip + (process.env.AUTH_SECRET || 'salt')).digest('hex')

        // Smart Guard: Check for rapid submissions from the same IP
        const oneHourAgo = new Date()
        oneHourAgo.setHours(oneHourAgo.getHours() - 1)
        const recentSubmissionsCount = await prisma.response.count({
            where: {
                ipHash,
                createdAt: { gte: oneHourAgo }
            }
        })

        const isSuspicious = recentSubmissionsCount >= 5

        const result = await prisma.$transaction(async (tx) => {
            // Find or link Citizen
            let citizenId = null

            if (data.contactPhone) {
                // 1. Search by phone (primary field)
                let citizen = await (tx as any).citizen.findUnique({
                    where: { phone: data.contactPhone }
                })

                // 2. Search in CitizenPhone table
                if (!citizen) {
                    const phoneRecord = await (tx as any).citizenPhone.findUnique({
                        where: { phone: data.contactPhone }
                    })
                    if (phoneRecord) {
                        citizen = await (tx as any).citizen.findUnique({
                            where: { id: phoneRecord.citizenId }
                        })
                    }
                }

                if (!citizen) {
                    citizen = await (tx as any).citizen.create({
                        data: {
                            phone: data.contactPhone,
                            fullName: data.contactName || null,
                            ipHash: ipHash,
                            phones: {
                                create: { phone: data.contactPhone }
                            }
                        }
                    })
                }
                citizenId = citizen.id
            }

            // Check for officer link (Evaluate Officer System)
            let officerId = null
            if (data.badgeNumber) {
                const officer = await tx.officer.findUnique({
                    where: { badgeNumber: data.badgeNumber }
                })
                if (officer) {
                    officerId = officer.id
                }
            }

            const response = await (tx.response as any).create({
                data: {
                    clientGeneratedId: data.clientGeneratedId || crypto.randomUUID(),
                    ipHash,
                    userAgent: headerPayload.get('user-agent'),
                    suspicious: isSuspicious,
                    consent: data.hasConsent,
                    wantContact: data.wantContact,
                    districtOrCity: data.districtOrCity,
                    interactionDate: data.interactionDate ? new Date(data.interactionDate) : null,
                    interactionTime: data.interactionTime,
                    incidentType: data.incidentType,
                    responseTimeBucket: data.responseTime,
                    patrolRef: data.patrolRef,
                    officerName: data.officerName,
                    badgeNumber: data.badgeNumber,
                    officerId, // Link to officer
                    citizenId, // Link to citizen
                    ratePoliteness: data.ratings.politeness,
                    rateProfessionalism: data.ratings.professionalism,
                    rateEffectiveness: data.ratings.effectiveness,
                    rateOverall: data.ratings.overall,
                    comment: data.comment,
                    submittedAt: new Date(),
                }
            })

            // Auto-create evaluation if officer found
            if (officerId) {
                await (tx as any).officerEvaluation.create({
                    data: {
                        officerId,
                        type: 'CITIZEN_FEEDBACK',
                        sourceId: response.id,
                        scoreCommunication: data.ratings.politeness,
                        scoreProfessionalism: data.ratings.professionalism,
                        notes: data.comment
                    }
                })
            }

            if (data.wantContact && data.contactPhone) {
                await tx.contact.create({
                    data: {
                        responseId: response.id,
                        phone: data.contactPhone,
                        name: data.contactName
                    }
                })
            }

            if (data.geoPoint) {
                let lat = data.geoPoint.lat
                let lon = data.geoPoint.lon

                // Enforce rounding for privacy if needed
                if (data.geoPoint.precisionMode === 'approx') {
                    lat = Math.round(lat * 1000) / 1000
                    lon = Math.round(lon * 1000) / 1000
                }

                await tx.geoPoint.create({
                    data: {
                        responseId: response.id,
                        lat: lat,
                        lon: lon,
                        accuracyMeters: data.geoPoint.accuracyMeters,
                        source: data.geoPoint.source || 'manual',
                        precisionMode: data.geoPoint.precisionMode || 'exact'
                    }
                })
            }

            if (data.attachmentIds && data.attachmentIds.length > 0) {
                await tx.attachment.updateMany({
                    where: { id: { in: data.attachmentIds } },
                    data: { responseId: response.id }
                })
            }

            return response
        })

        // NOTE: Running this OUTSIDE the transaction because Prisma client in transaction
        // acts weirdly with new models in Dev mode (persistence issues).
        // This is safer for reliability - if notification fails, we still save the report.
        // Create Global Notification for every new report
        try {
            await (prisma as any).adminNotification.create({
                data: {
                    type: 'NEW_REPORT',
                    priority: 'NORMAL',
                    title: '📄 Новий звіт',
                    message: `Отримано новий відгук (${data.ratings.overall}/5) по об'єкту ${data.patrolRef || 'не вказано'}.`,
                    link: `/admin/reports/${result.id}`
                    // userId omitted for global
                }
            })
        } catch (notifyError) {
            console.error('Failed to create general admin notification:', notifyError)
        }

        if (data.ratings.overall <= 2) {
            try {
                await (prisma as any).adminNotification.create({
                    data: {
                        type: 'CRITICAL_RATING',
                        priority: 'URGENT',
                        title: '⚠️ Критично низька оцінка',
                        message: `Отримано відгук з оцінкою ${data.ratings.overall} в районі ${data.districtOrCity || 'не вказано'}.`,
                        link: `/admin/reports/${result.id}`
                        // userId omitted for global
                    }
                })
            } catch (notifyError) {
                console.error('Failed to create critical admin notification:', notifyError)
            }
        }

        // Send Email Notification
        try {
            await sendNewReportEmail(result)
        } catch (emailError) {
            console.error('Failed to send email notification:', emailError)
        }

        return NextResponse.json({ success: true, id: result.id })

    } catch (error) {
        console.error('Submit error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
