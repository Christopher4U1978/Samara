const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

testTs = testTs.replace(
  `     const limit = 4 * 1024 * 1024;
     const payloadA = Buffer.alloc(limit - 100).toString('base64');
     wsA.send(JSON.stringify({ audio: payloadA }));`,
  `     const limit = 4 * 1024 * 1024;
     await sendAudioInChunks(wsA, limit - 100);`
);

testTs = testTs.replace(
  `     // B sends limit - 100 as well, if they were shared B would crash!
     const payloadB = Buffer.alloc(limit - 100).toString('base64');
     wsB.send(JSON.stringify({ audio: payloadB }));`,
  `     // B sends limit - 100 as well, if they were shared B would crash!
     await sendAudioInChunks(wsB, limit - 100);`
);

fs.writeFileSync('server.test.ts', testTs);
