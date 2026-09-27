const fs = require('fs');
let serverTs = fs.readFileSync('server.ts', 'utf8');

serverTs = serverTs.replace(
`        if (isAuthenticated && size > 262144) {
           return finalize(1009, 'Message Too Big');
        }`,
`        if (isAuthenticated && size > 262144) {
           console.log("TRIGGERED 1009: size = ", size);
           return finalize(1009, 'Message Too Big');
        }`
);
fs.writeFileSync('server.ts', serverTs);
