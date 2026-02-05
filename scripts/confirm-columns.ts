
import * as XLSX from 'xlsx';

const FILE_PATH = '/run/user/1000/doc/e05f278e/Особовий склад/Штатка_УПП_у_Вінницькій_області_05_02_26.xlsx';

async function main() {
    const workbook = XLSX.readFile(FILE_PATH);
    const indices = [2, 3, 4];

    indices.forEach(idx => {
        const name = workbook.SheetNames[idx];
        if (!name) return;
        const worksheet = workbook.Sheets[name];
        const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log(`\n--- [${idx}] ${name} ---`);
        for (let i = 0; i < Math.min(data.length, 50); i++) {
            const row = data[i];
            if (row && row.some(cell => typeof cell === 'string' && /\(\d{7}\)/.test(cell))) {
                console.log(`Row ${i} SAMPLE:`);
                row.forEach((cell, colIdx) => {
                    if (cell !== null && cell !== undefined && cell !== '') {
                        console.log(`  Col ${colIdx}: [${cell}]`);
                    }
                });
                console.log('-----------------------------------');
                break;
            }
        }
    });
}

main().catch(console.error);
