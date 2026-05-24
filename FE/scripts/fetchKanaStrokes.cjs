const https = require('https');
const fs = require('fs');
const path = require('path');

const fetchSvg = (unicodeStr) => {
  return new Promise((resolve) => {
    https.get(`https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${unicodeStr}.svg`, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
};

const extractPaths = (svgContent) => {
  const paths = [];
  // match <path ... d="..." ... /> or similar
  const regex = /<path[^>]*d="([^"]+)"[^>]*>/g;
  let match;
  while ((match = regex.exec(svgContent)) !== null) {
    paths.push(match[1]);
  }
  return paths;
};

const main = async () => {
  const kanaMap = {};
  
  // Hiragana U+3041 to U+3096
  // Katakana U+30A1 to U+30FA
  const ranges = [
    [0x3041, 0x3096],
    [0x30A1, 0x30FA]
  ];

  const total = (ranges[0][1] - ranges[0][0] + 1) + (ranges[1][1] - ranges[1][0] + 1);
  let count = 0;

  for (const [start, end] of ranges) {
    for (let code = start; code <= end; code++) {
      const hex = code.toString(16).padStart(5, '0').toLowerCase();
      const char = String.fromCharCode(code);
      
      const svg = await fetchSvg(hex);
      if (svg) {
        const paths = extractPaths(svg);
        if (paths.length > 0) {
          kanaMap[char] = paths;
        }
      }
      count++;
      process.stdout.write(`\rFetched ${count}/${total} characters...`);
    }
  }

  console.log('\nFetching complete!');

  const outDir = path.join(__dirname, '../src/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'kanaStrokes.json');
  fs.writeFileSync(outFile, JSON.stringify(kanaMap, null, 2));
  console.log(`Saved to ${outFile}`);
};

main();
