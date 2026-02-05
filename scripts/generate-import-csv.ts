
import { JSDOM } from 'jsdom'
import fs from 'fs'
import path from 'path'

const HTML_FILE = process.argv[2]
if (!HTML_FILE) {
    console.error('Usage: npx tsx scripts/generate-import-csv.ts <path_to_messages.html>')
    process.exit(1)
}

const OUTPUT_FILE = 'officers_with_photos.csv'

async function main() {
    console.log(`📡 Parsing: ${HTML_FILE}`)

    const html = fs.readFileSync(HTML_FILE, 'utf-8')
    const dom = new JSDOM(html)
    const document = dom.window.document

    const messages = document.querySelectorAll('.message.default')

    const headers = ["Відділення", "Звання", "Номер жетону", "Прізвище", "Ім'я", "По-батькові", "Дата народження", "Телефон", "Фото"]
    const rows: string[][] = [headers]

    for (const msg of Array.from(messages)) {
        try {
            const textContent = msg.querySelector('.text')?.innerHTML
            if (!textContent) continue

            // Split by br and strip all HTML tags from each line
            const lines = textContent.split('<br>').map(l =>
                l.replace(/<[^>]*>/g, '') // Strip tags
                    .replace(/^- /, '')
                    .trim()
            )

            // 1. Name and BirthDate (relaxed regex for missing spaces before р.н.)
            const firstLine = lines[0]
            const nameMatch = firstLine.match(/^([^0-9]+)\s+(\d{2}\.\d{2}\.\d{4})\s*р\.н\./)
            if (!nameMatch) continue

            const fullName = nameMatch[1].trim()
            const birthDateStr = nameMatch[2]
            const [bDay, bMonth, bYear] = birthDateStr.split('.')
            const birthDate = `${bYear}-${bMonth}-${bDay}`

            const nameParts = fullName.split(/\s+/)
            const lastName = nameParts[0] || ''
            const firstName = nameParts[1] || ''
            const middleName = nameParts.slice(2).join(' ') || ''

            // 2. Rank and Department
            const rank = lines[2] || ''
            const department = lines[1] || ''

            // 4. Badge Number
            const badgeLine = lines.find(l => l.includes('Номер жетону'))
            let badgeNumber = ''
            if (badgeLine) {
                const badgeMatch = badgeLine.match(/(\d+)/)
                if (badgeMatch) badgeNumber = badgeMatch[1]
            }
            if (!badgeNumber) continue

            // 5. Phone
            const phoneLine = lines.find(l => l.includes('Тел.'))
            let phone = ''
            if (phoneLine) {
                phone = phoneLine.replace('Тел.', '').trim().replace(/\s+/g, '')
                if (phone.startsWith('0')) phone = '380' + phone.substring(1)
                else if (!phone.startsWith('380') && !phone.startsWith('+380')) {
                    if (phone.startsWith('38')) phone = '38' + phone // preserve
                    else phone = '380' + phone // fallback
                }
            }

            // 6. Photo linkage logic
            // We use the same UUID logic as in the import script if we want consistency,
            // but for CSV import we need to know what filenames are ALREADY on the server.
            // Since I rsync-ed the photos from my 'uploads' folder, I should check my local 'uploads'
            // or use a consistent mapping. 
            // In the initial import, I used crypto.randomUUID(). 
            // This is tricky for CSV.

            // Wait, I have 120 officers in the DB already. 
            // If I regenerate the CSV from the HTML, I won't have the UUIDs unless I look in the DB.

            // Let's do this: 
            // 1. Get existing officers from DB to preserve their imageUrls.
            // 2. For new officers, they won't have photos unless I run the import script again.

            // Actually, the user already has the photos on the server.
            // I should probably just run the FULL import script again (it handles photos and DB).

            rows.push([
                department,
                rank,
                badgeNumber,
                lastName,
                firstName,
                middleName,
                birthDate,
                phone,
                "" // Placeholder for photo, we'll fill it if we can
            ])
        } catch (err) { }
    }

    // Better idea: Generate CSV directly from the local DB which I just updated with the import script.
    // But first, let's fix the import script and RUN IT AGAIN.
}
main();
