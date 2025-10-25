# Test Firebase Avatar Upload - Guide

## 🎯 Objectif

Tester que les avatars sont maintenant uploadés vers Firebase Storage au lieu d'être stockés localement.

## 🔧 Changements apportés

### AvatarUploadService amélioré

1. **Suppression du workaround temporaire** qui retournait les URLs locales
2. **Utilisation d'expo-file-system** pour lire les fichiers locaux correctement
3. **Conversion base64 → blob** pour l'upload vers Firebase Storage
4. **Gestion d'erreur robuste** avec messages explicites

### Code modifié

```typescript
// Avant (workaround temporaire)
if (imageUri.startsWith('file://')) {
  return {
    success: true,
    avatarUrl: imageUri, // ❌ URL locale
  };
}

// Après (vrai upload Firebase)
if (imageUri.startsWith('file://')) {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const blob = new Blob([byteArray], { type: 'image/jpeg' });
  // Upload vers Firebase Storage
}
```

## 🧪 Tests à effectuer

### Test 1: Mise à jour d'avatar

1. **Ouvrir l'app** et aller dans Profile → Account Info
2. **Sélectionner une nouvelle photo** depuis la galerie
3. **Appuyer sur Save**
4. **Vérifier dans les logs** que l'upload Firebase s'effectue
5. **Vérifier que l'URL** commence par `https://firebasestorage.googleapis.com/`

### Test 2: Vérification de l'URL

Après la mise à jour, l'avatar devrait avoir une URL comme :
```
https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/avatars%2F[userId]%2Fprofile.jpg?alt=media&token=[token]
```

Au lieu de :
```
file:///Users/pmilaalonso/Library/Developer/CoreSimulator/...
```

### Test 3: Affichage sur Dashboard

1. **Retourner au Dashboard**
2. **Vérifier que l'avatar s'affiche** correctement
3. **Vérifier que l'avatar persiste** après redémarrage de l'app

### Test 4: Avatars des autres utilisateurs

1. **Créer une demande de paiement** avec un autre utilisateur
2. **Vérifier que l'avatar de l'expéditeur** s'affiche dans RequestCard
3. **Vérifier que l'avatar est fetché** dynamiquement depuis Firebase

## 🔍 Logs à surveiller

### Logs de succès
```
✅ AvatarUploadService: Starting avatar upload for user
✅ AvatarUploadService: Successfully converted local file to blob
✅ AvatarUploadService: Upload completed, getting download URL
✅ AvatarUploadService: Avatar uploaded successfully
```

### Logs d'erreur possibles
```
❌ AvatarUploadService: Failed to read local file
❌ AvatarUploadService: Unable to read local file. Please try selecting the image again.
```

## 🚨 Problèmes potentiels

### 1. Permissions Firebase Storage
Si vous voyez une erreur `unauthorized`, vérifiez que :
- Les règles Firebase Storage sont déployées
- L'utilisateur est authentifié
- L'utilisateur a le bon UID

### 2. Fichier local inaccessible
Si vous voyez `Unable to read local file` :
- Réessayez de sélectionner l'image
- Vérifiez que l'image n'est pas corrompue
- Redémarrez l'app si nécessaire

### 3. Taille de fichier
Les gros fichiers peuvent prendre du temps à uploader :
- Surveillez les logs pour le progrès
- Attendez la confirmation de succès

## ✅ Critères de succès

1. **URL Firebase** : L'avatar a une URL Firebase Storage
2. **Persistance** : L'avatar reste affiché après redémarrage
3. **Partage** : Les autres utilisateurs voient l'avatar
4. **Performance** : Upload rapide et fiable

## 🔄 Rollback si nécessaire

Si des problèmes surviennent, vous pouvez temporairement revenir au workaround :

```typescript
// Dans avatarUploadService.ts, ligne 37
if (imageUri.startsWith('file://')) {
  logger.warn('Using local URI temporarily', null, 'avatarUploadService');
  return {
    success: true,
    avatarUrl: imageUri, // URL locale temporaire
  };
}
```

Mais l'objectif est d'avoir une solution robuste avec Firebase Storage ! 🎉
