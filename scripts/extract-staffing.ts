
import * as XLSX from 'xlsx';
import fs from 'fs';

const FILE_PATH = '/run/user/1000/doc/e05f278e/Особовий склад/Штатка_УПП_у_Вінницькій_області_05_02_26.xlsx';

async function main() {
    const workbook = XLSX.readFile(FILE_PATH);
    const officers: any[] = [];
    const sheetIndices = [2, 3, 4];

    sheetIndices.forEach(idx => {
        const sheetName = workbook.SheetNames[idx];
        if (!sheetName) return;

        const worksheet = workbook.Sheets[sheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        data.forEach((row, rowIdx) => {
            if (!row || !Array.isArray(row)) return;

            // Looking for a cell with name (usually uppercase) and badge number in parentheses
            // Example: "КОРЖ Микола Петрович (0011330)"
            const nameCell = row.find(c => typeof c === 'string' && /\(\d{7}\)/.test(c));

            if (nameCell) {
                const match = nameCell.match(/^([А-ЯІЇЄ\s\-]+)\s+([А-ЯІЇЄа-яіїє\s\-]+)\s+\((\d+)\)/);

                if (match) {
                    const fullName = (match[1] + ' ' + match[2]).trim();
                    const badge = match[3];

                    // Rank is usually in column 4 or row's cell 4
                    const rank = row[4] || '';

                    // Dept is usually in column 3 or row's cell 3
                    const dept = row[3] || '';

                    // Phone is usually a string of 10 digits
                    const phoneCell = row.find(c => {
                        if (typeof c === 'string') {
                            const clean = c.replace(/\s+/g, '');
                            return clean.length === 10 && /^\d+$/.test(clean);
                        }
                        if (typeof c === 'number') {
                            return String(c).length === 10;
                        }
                        return false;
                    });

                    let phone = '';
                    if (phoneCell) {
                        phone = String(phoneCell).replace(/\s+/g, '');
                        if (phone.startsWith('0')) phone = '38' + phone;
                        else if (phone.length === 10) phone = '380' + phone;
                    }

                    // Store standardized data
                    const nameParts = fullName.split(/\s+/);
                    officers.push({
                        lastName: nameParts[0] || '',
                        firstName: nameParts[1] || '',
                        middleName: nameParts.slice(2).join(' ') || '',
                        fullName,
                        badge,
                        rank: String(rank).split(',')[0].trim(), // Clean up rank
                        dept: String(dept).trim(),
                        phone,
                        sheet: sheetName,
                        row: rowIdx
                    });
                }
            }
        });
    });

    console.log(`TOTAL OFFICERS EXTRACTED: ${officers.length}`);

    // Save to JSON for further inspection or import
    fs.writeFileSync('extracted_staffing.json', JSON.stringify(officers, null, 2));

    // Sample
    console.log('\n--- Sample (first 5) ---');
    console.log(JSON.stringify(officers.slice(0, 5), null, 2));

    // Badge collisions in Excel itself?
    const badgeMap = new Map();
    officers.forEach(o => {
        if (!badgeMap.has(o.badge)) badgeMap.set(o.badge, []);
        badgeMap.get(o.badge).push(o.fullName);
    });

    console.log('\n--- Excel Badge Collisions ---');
    let collisionFound = false;
    badgeMap.forEach((names, badge) => {
        if (names.length > 1) {
            collisionFound = true;
            console.log(`⚠️ Badge ${badge}: ${names.join(' | ')}`);
        }
    });
    if (!collisionFound) console.log('None found in Excel data.');
}

main().catch(console.error);
