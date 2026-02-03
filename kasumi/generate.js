// build-itemList.js
// CSV(B:都道府県 / C:店舗名 / D:URL) → itemList.html を生成

const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(__dirname, "shops.csv");
const OUT_PATH = path.join(__dirname, "itemList.html");

// 都道府県の表示順（必要な分だけでOK）
const PREF_ORDER = [
    "東京都", "千葉県", "神奈川県", "埼玉県"
];

// CSV 1行パース（ダブルクォート対応）
function parseCsvLine(line) {
    const cols = [];
    let cur = "";
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
        } else if (ch === "," && !inQuotes) {
            cols.push(cur.trim());
            cur = "";
        } else {
            cur += ch;
        }
    }
    cols.push(cur.trim());
    return cols;
}

// HTMLエスケープ
const esc = (s) =>
    String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

// 表示用都道府県名（県・都を省略）
function prefLabel(pref) {
    return pref
        .replace("東京都", "東京")
        .replace("神奈川県", "神奈川")
        .replace("千葉県", "千葉")
        .replace("埼玉県", "埼玉")
        .replace(/県$/, "");
}

function main() {
    const csv = fs.readFileSync(CSV_PATH, "utf8");
    const lines = csv.split(/\r?\n/).filter(Boolean);

    const map = new Map(); // pref -> [{name, url}]

    for (const line of lines) {
        const cols = parseCsvLine(line);

        const pref = cols[1];
        const name = cols[2];
        const url = cols[3];

        if (!pref || pref.includes("都道府県") || !name || !url) continue;

        if (!map.has(pref)) map.set(pref, []);
        map.get(pref).push({ name, url });
    }

    const prefs = [
        ...PREF_ORDER.filter((p) => map.has(p)),
        ...[...map.keys()].filter((p) => !PREF_ORDER.includes(p)),
    ];

    const html = `
<div class="campaign__list__wrap">
${prefs
            .map(
                (pref) => `
    <details class="accordion">
      <summary>${esc(prefLabel(pref))}</summary>
      <div>
        <ul class="fs_small">
${map
                        .get(pref)
                        .map(
                            (s) =>
                                `          <li><a href="${esc(s.url)}" target="_blank">${esc(
                                    s.name
                                )}</a></li>`
                        )
                        .join("\n")}
        </ul>
      </div>
    </details>`
            )
            .join("\n")}
</div>
`.trim();

    fs.writeFileSync(OUT_PATH, html, "utf8");
    console.log("✅ itemList.html written");
}

main();
