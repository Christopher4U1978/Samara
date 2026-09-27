const fs = require('fs');
let serverTs = fs.readFileSync('server.ts', 'utf8');

serverTs = serverTs.replace(
  `        const size = Buffer.byteLength(data as Buffer);
        if (size > 260000) console.log("HUGE SIZE RECEIVED:", size);`,
  `        const size = Buffer.byteLength(data as Buffer);`
);

serverTs = serverTs.replace(
  `        if (isAuthenticated && size > 262144) {
           console.log("TRIGGERED 1009 AUTHENTICATED: size =", size);
           return finalize(1009, 'Message Too Big');
        }`,
  `        if (isAuthenticated && size > 262144) {
           return finalize(1009, 'Message Too Big');
        }`
);

serverTs = serverTs.replace(
  `        if (!isAuthenticated && size > 16384) {
           console.log("TRIGGERED 1009 UNAUTHENTICATED: size =", size);
           return finalize(1009, 'Message Too Big');
        }`,
  `        if (!isAuthenticated && size > 16384) {
           return finalize(1009, 'Message Too Big');
        }`
);

fs.writeFileSync('server.ts', serverTs);
