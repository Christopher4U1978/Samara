const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

testTs = testTs.replace(
  `        const payload = Buffer.alloc(toSend).toString('base64');
        ws.send(JSON.stringify({ audio: payload }));`,
  `        const payload = Buffer.alloc(toSend).toString('base64');
        const str = JSON.stringify({ audio: payload });
        // console.log("CHUNK STRING LENGTH:", str.length, "toSend:", toSend);
        ws.send(str);`
);

fs.writeFileSync('server.test.ts', testTs);
