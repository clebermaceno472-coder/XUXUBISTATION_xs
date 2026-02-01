// firebase-config.js (AUTO)
// Este arquivo deixa o Firebase configurado automaticamente em QUALQUER aparelho.
// Basta subir junto do seu HTML no GitHub Pages (mesma pasta).

(() => {
  const cfg = {
    apiKey: "AIzaSyCCeaZxNNgPMD22P62ZlvmIUcVWRYf9JAI",
    authDomain: "xuxunet-1fefe.firebaseapp.com",
    projectId: "xuxunet-1fefe",
    storageBucket: "xuxunet-1fefe.firebasestorage.app",
    messagingSenderId: "183630461451",
    appId: "1:183630461451:web:1f388ccff35674de5f650e",
    measurementId: "G-B92GR7N35E"
  };

  // Expor globalmente (para firebase-xuxunet.js)
  window.XUXUNET_FIREBASE_CONFIG = cfg;

  // Preencher localStorage para que a UI do XUXUNET não peça config novamente
  try {
    const str = JSON.stringify(cfg);
    // chaves comuns (mantém compatibilidade com versões diferentes)
    localStorage.setItem("xuxunet_firebase_config_v1", str);
    localStorage.setItem("xuxunet_firebase_config", str);
    localStorage.setItem("XUXUNET_FIREBASE_CONFIG", str);
  } catch (e) {
    // Se o navegador bloquear storage, ainda funciona pelo window.XUXUNET_FIREBASE_CONFIG
  }
})();
