import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { setDoc, getDoc, doc, collection, addDoc, getDocs, writeBatch, runTransaction, serverTimestamp } from 'firebase/firestore';

let testEnv: RulesTestEnvironment | undefined;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-samara-test',
    firestore: {
      rules: readFileSync(resolve(__dirname, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9150
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

describe('SAMARA Firebase Security Rules (Phase F1)', () => {

  const USER_A_ID = 'USER_A';
  const USER_B_ID = 'USER_B';

  const getUnauthDb = () => testEnv.unauthenticatedContext().firestore();
  const getAuthDb = (uid: string) => testEnv.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true }).firestore();

  describe('Unauthenticated Access', () => {
    it('should deny unauthenticated root read', async () => {
      const db = getUnauthDb();
      await assertFails(getDoc(doc(db, 'users', USER_A_ID)));
    });

    it('should deny unauthenticated root write', async () => {
      const db = getUnauthDb();
      await assertFails(setDoc(doc(db, 'users', USER_A_ID), { email: 'a@a.com', sarcasmLevel: 5, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    });

    it('should deny unauthenticated message read', async () => {
      const db = getUnauthDb();
      await assertFails(getDocs(collection(db, `users/${USER_A_ID}/messages`)));
    });

    it('should deny unauthenticated message write', async () => {
      const db = getUnauthDb();
      await assertFails(addDoc(collection(db, `users/${USER_A_ID}/messages`), { text: 'hi', sender: 'user', contextFront: 'unknown', createdAt: serverTimestamp() }));
    });
  });

  describe('Cross-User Root Operations', () => {
    it('A reads A -> ALLOW', async () => {
      const db = getAuthDb(USER_A_ID);
      // It allows get, we can test getDoc.
      await assertSucceeds(getDoc(doc(db, 'users', USER_A_ID)));
    });

    it('A reads B -> DENY', async () => {
      const db = getAuthDb(USER_A_ID);
      await assertFails(getDoc(doc(db, 'users', USER_B_ID)));
    });

    it('A writes A -> ALLOW where schema-valid', async () => {
      const db = getAuthDb(USER_A_ID);
      const data = {
        email: 'user_a@example.com',
        sarcasmLevel: 5,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await assertSucceeds(setDoc(doc(db, 'users', USER_A_ID), data));
    });

    it('A writes B -> DENY', async () => {
      const db = getAuthDb(USER_A_ID);
      const data = {
        email: 'user_b@example.com',
        sarcasmLevel: 5,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await assertFails(setDoc(doc(db, 'users', USER_B_ID), data));
    });
  });

  describe('Messages Subcollection', () => {
    const getValidMessage = () => ({
      text: 'Hello SAMARA',
      sender: 'user',
      contextFront: 'unknown',
      createdAt: serverTimestamp() // Valid timestamp
    });

    beforeEach(async () => {
      // Create master gate for A
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', USER_A_ID), {
          email: 'a@a.com', sarcasmLevel: 5, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
      });
    });

    it('A reads A/messages -> ALLOW', async () => {
      const db = getAuthDb(USER_A_ID);
      await assertSucceeds(getDocs(collection(db, `users/${USER_A_ID}/messages`)));
    });

    it('A reads B/messages -> DENY', async () => {
      const db = getAuthDb(USER_A_ID);
      await assertFails(getDocs(collection(db, `users/${USER_B_ID}/messages`)));
    });

    it('A creates A/message -> ALLOW where valid', async () => {
      const db = getAuthDb(USER_A_ID);
      await assertSucceeds(addDoc(collection(db, `users/${USER_A_ID}/messages`), getValidMessage()));
    });

    it('A creates B/message -> DENY', async () => {
      const db = getAuthDb(USER_A_ID);
      await assertFails(addDoc(collection(db, `users/${USER_B_ID}/messages`), getValidMessage()));
    });
  });

  describe('Sarcasm Level Constraints', () => {
    const writeSarcasm = async (level: any) => {
      const db = getAuthDb(USER_A_ID);
      return setDoc(doc(db, 'users', USER_A_ID), {
        email: 'a@a.com',
        sarcasmLevel: level,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    };

    it('0 -> ALLOW', async () => await assertSucceeds(writeSarcasm(0)));
    it('5 -> ALLOW', async () => await assertSucceeds(writeSarcasm(5)));
    it('10 -> ALLOW', async () => await assertSucceeds(writeSarcasm(10)));
    
    it('-1 -> DENY', async () => await assertFails(writeSarcasm(-1)));
    it('11 -> DENY', async () => await assertFails(writeSarcasm(11)));
    it('"5" -> DENY', async () => await assertFails(writeSarcasm("5")));
    it('null -> DENY', async () => await assertFails(writeSarcasm(null)));
    it('object -> DENY', async () => await assertFails(writeSarcasm({ val: 5 })));
    it('array -> DENY', async () => await assertFails(writeSarcasm([5])));
  });

  describe('Unexpected Fields', () => {
    it('Attempt insertion of unauthorized fields -> DENY', async () => {
      const db = getAuthDb(USER_A_ID);
      const data = {
        email: 'a@a.com',
        sarcasmLevel: 5,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isAdmin: true // Malicious field
      };
      await assertFails(setDoc(doc(db, 'users', USER_A_ID), data));
    });
  });

  describe('Cross-UID Batch Write', () => {
    it('Attempt batch containing valid A write + B write -> DENY', async () => {
      const db = getAuthDb(USER_A_ID);
      const batch = writeBatch(db);
      
      const refA = doc(db, 'users', USER_A_ID);
      const refB = doc(db, 'users', USER_B_ID);

      batch.set(refA, { email: 'a@a.com', sarcasmLevel: 5, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      batch.set(refB, { email: 'b@b.com', sarcasmLevel: 5, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

      await assertFails(batch.commit());
    });
  });
  
  describe('Cross-UID Transaction', () => {
    it('Attempt cross-UID transaction -> DENY', async () => {
      const db = getAuthDb(USER_A_ID);
      await assertFails(runTransaction(db, async (t) => {
        const refA = doc(db, 'users', USER_A_ID);
        const refB = doc(db, 'users', USER_B_ID);
        t.set(refA, { email: 'a@a.com', sarcasmLevel: 5, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        t.set(refB, { email: 'b@b.com', sarcasmLevel: 5, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }));
    });
  });
});
