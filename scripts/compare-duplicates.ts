
import { JSDOM } from 'jsdom';
import fs from 'fs';

const HTML_FILE = '/run/user/1000/doc/e05f278e/Особовий склад/messages.html';
const html = fs.readFileSync(HTML_FILE, 'utf-8');
const dom = new JSDOM(html);
const messages = dom.window.document.querySelectorAll('.message.default');

const badgeMap = new Map();
const duplicates = [];

function parseMessage(msg) {
    const textElem = msg.querySelector('.text');
    if (!textElem) return null;
    const text = textElem.innerHTML;
    const lines = text.split('<br>').map(l => l.replace(/^- /, '').trim());
    const nameMatch = lines[0].match(/^([^0-9]+)\s+(\d{2}\.\d{2}\.\d{4})\s*р\.н\./);
    if (!nameMatch) return null;

    const badgeLine = lines.find(l => l.includes('Номер жетону'));
    if (!badgeLine) return null;
    const badgeMatch = badgeLine.match(/(\d+)/);
    if (!badgeMatch) return null;

    return {
        name: nameMatch[1].trim(),
        badge: badgeMatch[1],
        dept: lines[1] || '',
        rank: lines[2] || '',
        phone: (lines.find(l => l.includes('Тел.')) || '').replace('Тел.', '').trim()
    };
}

messages.forEach((msg, i) => {
    const data = parseMessage(msg);
    if (!data) return;

    if (badgeMap.has(data.badge)) {
        duplicates.push({
            badge: data.badge,
            original: badgeMap.get(data.badge),
            duplicate: { ...data, index: i }
        });
    } else {
        badgeMap.set(data.badge, { ...data, index: i });
    }
});

console.log("Detailed Duplicate Comparison:\n");
duplicates.forEach(d => {
    console.log(`Badge: ${d.badge}`);
    console.log(`  1st (Msg #${d.original.index + 1}): ${d.original.name} | ${d.original.rank} | ${d.original.phone}`);
    console.log(`  2nd (Msg #${d.duplicate.index + 1}): ${d.duplicate.name} | ${d.duplicate.rank} | ${d.duplicate.phone}`);

    const diffs = [];
    if (d.original.rank !== d.duplicate.rank) diffs.push("Rank changed");
    if (d.original.phone !== d.duplicate.phone) diffs.push("Phone changed");
    if (d.original.dept !== d.duplicate.dept) diffs.push("Department changed");

    if (diffs.length > 0) {
        console.log(`  ⚠️ DIffs: ${diffs.join(', ')}`);
    } else {
        console.log(`  ✅ Identical records.`);
    }
    console.log("-".repeat(40));
});
