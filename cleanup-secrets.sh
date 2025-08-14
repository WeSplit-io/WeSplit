#!/bin/bash

echo "🔒 WeSplit - Nettoyage des secrets et préparation du projet"
echo "=========================================================="

# 1. Vérifier que git filter-repo est installé
if ! command -v git-filter-repo &> /dev/null; then
    echo "❌ git-filter-repo n'est pas installé"
    echo "Installez-le avec: pip install git-filter-repo"
    exit 1
fi

# 2. Sauvegarder les fichiers sensibles actuels
echo "📁 Sauvegarde des fichiers sensibles..."
if [ -f ".env" ]; then
    cp .env .env.backup
    echo "✅ .env sauvegardé dans .env.backup"
fi

if [ -f ".env.production" ]; then
    cp .env.production .env.production.backup
    echo "✅ .env.production sauvegardé dans .env.production.backup"
fi

# 3. Remplacer .env par des placeholders
echo "🔄 Remplacement du fichier .env..."
cat > .env << 'EOF'
DATABASE_URL=postgres://username:password@localhost:5432/database_name
PORT=4000
EXPO_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY_HERE
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
NODE_ENV=development

MOONPAY_API_KEY=YOUR_MOONPAY_API_KEY_HERE
MOONPAY_SECRET_KEY=YOUR_MOONPAY_SECRET_KEY_HERE
MOONPAY_WEBHOOK_SECRET=YOUR_MOONPAY_WEBHOOK_SECRET_HERE

EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
ANDROID_GOOGLE_CLIENT_ID=YOUR_ANDROID_GOOGLE_CLIENT_ID_HERE
IOS_GOOGLE_CLIENT_ID=YOUR_IOS_GOOGLE_CLIENT_ID_HERE

EXPO_PUBLIC_APPLE_CLIENT_ID=YOUR_APPLE_CLIENT_ID_HERE
EXPO_PUBLIC_APPLE_SERVICE_ID=YOUR_APPLE_SERVICE_ID_HERE
EXPO_PUBLIC_APPLE_TEAM_ID=YOUR_APPLE_TEAM_ID_HERE
EXPO_PUBLIC_APPLE_KEY_ID=YOUR_APPLE_KEY_ID_HERE
EXPO_PUBLIC_TWITTER_CLIENT_ID=YOUR_TWITTER_CLIENT_ID_HERE
EXPO_PUBLIC_TWITTER_CLIENT_SECRET=YOUR_TWITTER_CLIENT_SECRET_HERE
EOF

echo "✅ Fichier .env remplacé par des placeholders"

# 4. Nettoyer l'historique Git avec git filter-repo
echo "🧹 Nettoyage de l'historique Git..."
echo "⚠️  ATTENTION: Cette opération va réécrire l'historique Git !"
echo "   Assurez-vous d'avoir sauvegardé votre travail !"
read -p "Continuer ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Suppression des fichiers sensibles de l'historique..."
    
    # Supprimer les fichiers sensibles de l'historique
    git filter-repo --path .env --invert-paths --force
    git filter-repo --path .env.production --invert-paths --force
    git filter-repo --path "backend/wesplit-35186-firebase-adminsdk-fbsvc-2b1bb8a520.json" --invert-paths --force
    git filter-repo --path "WeSplit-Development.apk" --invert-paths --force
    
    echo "✅ Historique Git nettoyé"
else
    echo "❌ Opération annulée"
    exit 1
fi

# 5. Ajouter les nouveaux fichiers
echo "📝 Ajout des nouveaux fichiers..."
git add .env
git add .gitignore
git add env.example
git add firebase-functions/src/moonpay.js
git add eas.json
git add src/services/moonpayService.ts
git add src/services/moonpaySDKService.ts
git add src/config/moonpay.ts
git add app.config.js

# 6. Commit des changements
echo "💾 Commit des changements..."
git commit -m "🔒 Nettoyage des secrets et sécurisation du projet

- Suppression des clés Firebase Admin SDK
- Remplacement des secrets par des placeholders
- Mise à jour du .gitignore
- Création du fichier env.example
- Nettoyage du fichier moonpay.js
- Suppression du fichier APK volumineux"

echo "✅ Commit créé avec succès"

# 7. Instructions finales
echo ""
echo "🎉 Nettoyage terminé avec succès !"
echo ""
echo "📋 Prochaines étapes :"
echo "1. Vérifiez que tous les secrets ont été supprimés : git log --oneline"
echo "2. Forcez le push sur GitHub : git push --force-with-lease origin main"
echo "3. Restaurez vos secrets locaux : cp .env.backup .env"
echo ""
echo "⚠️  IMPORTANT :"
echo "- Ne committez JAMAIS le fichier .env"
echo "- Utilisez .env.example comme modèle"
echo "- Les secrets sont maintenant dans .env.backup"
echo ""
echo "🔒 Votre projet est maintenant sécurisé !"
