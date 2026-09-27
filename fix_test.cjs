const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

const testsStart = testTs.indexOf("  it('TEST-F2R3-WS-047");
const testsEnd = testTs.indexOf("describe('SAMARA");

const testsStr = testTs.substring(testsStart, testsEnd);

testTs = testTs.substring(0, testsStart) + '});\n\n' + testTs.substring(testsEnd);

const lastBracket = testTs.lastIndexOf('});');
testTs = testTs.substring(0, lastBracket) + '\n' + testsStr + '\n' + testTs.substring(lastBracket);

fs.writeFileSync('server.test.ts', testTs);
