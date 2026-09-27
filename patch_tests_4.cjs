const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

testTs = testTs.replace(
`     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit - 100).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));
     
     await new Promise(r => setTimeout(r, 50));
     const closeP = awaitWsClose(ws);`,
`     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit - 100).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));
     
     await vi.waitFor(() => expect(sessionMock.sendRealtimeInput).toHaveBeenCalled());
     const closeP = awaitWsClose(ws);`
);

testTs = testTs.replace(
`     // Should be able to send another limit-100 without getting 4429
     ws2.send(JSON.stringify({ audio: payload }));
     await new Promise(r => setTimeout(r, 50));
     expect(ws2.readyState).toBe(1);`,
`     // Should be able to send another limit-100 without getting 4429
     sessionMock.sendRealtimeInput.mockClear();
     ws2.send(JSON.stringify({ audio: payload }));
     await vi.waitFor(() => expect(sessionMock.sendRealtimeInput).toHaveBeenCalled());
     expect(ws2.readyState).toBe(1);`
);

fs.writeFileSync('server.test.ts', testTs);
