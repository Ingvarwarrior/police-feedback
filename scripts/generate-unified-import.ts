
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';

const EXCEL_FILE = '/run/user/1000/doc/e05f278e/Особовий склад/Штатка_УПП_у_Вінницькій_області_05_02_26.xlsx';
const OUTPUT_FILE = 'officers_UNIFIED_OFFICIAL.csv';
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const SUFFIXES: Record<number, string> = {
    2: " УПП у Вінницькій області ДПП",
    3: " БПП з обслуговування Хмільницького району УПП у Вінницькій області ДПП",
    4: " батальйону полку поліції особливого призначення патрульної поліції (стрілецький) («Хижак – 1») УПП у Вінницькій області ДПП"
};

function getDeterministicPhotoUrl(fullName: string) {
    // Standardize name formatting to match how they were hashed previously
    // The previous script used: const fullNameClean = `${lastName} ${firstName} ${middleName || ''}`.trim()
    const hash = crypto.createHash('md5').update(fullName).digest('hex');
    const filename = `officer-${hash}.webp`;
    const localPath = path.join(UPLOADS_DIR, filename);

    if (fs.existsSync(localPath)) {
        return `/api/uploads/${filename}`;
    }
    return "";
}

async function main() {
    const workbook = XLSX.readFile(EXCEL_FILE);
    const resultRows: any[] = [];

    const headers = [
        "Відділення",
        "Звання",
        "ПІБ",
        "Номер жетону",
        "Дата народження",
        "Служба в ОВС",
        "Телефон",
        "Домашня адреса",
        "Освіта",
        "Фото"
    ];

    [2, 3, 4].forEach(idx => {
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

            const nameCell = row.find(c => typeof c === 'string' && /\(\d{7}\)/.test(c));
            if (!nameCell) return;

            // Handle "ВАКАНСІЯ" prefix
            if (nameCell.includes('ВАКАНСІЯ')) return;

            // More relaxed regex for name and badge - captures everything until the 7-digit badge
            const match = nameCell.match(/^(.+?)\s+\((\d{7})\)/);
            if (!match) {
                console.log(`[${sheetName}] Row ${rowIdx} - FAILED MATCH: ${nameCell}`);
                return;
            }
            sheetCount++;

            const fullNameRaw = match[1].trim();
            const badge = match[2];

            // Normalize name: Remove maiden name parentheses for photo hashing
            const cleanName = fullNameRaw.replace(/[\(\)]/g, ' ').replace(/\s+/g, ' ').trim();

            const nameParts = cleanName.split(/\s+/).filter(Boolean);
            const normalize = (s: string) => {
                if (s.length === 0) return "";
                return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
            };
            const fullNameNormalized = nameParts.map(normalize).join(' ');

            const photoUrl = getDeterministicPhotoUrl(fullNameNormalized);
            const fullNameForHash = fullNameNormalized; // For downstream use

            // 1. Посада
            const rawPos = String(row[3] || "").trim();
            const position = rawPos + suffix;

            // 2. Звання (Cell 4)
            const rawRank = String(row[4] || "").split(',')[0].trim();

            // 5. Дата народження (usually in col 10 or somewhere else? Let's check the prev log)
            // Looking at previous log: Row 37: [null,null,null,"інспектор...", "старший...", "КОРЖ...", 33090, "неповна...", "з 04.12.2015...", "наказ...", "не служив", 112, "наявний", "17.09.2018...", null, "0938528943", "Прописка..."]
            // 7. Телефон: usually index 15
            // 8. Адреса: usually index 16
            // 9. Освіта: index 7
            // 6. Служба: index 8

            const education = String(row[7] || "").trim();
            const hireInfo = String(row[8] || "").trim();
            const phoneCell = row[15] || "";
            let phone = String(phoneCell).replace(/\s+/g, '');
            if (phone.length === 10) phone = '380' + phone;

            const address = String(row[16] || "").trim();

            // BirthDate: usually NOT in this Excel based on peek? 
            // Wait, Row 37 had 33090 at index 6. 33090 might be an Excel date.
            // Let's check if there's a date-like number.
            let birthDate = "";
            if (typeof row[6] === 'number') {
                // Simple Excel date to ISO
                const d = new Date(Math.round((row[6] - 25569) * 86400 * 1000));
                birthDate = d.toISOString().split('T')[0];
            }

            resultRows.push([
                position,
                rawRank,
                fullNameForHash,
                badge,
                birthDate,
                hireInfo,
                phone,
                address,
                education,
                photoUrl
            ]);
        });
    });

    const csvContent = [
        headers.join(","),
        ...resultRows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(","))
    ].join("\n");

    fs.writeFileSync(OUTPUT_FILE, csvContent);
    console.log(`Generated ${OUTPUT_FILE} with ${resultRows.length} officers.`);
}

main().catch(console.error);
