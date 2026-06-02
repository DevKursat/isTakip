const firebaseConfig = {
  apiKey: "AIzaSyARuvKCD-2Vdi2F5epXA5dvk_x6-TYd9YA",
  authDomain: "istakip-k.firebaseapp.com",
  projectId: "istakip-k",
  storageBucket: "istakip-k.firebasestorage.app",
  messagingSenderId: "231110333938",
  appId: "1:231110333938:web:6424493bf74bd160e7c76b"
};

export async function initFirebase() {
  try {
    const [{ initializeApp }, firebaseAuth, firebaseDb] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js")
    ]);

    const app = initializeApp(firebaseConfig);
    const auth = firebaseAuth.getAuth(app);
    const db = firebaseDb.getFirestore(app);

    return {
      ok: true,
      app,
      auth,
      db,
      firebaseAuth,
      firebaseDb
    };
  } catch (error) {
    return {
      ok: false,
      error
    };
  }
}
