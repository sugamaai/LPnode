const fs = require("fs");
const path = require("path");

// ===== 設定 =====
const CSV_PATH = "./data.csv";
const OUTPUT_DIR = "./dist";
const OUTPUT_HTML = path.join(OUTPUT_DIR, "index.html");

// ===== CSV parse（カンマ/ダブルクォート対応の簡易版）=====
function parseCSV(text) {
    const lines = text
        .replace(/^\uFEFF/, "") // BOM除去
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

    const header = lines[0].split(",").map((h) => h.trim());

    return lines.slice(1).map((line) => {
        const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
        const obj = {};
        header.forEach((h, i) => {
            obj[h] = (cols[i] || "").trim().replace(/^"|"$/g, "");
        });
        return obj;
    });
}

// ===== メイン =====
const csvText = fs.readFileSync(CSV_PATH, "utf-8");
const rows = parseCSV(csvText);

/**
 * 期待カラム（data.csvの実例に合わせる）
 * - 地方:  地区名
 * - 都道府県: 都道府県
 * - 市町村: 市区町村名
 * - 屋号: 屋号名
 * - 店舗: 店舗名
 * - URL: 店舗URL
 */
const COL = {
    area: "地区名",
    pref: "都道府県",
    city: "市区町村名",
    brand: "屋号名",
    store: "店舗名",
    url: "店舗URL",
};

// 地方 → 都道府県 → 市町村 → 屋号 → 店舗[] に整形
const structured = {};

for (const r of rows) {
    const area = r[COL.area] || "（不明）";
    const pref = r[COL.pref] || "（不明）";
    const city = r[COL.city] || "（不明）";
    const brand = r[COL.brand] || "（不明）";

    if (!structured[area]) structured[area] = {};
    if (!structured[area][pref]) structured[area][pref] = {};
    if (!structured[area][pref][city]) structured[area][pref][city] = {};
    if (!structured[area][pref][city][brand]) structured[area][pref][city][brand] = [];

    structured[area][pref][city][brand].push({
        store: r[COL.store] || "",
        url: r[COL.url] || "",
    });
}

// ===== HTML生成 =====
const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>店舗検索</title>
<style>
/* =========================
   スマホファーストCSS
========================= */
* { box-sizing: border-box; }

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  margin: 0;
  padding: 16px;
  background: #fafafa;
  color: #222;
}

h1 {
  font-size: 1.2rem;
  margin: 0 0 16px 0;
}

/* セレクト */
.controls {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

label {
  display: block;
  font-size: 0.9rem;
}

select {
  width: 100%;
  padding: 14px 12px;
  margin-top: 6px;
  font-size: 16px; /* iOSズーム防止 */
  border-radius: 10px;
  border: 1px solid #ccc;
  background: #fff;
}

select:disabled {
  opacity: 0.55;
  background: #f2f2f2;
}

/* 結果 */
#result { margin-top: 20px; }

.brand {
  margin-bottom: 16px;
  padding: 12px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.brand h3 {
  font-size: 1rem;
  margin: 0 0 8px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.badge {
  font-size: 0.8rem;
  color: #666;
  background: #f2f4f7;
  padding: 2px 8px;
  border-radius: 999px;
}

.brand ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.brand li { margin: 6px 0; }

.brand a {
  display: block;
  padding: 10px 10px;
  border-radius: 10px;
  color: #0066cc;
  text-decoration: none;
  background: #f7fbff;
}

.brand a:active { background: #e9f3ff; }

.brand .nolink {
  display: block;
  padding: 10px 10px;
  border-radius: 10px;
  background: #f6f6f6;
}

/* PC */
@media (min-width: 768px) {
  body {
    max-width: 960px;
    margin: 0 auto;
    padding: 24px;
  }
  .controls {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  #result { margin-top: 28px; }
  .brand { padding: 16px; }
}
</style>
</head>
<body>

<h1>店舗検索</h1>

<div class="controls">
  <label>
    地方：
    <select id="areaSelect"></select>
  </label>

  <label>
    都道府県：
    <select id="prefSelect" disabled></select>
  </label>

  <label>
    市区町村：
    <select id="citySelect" disabled></select>
  </label>
</div>

<div id="result"></div>

<script>
const DATA = ${JSON.stringify(structured, null, 0)};

const areaSelect = document.getElementById("areaSelect");
const prefSelect = document.getElementById("prefSelect");
const citySelect = document.getElementById("citySelect");
const result = document.getElementById("result");

const opt = (v, label) => \`<option value="\${v}">\${label ?? v}</option>\`;
const placeholder = (text) => opt("", text);

function clearResult() { result.innerHTML = ""; }

function setDisabled(el, disabled) {
  el.disabled = disabled;
  if (disabled) el.value = "";
}

function fillSelect(el, items, placeholderText) {
  el.innerHTML =
    placeholder(placeholderText) +
    items.sort((a,b) => a.localeCompare(b, "ja")).map(v => opt(v)).join("");
}

function init() {
  const areas = Object.keys(DATA);
  fillSelect(areaSelect, areas, "選択してください");
  prefSelect.innerHTML = placeholder("地方を選択してください");
  citySelect.innerHTML = placeholder("都道府県を選択してください");
}

areaSelect.addEventListener("change", () => {
  const area = areaSelect.value;
  clearResult();

  // リセット
  setDisabled(prefSelect, true);
  setDisabled(citySelect, true);
  prefSelect.innerHTML = placeholder("選択してください");
  citySelect.innerHTML = placeholder("都道府県を選択してください");

  if (!area) return;

  const prefs = Object.keys(DATA[area] || {});
  fillSelect(prefSelect, prefs, "選択してください");
  setDisabled(prefSelect, false);
});

prefSelect.addEventListener("change", () => {
  const area = areaSelect.value;
  const pref = prefSelect.value;
  clearResult();

  // リセット
  setDisabled(citySelect, true);
  citySelect.innerHTML = placeholder("選択してください");

  if (!area || !pref) return;

  const cities = Object.keys((DATA[area] || {})[pref] || {});
  fillSelect(citySelect, cities, "選択してください");
  setDisabled(citySelect, false);
});

citySelect.addEventListener("change", () => {
  const area = areaSelect.value;
  const pref = prefSelect.value;
  const city = citySelect.value;
  clearResult();

  if (!area || !pref || !city) return;

  const brands = (((DATA[area] || {})[pref] || {})[city]) || {};
  const brandNames = Object.keys(brands).sort((a,b) => a.localeCompare(b, "ja"));

  brandNames.forEach(brand => {
    const stores = brands[brand] || [];
    const section = document.createElement("div");
    section.className = "brand";

    const listHtml = stores.map(s => {
      const name = (s.store || "").replaceAll("<","&lt;").replaceAll(">","&gt;");
      const url = (s.url || "").trim();
      if (url) {
        const safeUrl = url.replaceAll('"','%22');
        return \`<li><a href="\${safeUrl}" target="_blank" rel="noopener noreferrer">\${name}</a></li>\`;
      }
      return \`<li><span class="nolink">\${name}</span></li>\`;
    }).join("");

    section.innerHTML = \`
      <h3>\${brand}<span class="badge">\${stores.length}件</span></h3>
      <ul>\${listHtml}</ul>
    \`;
    result.appendChild(section);
  });
});

init();
</script>
</body>
</html>`;

// ===== 書き出し =====
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_HTML, html, "utf-8");

console.log("✅ dist/index.html を生成しました（地方→都道府県→市区町村 対応）");
``