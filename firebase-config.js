/* Firebase configuration and initialization */
(function() {
  const firebaseConfig = {
    apiKey: "AIzaSyC6FXTI8gr_ROJHs-5jAqxILxoIp4RCQnU",
    authDomain: "supplier-debts.firebaseapp.com",
    databaseURL: "https://supplier-debts-default-rtdb.firebaseio.com",
    projectId: "supplier-debts",
    storageBucket: "supplier-debts.firebasestorage.app",
    messagingSenderId: "843050496393",
    appId: "1:843050496393:web:110569ac1c00c5b9c57158",
    measurementId: "G-XKYEH2JN5L"
  };

  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    if (firebase.analytics) {
      try { firebase.analytics(); } catch (e) {}
    }
  }
})();
