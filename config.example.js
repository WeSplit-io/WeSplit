// Configuration example - Copiez ce fichier vers config.js et remplissez vos valeurs
// Ce fichier peut être commité dans Git car il ne contient que des placeholders

module.exports = {
  firebase: {
    apiKey: "YOUR_FIREBASE_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID_HERE",
    appId: "YOUR_APP_ID_HERE"
  },
  moonpay: {
    apiKey: "YOUR_MOONPAY_API_KEY_HERE"
  }
};

// Instructions :
// 1. Copiez ce fichier vers config.js
// 2. Remplacez les placeholders par vos vraies valeurs
// 3. config.js ne sera pas commité (dans .gitignore)
// 4. Utilisez config.local.js pour le développement local
