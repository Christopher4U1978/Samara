const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

testTs = testTs.replace(
  `     const chunk2 = Buffer.alloc(101).toString('base64');
     ws.send(JSON.stringify({ audio: chunk2 }));`,
  `     const chunk2 = Buffer.alloc(101).toString('base64');
     const str = JSON.stringify({ audio: chunk2 });
     console.log("TEST 50 CHUNK 2 STRING LENGTH:", str.length);
     ws.send(str);`
);

fs.writeFileSync('server.test.ts', testTs);
