const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

let lastBracket = testTs.lastIndexOf('});');
testTs = testTs.substring(0, lastBracket);
lastBracket = testTs.lastIndexOf('});');
testTs = testTs.substring(0, lastBracket + 3) + '\n';

fs.writeFileSync('server.test.ts', testTs);
