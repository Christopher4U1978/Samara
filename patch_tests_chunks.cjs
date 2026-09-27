const fs = require('fs');
let testTs = fs.readFileSync('server.test.ts', 'utf8');

const helper = `
  async function sendAudioInChunks(ws, decodedBytesToReach) {
     const chunkSize = 150 * 1024; // 150KB decoded
     let sent = 0;
     while (sent < decodedBytesToReach) {
        let toSend = Math.min(chunkSize, decodedBytesToReach - sent);
        const payload = Buffer.alloc(toSend).toString('base64');
        ws.send(JSON.stringify({ audio: payload }));
        sent += toSend;
        await new Promise(r => setTimeout(r, 5)); // prevent max transport buffer issue
     }
  }
`;

// Inject helper after describe
testTs = testTs.replace(/describe\('SAMARA Security Hardening \(F2-R3\)', \(\) => {/, 
`describe('SAMARA Security Hardening (F2-R3)', () => {
${helper}`);

// Fix TEST 47
testTs = testTs.replace(
`     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit - 1).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));
     
     await vi.waitFor(() => expect(sessionMock.sendRealtimeInput).toHaveBeenCalled());`,
`     const limit = 4 * 1024 * 1024;
     await sendAudioInChunks(ws, limit - 1);
     await vi.waitFor(() => expect(sessionMock.sendRealtimeInput).toHaveBeenCalled());`
);

// Fix TEST 48
testTs = testTs.replace(
`     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));
     
     await vi.waitFor(() => expect(sessionMock.sendRealtimeInput).toHaveBeenCalled());`,
`     const limit = 4 * 1024 * 1024;
     await sendAudioInChunks(ws, limit);
     await vi.waitFor(() => expect(sessionMock.sendRealtimeInput).toHaveBeenCalled());`
);

// Fix TEST 49
testTs = testTs.replace(
`     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit + 1).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));`,
`     const limit = 4 * 1024 * 1024;
     await sendAudioInChunks(ws, limit + 1);`
);

// Fix TEST 50
testTs = testTs.replace(
`     const limit = 4 * 1024 * 1024;
     const chunk1 = Buffer.alloc(limit - 100).toString('base64');
     ws.send(JSON.stringify({ audio: chunk1 }));
     
     const chunk2 = Buffer.alloc(101).toString('base64');
     ws.send(JSON.stringify({ audio: chunk2 }));`,
`     const limit = 4 * 1024 * 1024;
     await sendAudioInChunks(ws, limit - 100);
     const chunk2 = Buffer.alloc(101).toString('base64');
     ws.send(JSON.stringify({ audio: chunk2 }));`
);

// Fix TEST 53
testTs = testTs.replace(
`     const limit = 4 * 1024 * 1024;
     const payload = Buffer.alloc(limit - 100).toString('base64');
     ws.send(JSON.stringify({ audio: payload }));
     
     await vi.waitFor(() => expect(sessionMock.sendRealtimeInput).toHaveBeenCalled());`,
`     const limit = 4 * 1024 * 1024;
     await sendAudioInChunks(ws, limit - 100);
     await vi.waitFor(() => expect(sessionMock.sendRealtimeInput).toHaveBeenCalled());`
);

// The second part of TEST 53
testTs = testTs.replace(
`     // Should be able to send another limit-100 without getting 4429
     sessionMock.sendRealtimeInput.mockClear();
     ws2.send(JSON.stringify({ audio: payload }));
     await vi.waitFor(() => expect(sessionMock.sendRealtimeInput).toHaveBeenCalled());
     expect(ws2.readyState).toBe(1);`,
`     // Should be able to send another limit-100 without getting 4429
     sessionMock.sendRealtimeInput.mockClear();
     await sendAudioInChunks(ws2, limit - 100);
     await vi.waitFor(() => expect(sessionMock.sendRealtimeInput).toHaveBeenCalled());
     expect(ws2.readyState).toBe(1);`
);

fs.writeFileSync('server.test.ts', testTs);
