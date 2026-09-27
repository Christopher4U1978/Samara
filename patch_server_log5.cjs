const fs = require('fs');
let serverTs = fs.readFileSync('server.ts', 'utf8');

serverTs = serverTs.replace(
  `        if (isAuthenticated && size > 262144) {`,
  `        if (isAuthenticated && size > 262144) {
           console.log("TRIGGERED 1009 AUTHENTICATED: size =", size);`
);

serverTs = serverTs.replace(
  `        if (!isAuthenticated && size > 16384) {`,
  `        if (!isAuthenticated && size > 16384) {
           console.log("TRIGGERED 1009 UNAUTHENTICATED: size =", size);`
);

fs.writeFileSync('server.ts', serverTs);
