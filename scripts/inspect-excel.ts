
import * as XLSX from 'xlsx';
import path from 'path';

async function main() {
    const filePath = '/run/user/1000/doc/e05f278e/Особовий склад/Штатка_УПП_у_Вінницькій_області_05_02_26.xlsx';
    console.log(`Reading Excel file: ${filePath}`);

    try {
        const workbook = XLSX.readFile(filePath);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert worksheet to JSON (header: 1 returns array of arrays)
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log('--- Column Headers (first 3 rows) ---');
        data.slice(0, 3).forEach((row, i) => {
            console.log(`Row ${i}:`, JSON.stringify(row));
        });

        console.log('\n--- Sample Data Row ---');
        console.log(JSON.stringify(data[3] || 'No data row found'));

    } catch (error) {
        console.error('Error reading Excel file:', error.message);
    }
}

main();
