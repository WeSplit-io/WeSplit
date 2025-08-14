# 🔒 Guide de Nettoyage des Secrets - WeSplit

## 🚨 **PROBLÈME IDENTIFIÉ**

GitHub a bloqué votre push car des secrets ont été détectés dans l'historique des commits :

### **Violations détectées :**
1. **Fichier JSON Firebase Admin SDK** : `backend/wesplit-35186-firebase-adminsdk-fbsvc-2b1bb8a520.json`
   - Contient des clés privées Firebase et credentials Google
   - **STATUT** : ❌ SUPPRIMÉ

2. **Fichier .env** : Contient des clés Stripe/MoonPay et Google OAuth
   - **STATUT** : 🔄 ANONYMIÉ avec placeholders

3. **Fichier moonpay.js** : Clés Stripe hardcodées
   - **STATUT** : 🔄 REMPLACÉ par variables d'environnement

4. **Fichier APK volumineux** : `WeSplit-Development.apk` (99MB)
   - **STATUT** : ❌ SUPPRIMÉ

## 🛠️ **SOLUTION IMPLÉMENTÉE**

### **Fichiers créés/modifiés :**
- ✅ `env.example` - Template avec placeholders pour tous les secrets
- ✅ `.gitignore` - Mis à jour pour ignorer tous les fichiers sensibles
- ✅ `cleanup-secrets.sh` - Script automatisé de nettoyage
- ✅ `firebase-functions/src/moonpay.js` - Nettoyé des clés hardcodées

### **Fichiers supprimés :**
- ❌ `backend/wesplit-35186-firebase-adminsdk-fbsvc-2b1bb8a520.json`
- ❌ `WeSplit-Development.apk`

## 🚀 **PROCESSUS DE NETTOYAGE**

### **Option 1 : Script automatisé (RECOMMANDÉ)**
```bash
# 1. Installer git-filter-repo
pip install git-filter-repo

# 2. Exécuter le script de nettoyage
./cleanup-secrets.sh
```

### **Option 2 : Nettoyage manuel**
```bash
# 1. Sauvegarder vos secrets actuels
cp .env .env.backup

# 2. Remplacer .env par des placeholders
cp env.example .env

# 3. Nettoyer l'historique Git
git filter-repo --path .env --invert-paths --force
git filter-repo --path .env.production --invert-paths --force
git filter-repo --path "backend/wesplit-35186-firebase-adminsdk-fbsvc-2b1bb8a520.json" --invert-paths --force
git filter-repo --path "WeSplit-Development.apk" --invert-paths --force

# 4. Commiter les changements
git add .
git commit -m "🔒 Nettoyage des secrets et sécurisation du projet"

# 5. Forcer le push
git push --force-with-lease origin main
```

## 📋 **VARIABLES D'ENVIRONNEMENT REQUISES**

### **Firebase Configuration**
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY_HERE
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
```

### **MoonPay Configuration**
```bash
MOONPAY_API_KEY=YOUR_MOONPAY_API_KEY_HERE
MOONPAY_SECRET_KEY=YOUR_MOONPAY_SECRET_KEY_HERE
MOONPAY_WEBHOOK_SECRET=YOUR_MOONPAY_WEBHOOK_SECRET_HERE
```

### **Google OAuth Configuration**
```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
ANDROID_GOOGLE_CLIENT_ID=YOUR_ANDROID_GOOGLE_CLIENT_ID_HERE
IOS_GOOGLE_CLIENT_ID=YOUR_IOS_GOOGLE_CLIENT_ID_HERE
```

### **Autres Services**
```bash
EXPO_PUBLIC_TWITTER_CLIENT_ID=YOUR_TWITTER_CLIENT_ID_HERE
EXPO_PUBLIC_TWITTER_CLIENT_SECRET=YOUR_TWITTER_CLIENT_SECRET_HERE
JWT_SECRET=YOUR_SUPER_SECURE_32_CHARACTER_JWT_SECRET_KEY_HERE
```

## 🔐 **SÉCURITÉ POST-NETTOYAGE**

### **Règles à respecter :**
1. **NE JAMAIS committer** le fichier `.env`
2. **Utiliser** `env.example` comme modèle
3. **Vérifier** que `.gitignore` contient tous les patterns sensibles
4. **Utiliser** des variables d'environnement pour tous les secrets
5. **Régénérer** toutes les clés exposées (Firebase, MoonPay, Google, etc.)

### **Vérifications de sécurité :**
```bash
# Vérifier qu'aucun secret n'est dans l'historique
git log --oneline --all --full-history -- .env*

# Vérifier le contenu du .gitignore
cat .gitignore | grep -E "\.(env|json|apk|aab|ipa)"

# Vérifier qu'aucun fichier sensible n'est tracké
git ls-files | grep -E "\.(env|json|apk|aab|ipa)"
```

## 🚨 **IMPORTANT - RÉGÉNÉRATION DES CLÉS**

### **Clés à régénérer immédiatement :**
1. **Firebase Admin SDK** - Créer une nouvelle clé de service
2. **MoonPay** - Régénérer les clés API et webhook
3. **Google OAuth** - Régénérer les client IDs et secrets
4. **JWT** - Changer le secret JWT

### **Processus de régénération :**
1. Aller sur les consoles respectives (Firebase, MoonPay, Google Cloud)
2. Révoquer les anciennes clés
3. Créer de nouvelles clés
4. Mettre à jour votre fichier `.env` local
5. Tester que tout fonctionne

## 📚 **RESSOURCES UTILES**

- [GitHub Secrets Scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- [Firebase Security Best Practices](https://firebase.google.com/docs/projects/iam/security-best-practices)
- [Environment Variables Best Practices](https://12factor.net/config)

## 🆘 **EN CAS DE PROBLÈME**

Si vous rencontrez des difficultés :

1. **Vérifiez** que `git-filter-repo` est installé
2. **Sauvegardez** votre travail avant de commencer
3. **Vérifiez** que tous les fichiers sensibles sont dans `.gitignore`
4. **Testez** localement avant de pousser sur GitHub

## ✅ **VÉRIFICATION FINALE**

Après le nettoyage, votre projet doit :
- ✅ Ne plus contenir de secrets dans l'historique Git
- ✅ Avoir un `.gitignore` complet
- ✅ Utiliser des variables d'environnement
- ✅ Avoir un fichier `env.example` à jour
- ✅ Être prêt pour le push sur GitHub

---

**🔒 Votre projet est maintenant sécurisé et prêt pour la production !**
