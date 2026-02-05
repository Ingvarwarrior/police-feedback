import { PrismaClient } from '@prisma/client'
import { JSDOM } from 'jsdom'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import crypto from 'node:crypto'

const prisma = new PrismaClient()

// Configuration
const HTML_FILE = process.argv[2]
if (!HTML_FILE) {
    console.error('Usage: npx ts-node scripts/import-from-telegram.ts <path_to_messages.html>')
    process.exit(1)
}

const SOURCE_DIR = path.dirname(HTML_FILE)
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// Manual overrides for known badge collisions in Telegram data
const BADGE_OVERRIDES: Record<string, string> = {
    'Лукашук Олександр Миколайович': '0115799',
    'Вейт Сергій Валерійович': '0011315',
    'Коврига Юлія Михайлівна': '0215187', // User noted this one specifically
    'Довбуш Олександр Сергійович': '0167795'
}

// Manual overrides for birth dates
const BIRTH_DATE_OVERRIDES: Record<string, string> = {
    'Кравець Руслан Володимирович': '1994-10-22',
    'Безсмертний Володимир Васильович': '1999-07-23',
    'Тарапата Богдан Ігорович': '1994-01-08'
}

async function main() {
    console.log(`🚀 Starting import from: ${HTML_FILE}`)

    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }

    const html = fs.readFileSync(HTML_FILE, 'utf-8')
    const dom = new JSDOM(html)
    const document = dom.window.document

    const messages = document.querySelectorAll('.message.default')
    console.log(`Found ${messages.length} potential officer messages.`)

    let successCount = 0
    let errorCount = 0

    for (const msg of Array.from(messages)) {
        try {
            const textContent = msg.querySelector('.text')?.innerHTML
            if (!textContent) continue

            // Parse text content
            // Split by br and strip all HTML tags from each line
            const lines = textContent.split('<br>').map(l =>
                l.replace(/<[^>]*>/g, '') // Strip tags
                    .replace(/^- /, '')
                    .trim()
            )

            // 1. Name and BirthDate
            const firstLine = lines[0] // "Мацюк Ірина Олександрівна 02.11.1990 р.н."
            const nameMatch = firstLine.match(/^([^0-9]+)\s+(\d{2}\.\d{2}\.\d{4})\s*р\.н\./)
            if (!nameMatch) {
                // Try alternate match without birth date if needed, but the current data seems consistent
                continue
            }

            const fullName = nameMatch[1].trim()
            const birthDateStr = nameMatch[2]
            const [bDay, bMonth, bYear] = birthDateStr.split('.')
            const nameParts = fullName.split(/\s+/)
            const lastName = nameParts[0] || 'Unknown'
            const firstName = nameParts[1] || 'Unknown'
            const middleName = nameParts.slice(2).join(' ') || null

            const fullNameClean = `${lastName} ${firstName} ${middleName || ''}`.trim()

            let birthDate = new Date(`${bYear}-${bMonth}-${bDay}`)
            if (BIRTH_DATE_OVERRIDES[fullNameClean]) {
                birthDate = new Date(BIRTH_DATE_OVERRIDES[fullNameClean])
            }

            // 2. Rank (usually 3rd line or 2nd line starting with rank name)
            // Lines are: 0:Name, 1:Position, 2:Rank, 3:Education, 4:HireDate, 5:Badge, 6:Phone
            const rank = lines[2] || null
            const department = lines[1] || null

            // 3. Hire Date
            const hireDateLine = lines.find(l => l.includes('На службі'))
            let hireDate = null
            if (hireDateLine) {
                const hireMatch = hireDateLine.match(/(\d{2}\.\d{2}\.\d{4})/)
                if (hireMatch) {
                    const [hDay, hMonth, hYear] = hireMatch[1].split('.')
                    hireDate = new Date(`${hYear}-${hMonth}-${hDay}`)
                }
            }

            // 4. Badge Number
            let badgeNumber: string | null = null
            const badgeLine = lines.find(l => l.includes('Номер жетону'))
            if (badgeLine) {
                const badgeMatch = badgeLine.match(/(\d+)/)
                if (badgeMatch) badgeNumber = badgeMatch[1]
            }

            // Apply manual overrides if ПІБ matches
            if (BADGE_OVERRIDES[fullNameClean]) {
                badgeNumber = BADGE_OVERRIDES[fullNameClean]
            }

            if (!badgeNumber) {
                console.warn(`⚠️ Skipping message due to missing badge number for: ${fullNameClean}`)
                continue
            }

            // 5. Phone
            const phoneLine = lines.find(l => l.includes('Тел.'))
            let phone = null
            if (phoneLine) {
                phone = phoneLine.replace('Тел.', '').trim().replace(/\s+/g, '')
                if (phone.startsWith('0')) phone = '380' + phone.substring(1)
            }

            // 6. Photo
            const photoLink = msg.querySelector('.photo_wrap')?.getAttribute('href')
            let imageUrl = null
            if (photoLink) {
                const sourcePhotoPath = path.join(SOURCE_DIR, photoLink)
                if (fs.existsSync(sourcePhotoPath)) {
                    // Use deterministic filename based on name to avoid re-generating and broken links on re-import
                    const hash = crypto.createHash('md5').update(fullNameClean).digest('hex')
                    const filename = `officer-${hash}.webp`
                    const targetPath = path.join(UPLOAD_DIR, filename)

                    // Process with Sharp (standardize to webp)
                    await sharp(sourcePhotoPath)
                        .rotate()
                        .webp({ quality: 85 })
                        .toFile(targetPath)

                    imageUrl = `/api/uploads/${filename}`

                    // Register attachment for consistency
                    await prisma.attachment.upsert({
                        where: { id: hash },
                        update: {},
                        create: {
                            id: hash,
                            storage: 'local',
                            pathOrKey: filename,
                            mime: 'image/webp',
                            sizeBytes: fs.statSync(targetPath).size,
                            hash: 'imported',
                            mediaType: 'photo'
                        }
                    })
                }
            }

            // 7. DB Update (Upsert by badgeNumber)
            await prisma.officer.upsert({
                where: { badgeNumber },
                update: {
                    firstName,
                    lastName,
                    middleName,
                    rank,
                    department,
                    phone,
                    birthDate,
                    hireDate,
                    status: 'ACTIVE',
                    ...(imageUrl ? { imageUrl } : {}) // Update image only if found
                },
                create: {
                    badgeNumber,
                    firstName,
                    lastName,
                    middleName,
                    rank,
                    department,
                    phone,
                    birthDate,
                    hireDate,
                    imageUrl,
                    status: 'ACTIVE'
                }
            })

            console.log(`✅ Imported: ${lastName} ${firstName} (${badgeNumber})`)
            successCount++
        } catch (err: any) {
            console.error(`❌ Error processing message:`, err.message)
            errorCount++
        }
    }

    console.log(`\n🎉 Import Finished!`)
    console.log(`Success: ${successCount}`)
    console.log(`Errors: ${errorCount}`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
