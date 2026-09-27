const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

testTs = testTs.replace(
`     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit - 1).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));
     
     await new Promise(r => setTimeout(r, 50)); // let server process
     expect(ws.readyState).toBe(1); // Still open`,
`     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit - 1).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));
     
     await vi.waitFor(() => expect(sessionMock.sendRealtimeInput).toHaveBeenCalled());
     expect(ws.readyState).toBe(1); // Still open`
);

testTs = testTs.replace(
`     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));
     
     await new Promise(r => setTimeout(r, 50)); // let server process
     expect(ws.readyState).toBe(1); // Still open`,
`     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));
     
     await vi.waitFor(() => expect(sessionMock.sendRealtimeInput).toHaveBeenCalled());
     expect(ws.readyState).toBe(1); // Still open`
);

fs.writeFileSync('server.test.ts', testTs);
