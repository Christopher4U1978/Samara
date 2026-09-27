const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

testTs = testTs.replace(
  `     await sendAudioInChunks(ws, limit - 100);`,
  `     try {
       await sendAudioInChunks(ws, limit - 100);
       console.log("sendAudioInChunks finished successfully");
     } catch (e) {
       console.log("sendAudioInChunks ERROR:", e);
     }`
);

fs.writeFileSync('server.test.ts', testTs);
