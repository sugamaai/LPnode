// build-itemList.js
// CSV(B:都道府県 / C:店舗名 / D:URL / E:画像名 / F:屋号 / G:画像表示終了日)
// → itemList.html を生成

const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(__dirname, "shops.csv");
const OUT_PATH = path.join(__dirname, "itemList.html");

const PREF_ORDER = ["東京都", "千葉県", "神奈川県", "埼玉県"];

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

const esc = (s) =>
    String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const norm = (s) =>
    String(s ?? "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

function prefLabel(pref) {
    return pref
        .replace("東京都", "東京")
        .replace("神奈川県", "神奈川")
        .replace("千葉県", "千葉")
        .replace("埼玉県", "埼玉")
        .replace(/県$/, "");
}

function getBrands(items) {
    return [...new Set(items.map((item) => item.brand).filter(Boolean))];
}

// G列の日付以降は画像を非表示
// G列が空欄なら画像表示
function shouldShowImage(imageEndDate) {
    if (!imageEndDate) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(imageEndDate);
    endDate.setHours(0, 0, 0, 0);

    if (Number.isNaN(endDate.getTime())) {
        return true;
    }

    return today < endDate;
}

function main() {
    const csv = fs.readFileSync(CSV_PATH, "utf8");
    const lines = csv.split(/\r?\n/).filter(Boolean);

    const map = new Map();

    for (const line of lines) {
        const cols = parseCsvLine(line);

        const pref = cols[1];          // B列：都道府県
        const name = cols[2];          // C列：店舗名
        const url = cols[3];           // D列：URL
        const image = cols[4];         // E列：画像名
        const brand = cols[5];         // F列：屋号
        const imageEndDate = cols[6];  // G列：画像表示終了日

        if (!pref || pref.includes("都道府県") || !name || !url) continue;

        if (!map.has(pref)) map.set(pref, []);
        map.get(pref).push({
            name,
            url,
            image,
            brand,
            imageEndDate,
        });
    }

    const prefs = [
        ...PREF_ORDER.filter((p) => map.has(p)),
        ...[...map.keys()].filter((p) => !PREF_ORDER.includes(p)),
    ];

    const html = `
<div class="campaign__list__wrap">
${prefs
            .map((pref, prefIndex) => {
                const items = map.get(pref);
                const showSearch = items.length >= 10;
                const brands = getBrands(items);
                const showBrandFilter = brands.length >= 2;
                const radioName = `brand-${prefIndex}`;

                return `
  <details class="accordion">
    <summary>${esc(prefLabel(pref))}</summary>
    <div>
      ${showSearch
                        ? `<div class="accordion-search-wrap">
          <input class="accordion-search" type="search" placeholder="店舗名で検索" aria-label="店舗名で検索">
        </div>`
                        : ""
                    }

      ${showBrandFilter
                        ? `<div class="brand-filter">
          <p class="brand-filter-title">屋号で絞り込み</p>
          <div class="brand-filter-list">
            <label>
              <input type="radio" class="brand-radio" name="${esc(radioName)}" value="" checked>
              <span>すべて</span>
            </label>
${brands
                            .map(
                                (brand) =>
                                    `            <label>
              <input type="radio" class="brand-radio" name="${esc(radioName)}" value="${esc(norm(brand))}">
              <span>${esc(brand)}</span>
            </label>`
                            )
                            .join("\n")}
          </div>
        </div>`
                        : ""
                    }

      <ul class="fs_small">
${items
                        .map(
                            (s) =>
                                `        <li data-name="${esc(norm(s.name))}" data-brand="${esc(norm(s.brand))}">
                            <a href="${esc(s.url)}"
                                target="_blank" rel="noopener noreferrer">
                    <div class="store-wrap">
                        <div>
                            <p>${esc(s.name)}</p>${s.image && shouldShowImage(s.imageEndDate)
                                    ? `<img src="./img/${esc(s.image)}" alt="${esc(s.name)}">`
                                    : ""
                                }
                        </div>
                            <button>登録する</button>
                    </div>
                    </a>
                </li>`
                        )
                        .join("\n")}
      </ul>
      <p class="accordion-search-empty" hidden>一致する店舗がありません</p>
    </div>
  </details>`;
            })
            .join("\n")}
</div>

<div class="random-store-box">
    <button type="button" id="randomStoreBtn">
        どこのお店が登録されるかお楽しみ？！
    </button>
</div>
`.trim();

    fs.writeFileSync(OUT_PATH, html, "utf8");
    console.log("✅ itemList.html written");
}

main();