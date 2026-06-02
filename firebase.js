import { firebaseConfig } from "./env.js";

// Not: Firebase web config env.js dosyasına taşındı ve gizlendi.

export async function initFirebase() {
  try {
    const [{ initializeApp }, firebaseDb] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js")
    ]);

    const app = initializeApp(firebaseConfig);
    const db = firebaseDb.getFirestore(app);

    return {
      ok: true,
      app,
      db,
      firebaseDb
    };
  } catch (error) {
    return {
      ok: false,
      error
    };
  }
}
