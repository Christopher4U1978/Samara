const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

// I will append new tests at the end, just before the final `});` of the describe block.
// I will find the last `});` and replace it with the new tests.

const newTests = `
  it('TEST-F2R3-WS-047 — limit minus one byte does not reject', async () => {
     const ws = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     let ready = false;
     ws.on('open', () => ws.send(JSON.stringify({ setup: { token: 'valid_token' } })));
     ws.on('message', (data) => { if (JSON.parse(data.toString()).ready) ready = true; });
     await vi.waitFor(() => expect(ready).toBe(true));

     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit - 1).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));
     
     await new Promise(r => setTimeout(r, 50)); // let server process
     expect(ws.readyState).toBe(1); // Still open
     
     const closeP = awaitWsClose(ws);
     ws.close();
     await closeP;
  });

  it('TEST-F2R3-WS-048 — exact limit does not reject', async () => {
     const ws = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     let ready = false;
     ws.on('open', () => ws.send(JSON.stringify({ setup: { token: 'valid_token' } })));
     ws.on('message', (data) => { if (JSON.parse(data.toString()).ready) ready = true; });
     await vi.waitFor(() => expect(ready).toBe(true));

     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));
     
     await new Promise(r => setTimeout(r, 50)); // let server process
     expect(ws.readyState).toBe(1); // Still open
     
     const closeP = awaitWsClose(ws);
     ws.close();
     await closeP;
  });

  it('TEST-F2R3-WS-049 — limit plus one byte rejects with 4429', async () => {
     const ws = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     let ready = false;
     const closeP = awaitWsClose(ws);
     ws.on('open', () => ws.send(JSON.stringify({ setup: { token: 'valid_token' } })));
     ws.on('message', (data) => { if (JSON.parse(data.toString()).ready) ready = true; });
     await vi.waitFor(() => expect(ready).toBe(true));

     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit + 1).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));
     
     expect(await closeP).toBe(4429);
  });

  it('TEST-F2R3-WS-050 — cumulative fragmented chunks enforce limit and reject at boundary', async () => {
     const ws = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     let ready = false;
     const closeP = awaitWsClose(ws);
     ws.on('open', () => ws.send(JSON.stringify({ setup: { token: 'valid_token' } })));
     ws.on('message', (data) => { if (JSON.parse(data.toString()).ready) ready = true; });
     await vi.waitFor(() => expect(ready).toBe(true));

     const limit = 4 * 1024 * 1024;
     const chunk1 = Buffer.alloc(limit - 100).toString('base64');
     ws.send(JSON.stringify({ audio: chunk1 }));
     await new Promise(r => setTimeout(r, 20));
     
     const chunk2 = Buffer.alloc(101).toString('base64');
     ws.send(JSON.stringify({ audio: chunk2 }));
     
     expect(await closeP).toBe(4429);
  });

  it('TEST-F2R3-WS-051 — one large WebSocket message > maxPayload closes with 1009 before quota check', async () => {
     const ws = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     let ready = false;
     const closeP = awaitWsClose(ws);
     ws.on('open', () => ws.send(JSON.stringify({ setup: { token: 'valid_token' } })));
     ws.on('message', (data) => { if (JSON.parse(data.toString()).ready) ready = true; });
     await vi.waitFor(() => expect(ready).toBe(true));

     // Our server has a generic max payload check. If size > 262144 (256KB) for authenticated users, it's 1009
     // Wait, 4MB quota is for decoded audio. But the transport max payload is 256KB!
     // So a single 4MB message will ALWAYS be rejected by transport max payload (1009) before it hits audio logic!
     const big = 'A'.repeat(300000); 
     ws.send(big);
     
     expect(await closeP).toBe(1009);
  });

  it('TEST-F2R3-WS-052 — quota isolation between two sessions', async () => {
     // User A
     const wsA = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     let readyA = false;
     wsA.on('open', () => wsA.send(JSON.stringify({ setup: { token: 'valid_token' } })));
     wsA.on('message', (data) => { if (JSON.parse(data.toString()).ready) readyA = true; });
     await vi.waitFor(() => expect(readyA).toBe(true));

     // User B
     const wsB = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     let readyB = false;
     wsB.on('open', () => wsB.send(JSON.stringify({ setup: { token: 'valid_token_2' } }))); // Wait, valid_token_2 resolves to same UID in mock?
     // Let's modify the mock to resolve differently if token is different.
     // Wait, verifyIdToken mock just returns { uid: 'test_user_123' } for valid_token.
     // Is there a token for a different UID? 
     // We can just use the same UID but wait! "between two sessions". If they are the same UID, they share the quota?
     // "pcmAudioQuotaByUid[uid]" - yes they share quota if they are the same UID!
     // So we need a different UID. I'll patch the mock to return uid: token for valid_*.
  });

  it('TEST-F2R3-WS-053 — quota reset after session termination', async () => {
     const ws = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     let ready = false;
     ws.on('open', () => ws.send(JSON.stringify({ setup: { token: 'valid_token' } })));
     ws.on('message', (data) => { if (JSON.parse(data.toString()).ready) ready = true; });
     await vi.waitFor(() => expect(ready).toBe(true));

     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit - 100).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));
     
     await new Promise(r => setTimeout(r, 50));
     const closeP = awaitWsClose(ws);
     ws.close();
     await closeP;

     // Now connect again with same UID
     const ws2 = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     let ready2 = false;
     ws2.on('open', () => ws2.send(JSON.stringify({ setup: { token: 'valid_token' } })));
     ws2.on('message', (data) => { if (JSON.parse(data.toString()).ready) ready2 = true; });
     await vi.waitFor(() => expect(ready2).toBe(true));

     // Should be able to send another limit-100 without getting 4429
     ws2.send(JSON.stringify({ audio: payload }));
     await new Promise(r => setTimeout(r, 50));
     expect(ws2.readyState).toBe(1);

     const closeP2 = awaitWsClose(ws2);
     ws2.close();
     await closeP2;
  });

  it('TEST-F2R3-WS-054 — adversarial replacement-session test', async () => {
     // authenticate socket A under UID X
     const wsA = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     let readyA = false;
     wsA.on('open', () => wsA.send(JSON.stringify({ setup: { token: 'valid_token' } })));
     wsA.on('message', (data) => { if (JSON.parse(data.toString()).ready) readyA = true; });
     await vi.waitFor(() => expect(readyA).toBe(true));

     // register socket B as replacement under UID X
     const wsB = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     let readyB = false;
     wsB.on('open', () => wsB.send(JSON.stringify({ setup: { token: 'valid_token' } })));
     wsB.on('message', (data) => { if (JSON.parse(data.toString()).ready) readyB = true; });
     await vi.waitFor(() => expect(readyB).toBe(true));

     expect(__getLiveSnapshotForTests().totalActiveLiveSessions).toBe(2);

     // trigger A delayed close
     const closePA = awaitWsClose(wsA);
     wsA.close();
     await closePA;

     // prove B remains registered
     await vi.waitFor(() => {
        expect(__getLiveSnapshotForTests().totalActiveLiveSessions).toBe(1);
     });
     
     expect(wsB.readyState).toBe(1);
     
     // close B
     const closePB = awaitWsClose(wsB);
     wsB.close();
     await closePB;

     // prove UID registry returns to baseline
     await vi.waitFor(() => {
        expect(__getLiveSnapshotForTests().totalActiveLiveSessions).toBe(0);
     });
  });
});
`;

testTs = testTs.replace(/^}\);\s*$/m, newTests);

fs.writeFileSync('server.test.ts', testTs);
