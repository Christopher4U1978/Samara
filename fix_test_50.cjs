const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

testTs = testTs.replace(
  /const chunk1 = Buffer\.alloc\(limit - 100\)\.toString\('base64'\);\s*ws\.send\(JSON\.stringify\(\{ audio: chunk1 \}\)\);/,
  "await sendAudioInChunks(ws, limit - 100);"
);

fs.writeFileSync('server.test.ts', testTs);
