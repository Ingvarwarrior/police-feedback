
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';

const EXCEL_FILE = '/run/user/1000/doc/e05f278e/Особовий склад/Штатка_УПП_у_Вінницькій_області_05_02_26.xlsx';
const OUTPUT_FILE = 'officers_UNIFIED_OFFICIAL_v2.csv';
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const SUFFIXES: Record<number, string> = {
    1: " УПП у Вінницькій області ДПП",
    2: " БПП з обслуговування Хмільницького району УПП у Вінницькій області ДПП",
    3: " БПП з обслуговування Вінницького району УПП у Вінницькій області ДПП"
};

function getDeterministicPhotoUrl(fullName: string) {
    const hash = crypto.createHash('md5').update(fullName).digest('hex');
    const filename = `officer-${hash}.webp`;
    const localPath = path.join(UPLOADS_DIR, filename);

    if (fs.existsSync(localPath)) {
        return `/api/uploads/${filename}`;
    }
    return "";
}

async function main() {
    console.log(`Reading Excel file: ${EXCEL_FILE}`);
    const workbook = XLSX.readFile(EXCEL_FILE);
    const resultRows: any[] = [];

    const headers = [
        "Відділення",
        "Звання",
        "Прізвище",
        "Ім'я",
        "По-батькові",
        "Номер жетону",
        "Дата народження",
        "Служба в ОВС",
        "Телефон",
        "Домашня адреса",
        "Освіта",
        "Фото"
    ];

    [1, 2, 3].forEach(idx => {
        const sheetName = workbook.SheetNames[idx];
        if (!sheetName) {
            console.log(`Sheet at index ${idx} not found`);
            return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const suffix = SUFFIXES[idx] || "";
        let sheetCount = 0;

        data.forEach((row, rowIdx) => {
            if (!row || !Array.isArray(row)) return;

            // Name + Badge is at Col 11
            const nameCell = row[11];
            if (!nameCell || typeof nameCell !== 'string') return;

            const match = nameCell.match(/^(.+?)\s+\((\d{7})\)/);
            if (!match) return;

            sheetCount++;
            const fullNameRaw = match[1].trim();
            const badge = match[2];

            // Normalize name: Title Case
            const normalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
            const cleanName = fullNameRaw.replace(/[\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
            const nameParts = cleanName.split(/\s+/).filter(Boolean);
            const fullNameNormalized = nameParts.map(normalize).join(' ');

            const photoUrl = getDeterministicPhotoUrl(fullNameNormalized);

            // Columns according to user and debug log:
            // 1. Посада: Col 4 + suffix
            const position = String(row[4] || "").trim() + suffix;

            // 2. Звання: Col 6
            const rank = String(row[6] || "").trim();

            // 5. Дата народження: Col 12
            const rawBirthVal = row[12];
            let birthDateRaw = "";
            if (typeof rawBirthVal === 'number') {
                const d = new Date(Math.round((rawBirthVal - 25569) * 86400 * 1000));
                birthDateRaw = d.toISOString().split('T')[0];
            } else {
                birthDateRaw = String(rawBirthVal || "").trim();
            }

            // 6. Служба в ОВС: Col 14
            const serviceHistory = String(row[14] || "").trim();

            // 7. Телефон: Col 22
            let phone = String(row[22] || "").replace(/\s+/g, '');
            if (phone.length === 10 && phone.startsWith('0')) phone = '38' + phone;

            // 8. Домашня адреса: Col 23
            const address = String(row[23] || "").trim();

            // 9. Освіта: Col 13
            const education = String(row[13] || "").trim();

            resultRows.push([
                position,
                rank,
                nameParts[0] || "", // Прізвище
                nameParts[1] || "", // Ім'я
                nameParts.slice(2).join(' ') || "", // По-батькові
                badge,
                birthDateRaw,
                serviceHistory,
                phone,
                address,
                education,
                photoUrl
            ]);
        });
        console.log(`[${sheetName}] Extracted ${sheetCount} officers.`);
    });

    const csvContent = [
        headers.join(","),
        ...resultRows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(","))
    ].join("\n");

    fs.writeFileSync(OUTPUT_FILE, csvContent);
    console.log(`\nDONE! Generated ${OUTPUT_FILE} with ${resultRows.length} officers.`);
}

main().catch(console.error);
