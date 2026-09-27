const fs = require('fs');

const ts = fs.readFileSync('server.test.ts', 'utf8');

const tests = [];
let currentIndex = 0;
while (true) {
  const nextIt = ts.indexOf("it('TEST-F2R2-TTS", currentIndex);
  if (nextIt === -1) break;
  const nameEnd = ts.indexOf("'", nextIt + 4);
  const name = ts.substring(nextIt + 4, nameEnd);
  
  let braceCount = 0;
  let inBrace = false;
  let endIdx = -1;
  for (let i = nameEnd; i < ts.length; i++) {
     if (ts[i] === '{') { braceCount++; inBrace = true; }
     if (ts[i] === '}') { braceCount--; }
     if (inBrace && braceCount === 0) {
        endIdx = ts.indexOf(')', i);
        if (endIdx !== -1) endIdx++; // include )
        if (ts[endIdx] === ';') endIdx++;
        break;
     }
  }
  const testCode = ts.substring(nextIt, endIdx);
  tests.push(testCode.trim());
  currentIndex = endIdx;
}
fs.writeFileSync('tts_tests.txt', tests.join('\n\n'));
