
import * as XLSX from 'xlsx';

async function main() {
    const filePath = '/run/user/1000/doc/e05f278e/Особовий склад/Штатка_УПП_у_Вінницькій_області_05_02_26.xlsx';
    console.log(`Reading Excel file: ${filePath}`);

    try {
        const workbook = XLSX.readFile(filePath);
        const indices = [2, 3, 4];

        indices.forEach(idx => {
            const name = workbook.SheetNames[idx];
            if (!name) {
                console.log(`\n--- [${idx}] Sheet not found ---`);
                return;
            }

            const worksheet = workbook.Sheets[name];
            const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            console.log(`\n--- [${idx}] ${name} ---`);
            let count = 0;
            for (let i = 0; i < data.length && count < 20; i++) {
                const row = data[i];
                if (row && row.some(cell => cell !== null && cell !== '')) {
                    console.log(`Row ${i}:`, JSON.stringify(row).substring(0, 500));
                    count++;
                }
            }
            if (count === 0) console.log('No data found');
        });

    } catch (error) {
        console.error('Error reading Excel file:', error.message);
    }
}

main();
