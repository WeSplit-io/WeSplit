#!/bin/bash

# 🚨 SECRETS CLEANUP SCRIPT - WeSplit
# Ce script nettoie automatiquement tous les secrets détectés par GitHub

set -e  # Arrêter le script en cas d'erreur

echo "🔒 Début du nettoyage des secrets WeSplit..."
echo "================================================"

# Vérifier que git-filter-repo est installé
if ! command -v git-filter-repo &> /dev/null; then
    echo "❌ git-filter-repo n'est pas installé"
    echo "📦 Installation..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install git-filter-repo
        else
            echo "❌ Homebrew n'est pas installé. Installez-le d'abord :"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    else
        # Linux/Windows
        if command -v pip3 &> /dev/null; then
            pip3 install git-filter-repo
        elif command -v pip &> /dev/null; then
            pip install git-filter-repo
        else
            echo "❌ pip n'est pas installé. Installez Python d'abord."
            exit 1
        fi
    fi
fi

echo "✅ git-filter-repo est installé"

# Vérifier que nous sommes dans un repo Git
if [ ! -d ".git" ]; then
    echo "❌ Ce répertoire n'est pas un repository Git"
    exit 1
fi

# Vérifier qu'il n'y a pas de changements non commités
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Il y a des changements non commités"
    echo "📝 Committez ou stashez vos changements avant de continuer"
    git status
    exit 1
fi

echo "✅ Aucun changement non commité détecté"

# Sauvegarder la branche actuelle
CURRENT_BRANCH=$(git branch --show-current)
BACKUP_BRANCH="backup-before-secrets-cleanup-$(date +%Y%m%d-%H%M%S)"

echo "📋 Création d'une branche de sauvegarde : $BACKUP_BRANCH"
git checkout -b "$BACKUP_BRANCH"
git checkout "$CURRENT_BRANCH"

echo "🔄 Nettoyage de l'historique Git..."

# Supprimer le fichier Firebase Admin SDK
echo "🗑️  Suppression du fichier Firebase Admin SDK..."
git filter-repo --path "backend/wesplit-35186-firebase-adminsdk-fbsvc-2b1bb8a520.json" --invert-paths --force

# Supprimer le fichier APK
echo "🗑️  Suppression du fichier APK..."
git filter-repo --path "WeSplit-Development.apk" --invert-paths --force

# Supprimer tous les fichiers .env
echo "🗑️  Suppression des fichiers .env..."
git filter-repo --path ".env" --invert-paths --force
git filter-repo --path ".env.production" --invert-paths --force
git filter-repo --path ".env.development" --invert-paths --force
git filter-repo --path ".env.staging" --invert-paths --force

# Supprimer les fichiers de configuration sensibles
echo "🗑️  Suppression des fichiers de configuration sensibles..."
git filter-repo --path "firebase-functions/src/moonpay.js" --invert-paths --force

echo "✅ Nettoyage terminé !"

# Vérifier que les fichiers sensibles ne sont plus trackés
echo "🔍 Vérification que les fichiers sensibles ne sont plus trackés..."
if git ls-files | grep -E "\.(env|json|apk|aab|ipa)" | grep -v "\.gitignore"; then
    echo "⚠️  Attention : Certains fichiers sensibles sont encore trackés"
    git ls-files | grep -E "\.(env|json|apk|aab|ipa)" | grep -v "\.gitignore"
else
    echo "✅ Aucun fichier sensible n'est plus tracké"
fi

echo ""
echo "🎯 PROCHAINES ÉTAPES :"
echo "1. Vérifiez que le .gitignore est à jour"
echo "2. Créez un nouveau fichier .env à partir de env.example"
echo "3. Testez votre application localement"
echo "4. Force push de la branche nettoyée :"
echo "   git push --force-with-lease origin $CURRENT_BRANCH"
echo ""
echo "⚠️  ATTENTION :"
echo "- Toutes les clés exposées doivent être régénérées"
echo "- Le fichier .env ne doit JAMAIS être commité"
echo "- Utilisez toujours des variables d'environnement"
echo ""
echo "🔒 Nettoyage terminé avec succès !"
echo "📋 Branche de sauvegarde créée : $BACKUP_BRANCH"
