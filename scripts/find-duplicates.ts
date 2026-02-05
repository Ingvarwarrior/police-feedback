
import { JSDOM } from 'jsdom';
import fs from 'fs';

const HTML_FILE = '/run/user/1000/doc/e05f278e/Особовий склад/messages.html';
const html = fs.readFileSync(HTML_FILE, 'utf-8');
const dom = new JSDOM(html);
const messages = dom.window.document.querySelectorAll('.message.default');

const badgeMap = new Map();
const duplicates = [];

messages.forEach((msg, i) => {
    const textElem = msg.querySelector('.text');
    if (!textElem) return;

    const text = textElem.innerHTML;
    const lines = text.split('<br>').map(l => l.replace(/^- /, '').trim());

    const nameLine = lines[0];
    const nameMatch = nameLine.match(/^([^0-9]+)\s+(\d{2}\.\d{2}\.\d{4})\s*р\.н\./);
    if (!nameMatch) return;

    const fullName = nameMatch[1].trim();
    const badgeLine = lines.find(l => l.includes('Номер жетону'));
    if (!badgeLine) return;

    const badgeMatch = badgeLine.match(/(\d+)/);
    if (!badgeMatch) return;
    const badgeNumber = badgeMatch[1];

    if (badgeMap.has(badgeNumber)) {
        duplicates.push({
            badge: badgeNumber,
            name: fullName,
            originalIndex: badgeMap.get(badgeNumber).index,
            duplicateIndex: i
        });
    } else {
        badgeMap.set(badgeNumber, { name: fullName, index: i });
    }
});

if (duplicates.length > 0) {
    console.log("Found duplicate badge numbers:");
    duplicates.forEach(d => {
        console.log(`- Жетон ${d.badge}: ${d.name} (Повідомлення №${d.originalIndex + 1} та №${d.duplicateIndex + 1})`);
    });
} else {
    console.log("No duplicates found.");
}
