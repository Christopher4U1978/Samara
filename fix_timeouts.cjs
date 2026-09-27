const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

// Fix 1: sendAudioInChunks event-based pacing
testTs = testTs.replace(
  `        ws.send(str);
        sent += toSend;
        await new Promise(r => setTimeout(r, 20)); // prevent max transport buffer issue`,
  `        await new Promise((res, rej) => {
           ws.send(str, (err) => {
              if (err) rej(err); else res();
           });
        });
        sent += toSend;`
);

// Fix 2: Test 044 resolveConnect interception
testTs = testTs.replace(
  `     let resolveConnect: any;
     aiInstance.live.connect.mockImplementationOnce(() => {
        return new Promise(resolve => {
           resolveConnect = resolve;
        });
     });
     
     const ws = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     const closeP = awaitWsClose(ws);
     let readyReceived = false;
     
     await new Promise<void>(r => {
        ws.on('open', () => {
           ws.send(JSON.stringify({ setup: { token: 'valid_token' } }));
           // Need to wait until connect is actually pending
           const check = () => { if (resolveConnect) { ws.close(); r(); } else setTimeout(check, 5); };
           check();
        });`,
  `     let resolveConnect: any;
     let connectCalledCb: (() => void) | null = null;
     aiInstance.live.connect.mockImplementationOnce(() => {
        if (connectCalledCb) connectCalledCb();
        return new Promise(resolve => {
           resolveConnect = resolve;
        });
     });
     
     const ws = new WebSocket(\`ws://127.0.0.1:\${port}/live\`);
     const closeP = awaitWsClose(ws);
     let readyReceived = false;
     
     await new Promise<void>(r => {
        ws.on('open', () => {
           ws.send(JSON.stringify({ setup: { token: 'valid_token' } }));
           if (resolveConnect) { ws.close(); r(); }
           else { connectCalledCb = () => { ws.close(); r(); }; }
        });`
);

// Fix 3: Test 046 backpressure 
testTs = testTs.replace(
  `     // Send chunks of ~150KB decoded (200KB base64) until we exceed 4MB
     const chunkPcm = Buffer.alloc(150 * 1024).toString('base64');
     for (let i = 0; i < 30; i++) {
        if (ws.readyState === 1) {
           ws.send(JSON.stringify({ audio: chunkPcm }));
           await new Promise(r => setTimeout(r, 10)); // small delay to not overwhelm the TCP buffer and avoid backpressure
        }
     }`,
  `     // Send chunks of ~150KB decoded (200KB base64) until we exceed 4MB
     const chunkPcm = Buffer.alloc(150 * 1024).toString('base64');
     for (let i = 0; i < 30; i++) {
        if (ws.readyState === 1) {
           await new Promise<void>((res, rej) => {
              ws.send(JSON.stringify({ audio: chunkPcm }), (err) => {
                 if (err) res(); else res(); // continue on error to await closeP
              });
           });
        }
     }`
);

fs.writeFileSync('server.test.ts', testTs);
