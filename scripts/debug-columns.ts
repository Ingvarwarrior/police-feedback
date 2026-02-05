
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
        // Find a row that looks like a header or early data
        for (let i = 0; i < Math.min(data.length, 100); i++) {
            const row = data[i];
            if (row && row.some(cell => typeof cell === 'string' && cell.length > 5)) {
                console.log(`Row ${i} structure:`);
                row.forEach((cell, colIdx) => {
                    console.log(`  Col ${colIdx}: ${String(cell).substring(0, 100)}`);
                });
                console.log('-----------------------------------');
                // show 2 more rows to be sure
                if (data[i + 1]) {
                    console.log(`Row ${i + 1}:`, JSON.stringify(data[i + 1]).substring(0, 500));
                }
                if (data[i + 2]) {
                    console.log(`Row ${i + 2}:`, JSON.stringify(data[i + 2]).substring(0, 500));
                }
                break;
            }
        }
    });
}

main().catch(console.error);
