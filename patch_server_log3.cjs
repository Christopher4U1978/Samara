const fs = require('fs');
let serverTs = fs.readFileSync('server.ts', 'utf8');

serverTs = serverTs.replace(
  `        const size = Buffer.byteLength(data as Buffer);`,
  `        const size = Buffer.byteLength(data as Buffer);
        if (size > 260000) console.log("HUGE SIZE RECEIVED:", size);`
);

fs.writeFileSync('server.ts', serverTs);
