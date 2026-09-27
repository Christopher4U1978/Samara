const fs = require('fs');

const ts = fs.readFileSync('server.test.ts', 'utf8');

const result = [];
result.push("=== 1. All imports ===");
const importsEnd = ts.indexOf('let sessionMock: any;');
result.push(ts.substring(0, importsEnd).trim());

result.push("\n=== 2. Every vi.mock(...) block ===");
let mockStart = ts.indexOf('vi.mock(');
let mockEnd = ts.indexOf("describe('SAMARA Security Hardening");
result.push(ts.substring(mockStart, mockEnd).trim());

result.push("\n=== 3. The complete Firebase Admin mock ===");
let adminMockStart = ts.indexOf("vi.mock('firebase-admin'");
let adminMockEnd = ts.indexOf("});", adminMockStart) + 3;
// since it contains inner functions, let's just find the end properly.
let braceCount = 0;
let inBrace = false;
let realEnd = -1;
for (let i = adminMockStart; i < ts.length; i++) {
  if (ts[i] === '{') { braceCount++; inBrace = true; }
  if (ts[i] === '}') { braceCount--; }
  if (inBrace && braceCount === 0) {
    realEnd = ts.indexOf(')', i) + 1;
    if (ts[realEnd] === ';') realEnd++;
    break;
  }
}
result.push(ts.substring(adminMockStart, realEnd).trim());

result.push("\n=== 4. The complete verifyIdToken mock implementation ===");
let verifyStart = ts.indexOf('verifyIdToken: vi.fn().mockImplementation(async (token, checkRevoked) => {');
let vBraceCount = 0;
let vInBrace = false;
let vEnd = -1;
for (let i = verifyStart; i < ts.length; i++) {
  if (ts[i] === '{') { vBraceCount++; vInBrace = true; }
  if (ts[i] === '}') { vBraceCount--; }
  if (vInBrace && vBraceCount === 0) {
    vEnd = ts.indexOf(')', i) + 1;
    break;
  }
}
result.push(ts.substring(verifyStart, vEnd).trim());

result.push("\n=== 5. The complete GoogleGenAI mock ===");
let genAiMockStart = ts.indexOf("vi.mock('@google/genai'");
let gBraceCount = 0;
let gInBrace = false;
let gEnd = -1;
for (let i = genAiMockStart; i < ts.length; i++) {
  if (ts[i] === '{') { gBraceCount++; gInBrace = true; }
  if (ts[i] === '}') { gBraceCount--; }
  if (gInBrace && gBraceCount === 0) {
    gEnd = ts.indexOf(')', i) + 1;
    if (ts[gEnd] === ';') gEnd++;
    break;
  }
}
result.push(ts.substring(genAiMockStart, gEnd).trim());

result.push("\n=== 8. Outer describe(...) ===");
let descStart = ts.indexOf("describe('SAMARA");
result.push(ts.substring(descStart, ts.indexOf('{', descStart) + 1).trim());

result.push("\n=== 9. Every beforeAll(...) hook ===");
let beforeAllStart = ts.indexOf("beforeAll(async () => {");
let bAllBraceCount = 0;
let bAllInBrace = false;
let bAllEnd = -1;
for (let i = beforeAllStart; i < ts.length; i++) {
  if (ts[i] === '{') { bAllBraceCount++; bAllInBrace = true; }
  if (ts[i] === '}') { bAllBraceCount--; }
  if (bAllInBrace && bAllBraceCount === 0) {
    bAllEnd = ts.indexOf(')', i) + 1;
    if (ts[bAllEnd] === ';') bAllEnd++;
    break;
  }
}
result.push(ts.substring(beforeAllStart, bAllEnd).trim());

result.push("\n=== 10. Every beforeEach(...) hook ===");
let bEachStart = ts.indexOf("beforeEach(() => {");
let bEachBraceCount = 0;
let bEachInBrace = false;
let bEachEnd = -1;
for (let i = bEachStart; i < ts.length; i++) {
  if (ts[i] === '{') { bEachBraceCount++; bEachInBrace = true; }
  if (ts[i] === '}') { bEachBraceCount--; }
  if (bEachInBrace && bEachBraceCount === 0) {
    bEachEnd = ts.indexOf(')', i) + 1;
    if (ts[bEachEnd] === ';') bEachEnd++;
    break;
  }
}
result.push(ts.substring(bEachStart, bEachEnd).trim());

result.push("\n=== 11. Every afterEach(...) hook ===");
let aEachStart = ts.indexOf("afterEach(async () => {");
let aEachBraceCount = 0;
let aEachInBrace = false;
let aEachEnd = -1;
for (let i = aEachStart; i < ts.length; i++) {
  if (ts[i] === '{') { aEachBraceCount++; aEachInBrace = true; }
  if (ts[i] === '}') { aEachBraceCount--; }
  if (aEachInBrace && aEachBraceCount === 0) {
    aEachEnd = ts.indexOf(')', i) + 1;
    if (ts[aEachEnd] === ';') aEachEnd++;
    break;
  }
}
result.push(ts.substring(aEachStart, aEachEnd).trim());

result.push("\n=== 12. Every afterAll(...) hook ===");
let aAllStart = ts.indexOf("afterAll(async () => {");
let aAllBraceCount = 0;
let aAllInBrace = false;
let aAllEnd = -1;
for (let i = aAllStart; i < ts.length; i++) {
  if (ts[i] === '{') { aAllBraceCount++; aAllInBrace = true; }
  if (ts[i] === '}') { aAllBraceCount--; }
  if (aAllInBrace && aAllBraceCount === 0) {
    aAllEnd = ts.indexOf(')', i) + 1;
    if (ts[aAllEnd] === ';') aAllEnd++;
    break;
  }
}
result.push(ts.substring(aAllStart, aAllEnd).trim());

result.push("\n=== 16. Location of TTS tests ===");
let ttsLocStart = ts.indexOf("  // --- /api/tts TESTS ---");
if (ttsLocStart === -1) {
    result.push("NOT FOUND IN FILE");
} else {
    let ttsLocEnd = ts.indexOf("  // --- WebSocket /live TESTS ---");
    result.push(ts.substring(ttsLocStart, ttsLocEnd).trim());
}

fs.writeFileSync('output1.txt', result.join('\n'));
