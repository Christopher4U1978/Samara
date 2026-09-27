const fs = require('fs');

let serverTs = fs.readFileSync('server.ts', 'utf8');

// 1. Change activeLiveSessionsByUid from number map to Set map
serverTs = serverTs.replace(
  `let activeLiveSessionsByUid: Record<string, number> = {};`,
  `let activeLiveSessionsByUid: Record<string, Set<WebSocket>> = {};`
);

// 2. Fix the finalize logic
const finalizeOld = `    const finalize = (code?: number, reason?: string) => {
      if (isClosed) return;
      isClosed = true;
      if (authTimeout) clearTimeout(authTimeout);
      if (activePreAuthConnections.has(clientWs)) {
        activePreAuthConnections.delete(clientWs);
      }
      if (hasLiveReservation && uid) {
        activeLiveSessionsByUid[uid]--;
        totalActiveLiveSessions--;
        hasLiveReservation = false;
      }
      if (session) {
        try { session.close(); } catch (e) {}
        session = null;
      }
      if (code !== undefined) {
         clientWs.close(code, reason);
      } else {
         clientWs.terminate();
      }
    };`;

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

serverTs = serverTs.replace(finalizeOld, finalizeNew);

// 3. Fix the add to activeLiveSessionsByUid logic
const addSessionOld = `          activeLiveSessionsByUid[uid] = activeLiveSessionsByUid[uid] || 0;
          if (activeLiveSessionsByUid[uid] >= 2) {
             return finalize(4429, 'Too many active sessions');
          }
          activeLiveSessionsByUid[uid]++;
          totalActiveLiveSessions++;
          hasLiveReservation = true;
          sessionPending = true;`;

const addSessionNew = `          if (!activeLiveSessionsByUid[uid]) activeLiveSessionsByUid[uid] = new Set();
          if (activeLiveSessionsByUid[uid].size >= 2) {
             return finalize(4429, 'Too many active sessions');
          }
          activeLiveSessionsByUid[uid].add(clientWs);
          totalActiveLiveSessions++;
          hasLiveReservation = true;
          sessionPending = true;`;

serverTs = serverTs.replace(addSessionOld, addSessionNew);

// 4. Update __getLiveSnapshotForTests to map Sets correctly
const snapOld = `    const sessionsSnapshot = { ...activeLiveSessionsByUid };`;
const snapNew = `    const sessionsSnapshot: Record<string, number> = {};
    for (const [k, set] of Object.entries(activeLiveSessionsByUid)) {
       sessionsSnapshot[k] = set.size;
    }`;
serverTs = serverTs.replace(snapOld, snapNew);

fs.writeFileSync('server.ts', serverTs);
