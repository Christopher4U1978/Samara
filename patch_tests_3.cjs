const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

const mockOld = `          if (token === 'valid_token') {
             return { uid: 'test_user_123' };
          }
          if (token === 'unauthorized_token') {
             return { uid: 'stranger_uid' };
          }
          if (token === 'delayed_token') {
             await new Promise(r => setTimeout(r, 100));
             return { uid: 'test_user_123' };
          }`;

const mockNew = `          if (token === 'valid_token') {
             return { uid: 'test_user_123' };
          }
          if (token === 'valid_token_2') {
             return { uid: 'test_user_456' };
          }
          if (token === 'unauthorized_token') {
             return { uid: 'stranger_uid' };
          }
          if (token === 'delayed_token') {
             // removed fixed delay
             return { uid: 'test_user_123' };
          }`;

testTs = testTs.replace(mockOld, mockNew);

const test52 = `     // User B
     const wsB = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     let readyB = false;
     wsB.on('open', () => wsB.send(JSON.stringify({ setup: { token: 'valid_token_2' } }))); // Wait, valid_token_2 resolves to same UID in mock?
     // Let's modify the mock to resolve differently if token is different.
     // Wait, verifyIdToken mock just returns { uid: 'test_user_123' } for valid_token.
     // Is there a token for a different UID? 
     // We can just use the same UID but wait! "between two sessions". If they are the same UID, they share the quota?
     // "pcmAudioQuotaByUid[uid]" - yes they share quota if they are the same UID!
     // So we need a different UID. I'll patch the mock to return uid: token for valid_*.
  });`;

const test52new = `     // User B
     const wsB = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     let readyB = false;
     wsB.on('open', () => wsB.send(JSON.stringify({ setup: { token: 'valid_token_2' } })));
     wsB.on('message', (data) => { if (JSON.parse(data.toString()).ready) readyB = true; });
     await vi.waitFor(() => expect(readyB).toBe(true));

     const limit = 4 * 1024 * 1024;
     const payloadA = Buffer.alloc(limit - 100).toString('base64');
     wsA.send(JSON.stringify({ audio: payloadA }));
     await new Promise(r => setTimeout(r, 20)); // tiny delay for packet pacing, not lifecycle sync

     // B sends limit - 100 as well, if they were shared B would crash!
     const payloadB = Buffer.alloc(limit - 100).toString('base64');
     wsB.send(JSON.stringify({ audio: payloadB }));
     await new Promise(r => setTimeout(r, 20)); 

     expect(wsA.readyState).toBe(1);
     expect(wsB.readyState).toBe(1);

     const closePA = awaitWsClose(wsA);
     const closePB = awaitWsClose(wsB);
     wsA.close();
     wsB.close();
     await Promise.all([closePA, closePB]);
  });`;

testTs = testTs.replace(test52, test52new);

fs.writeFileSync('server.test.ts', testTs);
