const fs = require('fs');
let serverTs = fs.readFileSync('server.ts', 'utf8');

serverTs = serverTs.replace(
  `const activeLiveSessionsByUid: Record<string, number> = {};`,
  `const activeLiveSessionsByUid: Record<string, Set<WebSocket>> = {};`
);

serverTs = serverTs.replace(
  `    activeLiveSessionsByUid: { ...activeLiveSessionsByUid }`,
  `    activeLiveSessionsByUid: Object.fromEntries(Object.entries(activeLiveSessionsByUid).map(([k, v]) => [k, v.size]))`
);

fs.writeFileSync('server.ts', serverTs);
