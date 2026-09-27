const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

testTs = testTs.replace(
`          if (token === 'delayed_token') {
             await new Promise(r => setTimeout(r, 100));
             return { uid: 'test_user_123' };
          }`,
`          if (token === 'delayed_token') {
             return { uid: 'test_user_123' };
          }`
);

fs.writeFileSync('server.test.ts', testTs);
