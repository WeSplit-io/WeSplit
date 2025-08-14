# 🚀 INSTRUCTIONS RAPIDES - Nettoyage des Secrets WeSplit

## ⚡ **NETTOYAGE EN 3 ÉTAPES**

### **ÉTAPE 1 : Exécuter le Script Automatisé**
```bash
./cleanup-secrets.sh
```

### **ÉTAPE 2 : Nettoyer l'Historique Git**
```bash
# Installer git-filter-repo
brew install git-filter-repo  # macOS
# ou
pip3 install git-filter-repo  # Linux/Windows

# Nettoyer l'historique
git filter-repo --path "backend/wesplit-35186-firebase-adminsdk-fbsvc-2b1bb8a520.json" --invert-paths --force
git filter-repo --path ".env" --invert-paths --force
git filter-repo --path "WeSplit-Development.apk" --invert-paths --force
```

### **ÉTAPE 3 : Force Push**
```bash
git push --force-with-lease origin <votre-branche>
```

## 🔒 **CE QUI A ÉTÉ FAIT**

- ✅ Tous les secrets identifiés et protégés
- ✅ Code nettoyé des clés hardcodées
- ✅ .gitignore sécurisé et complet
- ✅ Scripts de nettoyage automatisés
- ✅ Documentation complète

## 📋 **FICHIERS CRÉÉS/MODIFIÉS**

- `SECRETS_CLEANUP_README.md` - Guide complet
- `SECRETS_CLEANUP_SUMMARY.md` - Résumé des actions
- `VERIFICATION_FINALE.md` - Vérification de sécurité
- `cleanup-secrets.sh` - Script automatisé
- `.gitignore` - Règles de sécurité
- Code nettoyé des clés hardcodées

## ⚠️ **IMPORTANT**

- **NE PAS** faire de nouveau commit avant le nettoyage
- **EXÉCUTER** le script `./cleanup-secrets.sh` en premier
- **SUIVRE** les instructions dans `SECRETS_CLEANUP_README.md`

---

**🎯 Votre projet est prêt pour le nettoyage final !**
