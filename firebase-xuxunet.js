// firebase-xuxunet.js
// SDK Firebase Web (v9 modular) via CDN
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, serverTimestamp,
  doc, setDoc, updateDoc,
  collection, addDoc, query, where, orderBy, limit,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

function requireConfig() {
  const cfg = window.XUXUNET_FIREBASE_CONFIG;
  if (!cfg || !cfg.projectId) {
    throw new Error("XUXUNET_FIREBASE_CONFIG não encontrado. Preencha firebase-config.js");
  }
  return cfg;
}

export const XUXUNET = {
  app: null,
  db: null,
  auth: null,
  uid: null,

  async init() {
    const cfg = requireConfig();

    if (!getApps().length) {
      this.app = initializeApp(cfg);
    } else {
      this.app = getApps()[0];
    }

    this.db = getFirestore(this.app);
    this.auth = getAuth(this.app);

    await signInAnonymously(this.auth);

    return new Promise((resolve) => {
      onAuthStateChanged(this.auth, (user) => {
        if (user) {
          this.uid = user.uid;
          resolve(user.uid);
        }
      });
    });
  },

  // ---- PERFIL / PRESENÇA ----
  async upsertMyProfile(profile) {
    if (!this.uid) throw new Error("XUXUNET não inicializado (uid ausente).");

    const ref = doc(this.db, "xuxunet_users", this.uid);
    const payload = {
      displayName: profile.displayName || "Jogador",
      avatarData: profile.avatarData ?? null, // string/base64/json do seu avatar
      theme: profile.theme ?? null,
      platform: profile.platform || "unknown",
      isOnline: true,
      lastActive: serverTimestamp()
    };

    await setDoc(ref, payload, { merge: true });
  },

  async heartbeat() {
    if (!this.uid) return;
    const ref = doc(this.db, "xuxunet_users", this.uid);
    try {
      await updateDoc(ref, { isOnline: true, lastActive: serverTimestamp() });
    } catch (_) {}
  },

  async setOffline() {
    if (!this.uid) return;
    const ref = doc(this.db, "xuxunet_users", this.uid);
    try {
      await updateDoc(ref, { isOnline: false, lastActive: serverTimestamp() });
    } catch (_) {}
  },

  listenOnlineUsers(cb) {
    const qy = query(
      collection(this.db, "xuxunet_users"),
      where("isOnline", "==", true),
      orderBy("lastActive", "desc"),
      limit(50)
    );
    return onSnapshot(qy, (snap) => {
      const users = [];
      snap.forEach((d) => users.push({ uid: d.id, ...d.data() }));
      cb(users);
    });
  },

  // ---- CHAT PÚBLICO ----
  async sendPublicMessage(text, meta = {}) {
    if (!this.uid) throw new Error("XUXUNET não inicializado.");
    const clean = String(text || "").trim();
    if (!clean) return;

    await addDoc(collection(this.db, "xuxunet_public", "room", "messages"), {
      from: this.uid,
      text: clean.slice(0, 600),
      createdAt: serverTimestamp(),
      ...meta
    });
  },

  listenPublicMessages(cb) {
    const qy = query(
      collection(this.db, "xuxunet_public", "room", "messages"),
      orderBy("createdAt", "desc"),
      limit(80)
    );
    return onSnapshot(qy, (snap) => {
      const msgs = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      cb(msgs.reverse());
    });
  },

  // ---- DM (simples) ----
  _convId(a, b) {
    return [a, b].sort().join("__");
  },

  async sendDM(toUid, text) {
    if (!this.uid) throw new Error("XUXUNET não inicializado.");
    const clean = String(text || "").trim();
    if (!clean || !toUid) return;

    const convId = this._convId(this.uid, toUid);

    await addDoc(collection(this.db, "xuxunet_conversations", convId, "messages"), {
      from: this.uid,
      to: toUid,
      text: clean.slice(0, 800),
      createdAt: serverTimestamp()
    });

    // “inbox” pra notificação no destino
    await addDoc(collection(this.db, "xuxunet_inbox", toUid, "items"), {
      from: this.uid,
      convId,
      textPreview: clean.slice(0, 80),
      createdAt: serverTimestamp(),
      read: false
    });
  },

  listenDM(withUid, cb) {
    if (!this.uid) throw new Error("XUXUNET não inicializado.");
    const convId = this._convId(this.uid, withUid);
    const qy = query(
      collection(this.db, "xuxunet_conversations", convId, "messages"),
      orderBy("createdAt", "asc"),
      limit(200)
    );
    return onSnapshot(qy, (snap) => {
      const msgs = [];
      snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      cb(msgs);
    });
  },

  listenInbox(cb) {
    if (!this.uid) throw new Error("XUXUNET não inicializado.");
    const qy = query(
      collection(this.db, "xuxunet_inbox", this.uid, "items"),
      where("read", "==", false),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    return onSnapshot(qy, (snap) => {
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      cb(items);
    });
  }
};

// Marcar offline ao sair/fechar
window.addEventListener("beforeunload", () => {
  try { XUXUNET.setOffline(); } catch (_) {}
});
