
import { JSDOM } from 'jsdom';
import fs from 'fs';

const HTML_FILE = '/run/user/1000/doc/e05f278e/Особовий склад/messages.html';
const html = fs.readFileSync(HTML_FILE, 'utf-8');
const dom = new JSDOM(html);
const messages = dom.window.document.querySelectorAll('.message.default');

console.log(`Total messages in HTML: ${messages.length}`);

messages.forEach((msg, i) => {
    const textElem = msg.querySelector('.text');
    if (!textElem) {
        console.log(`Msg ${i}: SKIP - No text content found.`);
        return;
    }

    const text = textElem.innerHTML;
    const lines = text.split('<br>').map(l => l.replace(/^- /, '').trim());

    // Check name pattern
    const nameLine = lines[0];
    const nameMatch = nameLine.match(/^([^0-9]+)\s+(\d{2}\.\d{2}\.\d{4})\s+р\.н\./);

    if (!nameMatch) {
        console.log(`Msg ${i}: SKIP - Name/DOB match failed. Line 0: "${nameLine}"`);
        return;
    }

    // Check badge
    const badgeLine = lines.find(l => l.includes('Номер жетону'));
    if (!badgeLine) {
        console.log(`Msg ${i}: SKIP - No "Номер жетону" found for: ${nameLine}`);
        return;
    }
});
