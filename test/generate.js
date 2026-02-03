const fs = require('fs');
const path = require('path');
const readline = require('readline');

const inputFilePath = path.join(__dirname, 'shops.csv');
const outputFilePath = path.join(__dirname, 'itemList.html');

const PREF_ORDER = [
    "北海道",
    "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
    "岐阜県", "静岡県", "愛知県", "三重県",
    "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
    "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県",
    "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県",
    "沖縄県"
];

// --- D列URLから店番抽出 ---
function extractShopNumberFromUrl(url) {
    const s = String(url || '').replaceAll('&amp;', '&'); // 念のため
    const m = s.match(/[?&]store_code=MS(\d{8})\b/i);
    if (!m) return '';

    const digits8 = m[1];            // 例: "00359890"
    const last6 = digits8.slice(-6); // "359890"
    return last6.slice(0, 5);        // "35989"（下6桁〜下2桁）
}

// --- CSV parser (簡易) ---
function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (ch === ',' && !inQuotes) {
            result.push(cur);
            cur = '';
            continue;
        }

        cur += ch;
    }
    result.push(cur);
    return result;
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function escapeAttr(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;');
}

const prefectures = new Set();
const rows = [];
let isFirstLine = true;

const rl = readline.createInterface({
    input: fs.createReadStream(inputFilePath),
    crlfDelay: Infinity
});

rl.on('line', (line) => {
    if (isFirstLine) {
        isFirstLine = false;
        return;
    }
    if (!line.trim()) return;

    const columns = parseCSVLine(line);

    const pref = (columns[1] || '').trim();     // B列：都道府県
    const shopName = (columns[2] || '').trim(); // C列：店舗名
    const shopURL = (columns[3] || '').trim();  // D列：URL

    // A列は使わず、D列URLから店番を作る
    const shopCode = extractShopNumberFromUrl(shopURL);

    // 店番も必須にしたいなら:  if (!pref || !shopName || !shopURL || !shopCode) return;
    if (!pref || !shopName || !shopURL) return;

    prefectures.add(pref);
    rows.push({ pref, shopCode, shopName, shopURL });
});

rl.on('close', () => {
    const knownPrefs = PREF_ORDER.filter(p => prefectures.has(p));
    const unknownPrefs = Array.from(prefectures).filter(p => !PREF_ORDER.includes(p));
    const prefList = [...knownPrefs, ...unknownPrefs];

    const prefIndex = new Map(prefList.map((p, i) => [p, i]));
    rows.sort((a, b) => {
        const ai = prefIndex.get(a.pref) ?? 9999;
        const bi = prefIndex.get(b.pref) ?? 9999;
        if (ai !== bi) return ai - bi;
        return a.shopName.localeCompare(b.shopName, 'ja');
    });

    const listItems = rows.map(r => {
        const codePrefix = r.shopCode ? `${escapeHtml(r.shopCode)} ` : '';
        return `  <li data-pref="${escapeAttr(r.pref)}"><a href="${escapeAttr(r.shopURL)}" target="_blank" rel="noopener noreferrer">${codePrefix}${escapeHtml(r.shopName)}</a></li>`;
    });

    const htmlContent = `
<script id="prefData" type="application/json">${JSON.stringify(prefList)}</script>

<ul id="itemList">
${listItems.join('\n')}
</ul>
`.trim() + '\n';

    fs.writeFileSync(outputFilePath, htmlContent, 'utf-8');
    console.log('✔ itemList.html を出力しました！（URLから店番を抽出して店舗名の前に表示）');
});
