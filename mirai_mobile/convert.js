const fs = require('fs');
const data = JSON.parse(fs.readFileSync('../FE/src/data/kanaStrokes.json', 'utf8'));
let dartCode = 'const Map<String, List<String>> kanaStrokePaths = {\n';
for (const [k, v] of Object.entries(data)) {
    dartCode += `  '${k}': [\n`;
    for (const p of v) {
        dartCode += `    '${p}',\n`;
    }
    dartCode += `  ],\n`;
}
dartCode += '};\n';
fs.writeFileSync('lib/data/kana_strokes_data.dart', dartCode);
