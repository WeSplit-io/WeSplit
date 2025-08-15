# 🚨 SECRETS CLEANUP - Nettoyage des Secrets Détectés

## 📋 Résumé des Violations GitHub

GitHub a détecté les secrets suivants dans l'historique des commits :

### 1. **Fichier JSON Firebase Admin SDK** 
- **Fichier** : `backend/wesplit-35186-firebase-adminsdk-fbsvc-2b1bb8a520.json`
- **Contenu** : Clés privées Firebase, emails de service, certificats
- **Statut** : ❌ **BLOQUANT** - Doit être supprimé de l'historique

### 2. **Fichier .env avec clés sensibles**
- **Fichier** : `.env` (lignes 13, 16, 17, 18)
- **Contenu** : Clés Stripe, Google OAuth
- **Statut** : ❌ **BLOQUANT** - Doit être supprimé de l'historique

### 3. **Fichier moonpay.js avec clés Stripe**
- **Fichier** : `firebase-functions/src/moonpay.js` (lignes 8 et 14)
- **Contenu** : Clés Stripe hardcodées
- **Statut** : ❌ **BLOQUANT** - Doit être nettoyé

### 4. **Fichier APK volumineux**
- **Fichier** : `WeSplit-Development.apk` (99MB)
- **Statut** : ⚠️ **NON BLOQUANT** mais à éviter

## 🔍 Fichiers Sensibles Identifiés

### Fichiers avec API Keys hardcodées :
- `src/services/moonpaySDKService.ts` - Clés MoonPay live
- `src/services/moonpayService.ts` - Clés MoonPay live  
- `src/config/moonpay.ts` - Clés MoonPay live
- `eas.json` - Clés Firebase API

### Fichiers de configuration sensibles :
- `backend/config/firebase-admin.js` - Référence au fichier JSON Firebase

## ✅ Actions Déjà Effectuées

1. **`.gitignore` mis à jour** avec :
   - Règles pour tous les fichiers sensibles
   - Patterns pour Firebase Admin SDK
   - Exclusion des fichiers APK
   - Protection des fichiers d'environnement

2. **Fichier `.env.example` existant** avec placeholders

## 🚧 Actions Restantes

### Phase 1 : Nettoyage Immédiat (AVANT de faire un nouveau commit)
1. **Supprimer le fichier JSON Firebase** de l'historique
2. **Nettoyer les clés hardcodées** dans le code
3. **Vérifier qu'aucun fichier .env** n'est commité

### Phase 2 : Nettoyage de l'Historique (AVEC git filter-repo)
1. **Installer git-filter-repo**
2. **Exécuter les commandes de nettoyage**
3. **Force push** de la branche nettoyée

## 🛠️ Commandes de Nettoyage

### Installation de git-filter-repo
```bash
# macOS
brew install git-filter-repo

# Ou via pip
pip3 install git-filter-repo
```

### Nettoyage des secrets
```bash
# Supprimer le fichier Firebase Admin SDK
git filter-repo --path "backend/wesplit-35186-firebase-adminsdk-fbsvc-2b1bb8a520.json" --invert-paths --force

# Supprimer le fichier APK
git filter-repo --path "WeSplit-Development.apk" --invert-paths --force

# Supprimer tous les fichiers .env
git filter-repo --path ".env" --invert-paths --force
git filter-repo --path ".env.production" --invert-paths --force
git filter-repo --path ".env.development" --invert-paths --force
```

## 📝 Instructions pour les Développeurs

### AVANT de commiter :
1. Vérifier que `.env` est dans `.gitignore`
2. Vérifier qu'aucune clé API n'est hardcodée
3. Utiliser des variables d'environnement

### Variables d'environnement à utiliser :
```bash
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your_key_here

# MoonPay
MOONPAY_API_KEY=your_key_here
MOONPAY_SECRET_KEY=your_secret_here

# Stripe
STRIPE_SECRET_KEY=your_key_here
STRIPE_PUBLISHABLE_KEY=your_key_here
```

## ⚠️ AVERTISSEMENTS

- **NE PAS** faire de nouveau commit avant le nettoyage
- **NE PAS** supprimer les fichiers du projet (seulement de l'historique Git)
- **TOUJOURS** utiliser des variables d'environnement
- **VÉRIFIER** le `.gitignore` avant chaque commit

## 🔗 Ressources

- [GitHub Secrets Detection](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- [Firebase Security Best Practices](https://firebase.google.com/docs/projects/api-keys)
