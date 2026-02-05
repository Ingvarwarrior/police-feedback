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
            const birthDate = new Date(`${bYear}-${bMonth}-${bDay}`)

            const nameParts = fullName.split(/\s+/)
            const lastName = nameParts[0] || 'Unknown'
            const firstName = nameParts[1] || 'Unknown'
            const middleName = nameParts.slice(2).join(' ') || null

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
            const badgeLine = lines.find(l => l.includes('Номер жетону'))
            if (!badgeLine) continue
            const badgeMatch = badgeLine.match(/(\d+)/)
            if (!badgeMatch) continue
            const badgeNumber = badgeMatch[1]

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
                    const photoId = crypto.randomUUID()
                    const filename = `${photoId}.webp`
                    const targetPath = path.join(UPLOAD_DIR, filename)

                    // Process with Sharp (standardize to webp)
                    await sharp(sourcePhotoPath)
                        .rotate()
                        .webp({ quality: 85 })
                        .toFile(targetPath)

                    imageUrl = `/api/uploads/${filename}`

                    // Register attachment for consistency
                    await prisma.attachment.upsert({
                        where: { id: photoId },
                        update: {},
                        create: {
                            id: photoId,
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
