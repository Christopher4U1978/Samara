const fs = require('fs');
let serverTs = fs.readFileSync('server.ts', 'utf8');

const finalizeNew = `    const finalize = (code?: number, reason?: string) => {
      if (isClosed) return;
      isClosed = true;
      if (authTimeout) clearTimeout(authTimeout);
      if (activePreAuthConnections.has(clientWs)) {
        activePreAuthConnections.delete(clientWs);
      }
      if (hasLiveReservation && uid) {
        if (activeLiveSessionsByUid[uid]?.has(clientWs)) {
           activeLiveSessionsByUid[uid].delete(clientWs);
           if (activeLiveSessionsByUid[uid].size === 0) {
              delete activeLiveSessionsByUid[uid];
              delete pcmAudioQuotaByUid[uid]; // quota reset after session termination
           }
           totalActiveLiveSessions--;
        }
        hasLiveReservation = false;
      }
      if (session) {
        try { session.close(); } catch (e) {}
        session = null;
      }
      if (code !== undefined && code !== 1006) {
         clientWs.close(code, reason);
      } else {
         clientWs.terminate();
      }
    };`;

// we have to replace the previous finalizeNew
serverTs = serverTs.replace(/const finalize = \(code\?: number, reason\?: string\) => \{[\s\S]*?\n    \};/, finalizeNew);

fs.writeFileSync('server.ts', serverTs);
