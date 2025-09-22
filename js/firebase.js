// firebase.js - minimal Firebase/Firestore integration
// Exports: initFirebase(config), getUserRef(uid), listenToUser(uid, onUpdate), setUserData(uid, data)

let firebaseApp = null;
let firestore = null;
let auth = null;

export async function initFirebase(config) {
  if (!config) return null;
  // load the Firebase scripts dynamically
  if (!window.firebase) {
    await new Promise((resolve, reject) => {
      const s1 = document.createElement('script');
      s1.src = 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
      s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js';
        s2.onload = () => {
          const s3 = document.createElement('script');
          s3.src = 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js';
          s3.onload = () => resolve();
          s3.onerror = reject;
          document.head.appendChild(s3);
        };
        s2.onerror = reject;
        document.head.appendChild(s2);
      };
      s1.onerror = reject;
      document.head.appendChild(s1);
    });
  }

  firebaseApp = window.firebase.initializeApp(config);
  auth = window.firebase.auth();
  firestore = window.firebase.firestore();

  // sign in anonymously
  await auth.signInAnonymously().catch(() => {});
  return { app: firebaseApp, auth, firestore };
}

export function getUserRef(uid) {
  if (!firestore) return null;
  return firestore.collection('users').doc(uid);
}

export function listenToUser(uid, onUpdate) {
  if (!firestore) return () => {};
  const ref = getUserRef(uid);
  const unsub = ref.onSnapshot(doc => {
    onUpdate(doc.exists ? doc.data() : null);
  }, err => console.warn('user listen error', err));
  return unsub;
}

export async function setUserData(uid, data) {
  if (!firestore) throw new Error('Firestore not initialized');
  const ref = getUserRef(uid);
  await ref.set(data, { merge: true });
}

// Auth helpers
export function onAuthStateChanged(cb) {
  if (!auth) return () => {};
  return auth.onAuthStateChanged(cb);
}

export async function signInWithEmail(email, password) {
  if (!auth) throw new Error('Auth not initialized');
  return auth.signInWithEmailAndPassword(email, password);
}

export async function createUserWithEmail(email, password) {
  if (!auth) throw new Error('Auth not initialized');
  return auth.createUserWithEmailAndPassword(email, password);
}

export async function signOut() {
  if (!auth) return;
  return auth.signOut();
}
