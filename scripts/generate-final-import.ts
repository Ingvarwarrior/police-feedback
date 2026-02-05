
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';

const EXCEL_FILE = '/run/user/1000/doc/e05f278e/Особовий склад/Штатка_УПП_у_Вінницькій_області_05_02_26.xlsx';
const OUTPUT_FILE = 'officers_FINAL_CORRECTED_v3.csv';
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

function safeParseDate(val: any) {
    if (!val) return "";
    if (typeof val === 'number') {
        // Excel date
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return isNaN(d.getTime()) ? "" : d.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    // Try to match DD.MM.YYYY
    const dMatch = str.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (dMatch) {
        const d = new Date(`${dMatch[3]}-${dMatch[2]}-${dMatch[1]}`);
        return isNaN(d.getTime()) ? "" : d.toISOString().split('T')[0];
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

    // User mapping (Letters to indices):
    // E=4, F=5, L=11, M=12, O=14, X=23, Y=24, N=13
    const COLS = {
        pos: 4,
        rank: 5,
        pib: 11,
        birth: 12,
        sluz: 14,
        tel: 23,
        adr: 24,
        osv: 13
    };

    [1, 2, 3].forEach(idx => {
        const sheetName = workbook.SheetNames[idx];
        if (!sheetName) return;

        const worksheet = workbook.Sheets[sheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const suffix = SUFFIXES[idx] || "";

        let sheetCount = 0;
        data.forEach((row, rowIdx) => {
            if (!row || !Array.isArray(row)) return;

            const nameCell = String(row[COLS.pib] || "");

            // STRICT VACANCY CHECK (ignore Cyrillic and English variations)
            const upperName = nameCell.toUpperCase();
            if (!nameCell || upperName.includes('ВАКАНСІЯ') || upperName.includes('BAKAHCIYA') || upperName.includes('VACANCY')) {
                return;
            }

            // Must have a badge in parentheses (7 digits)
            const match = nameCell.match(/^(.+?)\s+\((\d{7})\)/);
            if (!match) return;

            sheetCount++;
            let fullNameRaw = match[1].trim();
            const badge = match[2];

            // Normalize name: Title Case, remove redundant spaces and markers like (т.в.о.)
            fullNameRaw = fullNameRaw.replace(/\(т\.в\.о\.\)/gi, '').replace(/\s+/g, ' ').trim();
            const normalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
            const cleanName = fullNameRaw.replace(/[\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
            const nameParts = cleanName.split(/\s+/).filter(Boolean);
            const fullNameNormalized = nameParts.map(normalize).join(' ');

            const photoUrl = getDeterministicPhotoUrl(fullNameNormalized);

            const position = String(row[COLS.pos] || "").trim() + suffix;

            // Rank: take the part before the first comma (e.g. "лейтенант поліції, наказ...")
            const rankFull = String(row[COLS.rank] || "").trim();
            const rank = rankFull.split(',')[0].trim();

            const birthDate = safeParseDate(row[COLS.birth]);
            const serviceHistory = String(row[COLS.sluz] || "").trim();

            let phone = String(row[COLS.tel] || "").replace(/\s+/g, '');
            if (phone.length === 10 && phone.startsWith('0')) phone = '38' + phone;

            const address = String(row[COLS.adr] || "").trim();
            const education = String(row[COLS.osv] || "").trim();

            resultRows.push([
                position,
                rank,
                nameParts[0] || "",
                nameParts[1] || "",
                nameParts.slice(2).join(' ') || "",
                badge,
                birthDate,
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
