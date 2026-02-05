
import * as XLSX from 'xlsx';

async function main() {
    const filePath = '/run/user/1000/doc/e05f278e/Особовий склад/Штатка_УПП_у_Вінницькій_області_05_02_26.xlsx';
    try {
        const workbook = XLSX.readFile(filePath);
        console.log('--- Sheet Names ---');
        workbook.SheetNames.forEach((name, i) => {
            console.log(`[${i}] ${name}`);
        });

        // Also peek at the first 5 rows of the SECOND sheet if it exists
        if (workbook.SheetNames.length > 1) {
            const secondSheet = workbook.Sheets[workbook.SheetNames[1]];
            const data = XLSX.utils.sheet_to_json(secondSheet, { header: 1 });
            console.log(`\n--- First 5 rows of sheet [1] "${workbook.SheetNames[1]}" ---`);
            data.slice(0, 5).forEach((row, i) => {
                console.log(`Row ${i}:`, JSON.stringify(row));
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
