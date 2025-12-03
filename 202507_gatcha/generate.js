const fs = require('fs');
const path = require('path');
const readline = require('readline');

const template = fs.readFileSync('template.html', 'utf-8');

// 出力先フォルダ
const outputDir = path.join(__dirname, 'dist');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// CSVファイルの読み込み
const rl = readline.createInterface({
  input: fs.createReadStream('data.csv'),
  crlfDelay: Infinity
});

let isFirstLine = true;

rl.on('line', (line) => {
  if (isFirstLine) {
    isFirstLine = false; // ヘッダー行スキップ
    return;
  }

  const columns = line.split(',');

  const filename = columns[5]?.trim(); // F列
  const url = columns[6]?.trim();      // G列

  if (!filename || !url) {
    console.warn('スキップされた行:', line);
    return;
  }

  const updatedHtml = template.replace('{{STORE_URL}}', url);
  fs.writeFileSync(path.join(outputDir, filename), updatedHtml, 'utf-8');
  console.log(`✅ 生成完了: dist/${filename}`);
});
