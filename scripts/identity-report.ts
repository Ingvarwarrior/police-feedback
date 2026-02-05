
import { JSDOM } from 'jsdom';
import fs from 'fs';

const HTML_FILE = '/run/user/1000/doc/e05f278e/Особовий склад/messages.html';
const html = fs.readFileSync(HTML_FILE, 'utf-8');
const dom = new JSDOM(html);
const messages = dom.window.document.querySelectorAll('.message.default');

const officersByName = new Map();
const badgeCollisions = new Map(); // Badge -> Array of unique names using it

function parseMessage(msg) {
    const textElem = msg.querySelector('.text');
    if (!textElem) return null;
    const text = textElem.innerHTML;
    const lines = text.split('<br>').map(l => l.replace(/^- /, '').trim());

    // Name + DOB (flexible regex for missing spaces before р.н.)
    const nameMatch = lines[0].match(/^([^0-9]+)\s+(\d{2}\.\d{2}\.\d{4})\s*р\.н\./);
    if (!nameMatch) return null;

    const fullName = nameMatch[1].trim();
    const badgeLine = lines.find(l => l.includes('Номер жетону'));
    if (!badgeLine) return null;
    const badgeMatch = badgeLine.match(/(\d+)/);
    if (!badgeMatch) return null;

    return {
        fullName,
        badge: badgeMatch[1],
        rank: lines[2] || '?',
        dept: lines[1] || '?',
        phone: (lines.find(l => l.includes('Тел.')) || '').replace('Тел.', '').trim()
    };
}

messages.forEach((msg, i) => {
    const data = parseMessage(msg);
    if (!data) return;

    // 1. Group messages by Officer Name to find redundant profile messages
    if (!officersByName.has(data.fullName)) {
        officersByName.set(data.fullName, {
            data,
            indices: [i + 1]
        });
    } else {
        officersByName.get(data.fullName).indices.push(i + 1);
    }
});

// 2. Identify unique officers and check for badge collisions
officersByName.forEach((entry, name) => {
    const badge = entry.data.badge;
    if (!badgeCollisions.has(badge)) {
        badgeCollisions.set(badge, []);
    }
    badgeCollisions.get(badge).push(name);
});

console.log(`### ЗВІТ ПРО КОЛІЗІЇ ДАНИХ (Telegram Export) ###\n`);
console.log(`Всього повідомлень у файлі: ${messages.length}`);
console.log(`Всього унікальних офіцерів (за ПІБ): ${officersByName.size}\n`);

console.log(`--- 1. КОЛІЗІЇ ЖЕТОНІВ (Різні люди на один номер) ---`);
let collisionFound = false;
badgeCollisions.forEach((names, badge) => {
    if (names.length > 1) {
        collisionFound = true;
        console.log(`⚠️ Жетон [${badge}] використовується ${names.length} різними людьми:`);
        names.forEach(name => {
            const entry = officersByName.get(name);
            console.log(`   - ${name} (Повід. №${entry.indices.join(', ')})`);
        });
        console.log('');
    }
});
if (!collisionFound) console.log("Колізій не знайдено. ✅\n");

console.log(`--- 2. ПОВТОРЮВАНІ ПОВІДОМЛЕННЯ (Однакові люди) ---`);
let duplicatesFound = false;
officersByName.forEach((entry, name) => {
    if (entry.indices.length > 1) {
        duplicatesFound = true;
        console.log(`👤 ${name} (Жетон: ${entry.data.badge}) зустрічається ${entry.indices.length} рази (Повід. №${entry.indices.join(', ')})`);
    }
});
if (!duplicatesFound) console.log("Дублікатів не знайдено. ✅");

console.log("\n-------------------------------------------------");
