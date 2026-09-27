const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

// Replace setTimeout in afterEach
testTs = testTs.replace(
  `  afterEach(async () => {
    await new Promise(r => setTimeout(r, 50));
    const snap = __getLiveSnapshotForTests();
    expect(snap.activePreAuthConnections).toBe(0);
    expect(snap.totalActiveLiveSessions).toBe(0);
  });`,
  `  afterEach(async () => {
    await vi.waitFor(() => {
        const snap = __getLiveSnapshotForTests();
        expect(snap.activePreAuthConnections).toBe(0);
        expect(snap.totalActiveLiveSessions).toBe(0);
    }, { timeout: 1000, interval: 10 });
  });`
);

// Replace TEST-F2R2-WS-027
testTs = testTs.replace(
`     ws.close();
     await closeCode;
     
     await new Promise(r => setTimeout(r, 50));
     expect(__getLiveSnapshotForTests().activePreAuthConnections).toBe(0);`,
`     ws.close();
     await closeCode;
     
     await vi.waitFor(() => {
        expect(__getLiveSnapshotForTests().activePreAuthConnections).toBe(0);
     }, { timeout: 1000, interval: 10 });`
);

// Replace TEST-F2R2-WS-030
testTs = testTs.replace(
`     ws.close();
     await closeCodePromise;
     await new Promise(r => setTimeout(r, 50));
     expect(sessionMock.close).toHaveBeenCalledTimes(1);`,
`     ws.close();
     await closeCodePromise;
     await vi.waitFor(() => {
        expect(sessionMock.close).toHaveBeenCalledTimes(1);
     }, { timeout: 1000, interval: 10 });`
);

// F2R3-WS-044
testTs = testTs.replace(
`     aiInstance.live.connect.mockImplementationOnce(() => {
        return new Promise(resolve => {
           setTimeout(() => {
              sessionMock = { sendRealtimeInput: vi.fn(), close: vi.fn() };
              resolve(sessionMock);
           }, 50);
        });
     });`,
`     let resolveConnect: any;
     aiInstance.live.connect.mockImplementationOnce(() => {
        return new Promise(resolve => {
           resolveConnect = resolve;
        });
     });`
);

testTs = testTs.replace(
`     await new Promise<void>(r => {
        ws.on('open', () => {
           ws.send(JSON.stringify({ setup: { token: 'valid_token' } }));
           setTimeout(() => { ws.close(); r(); }, 10); // close while connect pending
        });
        ws.on('message', (data) => {`,
`     await new Promise<void>(r => {
        ws.on('open', () => {
           ws.send(JSON.stringify({ setup: { token: 'valid_token' } }));
           // Need to wait until connect is actually pending
           const check = () => { if (resolveConnect) { ws.close(); r(); } else setTimeout(check, 5); };
           check();
        });
        ws.on('message', (data) => {`
);

testTs = testTs.replace(
`     await closeP;
     await new Promise(r => setTimeout(r, 60)); // wait for delayed connect
     expect(readyReceived).toBe(false);
     expect(sessionMock.close).toHaveBeenCalledTimes(1);`,
`     await closeP;
     // resolve connect now
     sessionMock = { sendRealtimeInput: vi.fn(), close: vi.fn() };
     resolveConnect(sessionMock);
     
     await vi.waitFor(() => {
        expect(sessionMock.close).toHaveBeenCalledTimes(1);
     }, { timeout: 1000, interval: 10 });
     expect(readyReceived).toBe(false);`
);

// F2R3-WS-046
testTs = testTs.replace(
`     // wait for ready
     await new Promise<void>(r => {
        const check = () => { if (ready) r(); else setTimeout(check, 10); };
        check();
     });`,
`     // wait for ready
     await vi.waitFor(() => {
        expect(ready).toBe(true);
     }, { timeout: 1000, interval: 10 });`
);

// We still have 10ms delays for backpressure avoidance?
// "Remove every fixed 50ms delay introduced into lifecycle tests, hooks, and teardown logic."
// The 10ms for TCP buffer is not a teardown logic delay. Wait, the user said:
// "Remove every fixed 50ms delay introduced into lifecycle tests, hooks, and teardown logic."
// I will just leave the 10ms chunks one, it's not a 50ms lifecycle delay.

fs.writeFileSync('server.test.ts', testTs);
