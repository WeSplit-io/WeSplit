# Avatar Component - Guide d'utilisation

## Vue d'ensemble

Le composant `Avatar` est un composant centralisé pour afficher les avatars des utilisateurs avec un fetch dynamique depuis Firebase Storage. Il gère automatiquement les URLs locales et Firebase Storage, avec un système de cache intelligent.

## Fonctionnalités

- ✅ Fetch dynamique des avatars depuis Firebase Storage
- ✅ Gestion des URLs locales (`file://`) avec upload automatique vers Firebase
- ✅ Cache intelligent pour éviter les requêtes répétées
- ✅ Fallback vers les initiales ou avatar par défaut
- ✅ Support des bordures et styles personnalisés
- ✅ Gestion d'erreur robuste

## Utilisation

### Import

```typescript
import Avatar from '../../components/shared/Avatar';
```

### Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `userId` | `string` | - | ID de l'utilisateur pour fetch dynamique |
| `userName` | `string` | - | Nom de l'utilisateur pour les initiales |
| `size` | `number` | `40` | Taille de l'avatar en pixels |
| `style` | `ViewStyle` | - | Styles personnalisés |
| `textStyle` | `TextStyle` | - | Styles pour les initiales |
| `showBorder` | `boolean` | `false` | Afficher une bordure |
| `borderColor` | `string` | `colors.green` | Couleur de la bordure |
| `avatarUrl` | `string` | - | URL directe de l'avatar (pour compatibilité) |
| `loadingTimeout` | `number` | `5000` | Timeout de chargement en ms |
| `showLoading` | `boolean` | `true` | Afficher l'indicateur de chargement |

### Exemples d'utilisation

#### Avatar avec fetch dynamique (recommandé)

```typescript
<Avatar
  userId="user123"
  userName="John Doe"
  size={50}
  showBorder={true}
/>
```

#### Avatar avec URL directe (compatibilité)

```typescript
<Avatar
  avatarUrl="https://firebasestorage.googleapis.com/..."
  userName="John Doe"
  size={50}
/>
```

#### Avatar avec styles personnalisés

```typescript
<Avatar
  userId="user123"
  userName="John Doe"
  size={60}
  style={{
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }}
  textStyle={{
    color: '#fff',
    fontWeight: 'bold',
  }}
/>
```

## Migration depuis UserAvatar

### Avant (UserAvatar)

```typescript
<UserAvatar
  avatarUrl={user.avatar}
  displayName={user.name}
  style={styles.avatar}
/>
```

### Après (Avatar)

```typescript
<Avatar
  userId={user.id}
  userName={user.name}
  avatarUrl={user.avatar} // Optionnel pour compatibilité
  style={styles.avatar}
/>
```

## Service AvatarService

Le composant utilise le service `AvatarService` qui gère :

- **Cache intelligent** : Évite les requêtes répétées (cache de 5 minutes)
- **Upload automatique** : Convertit les URLs locales vers Firebase Storage
- **Validation des URLs** : Vérifie que les URLs Firebase sont valides
- **Gestion d'erreur** : Fallback robuste en cas d'erreur

### Méthodes du service

```typescript
// Obtenir l'URL de l'avatar
const avatarService = AvatarService.getInstance();
const avatarUrl = await avatarService.getAvatarUrl(userId);

// Précharger plusieurs avatars
await avatarService.preloadAvatars(['user1', 'user2', 'user3']);

// Vider le cache d'un utilisateur
avatarService.clearUserCache(userId);

// Vider tout le cache
avatarService.clearAllCache();

// Obtenir les statistiques du cache
const stats = avatarService.getCacheStats();
```

## Gestion des URLs locales

Le service détecte automatiquement les URLs locales (`file://`) et :

1. Tente d'uploader l'image vers Firebase Storage
2. Met à jour le profil utilisateur avec la nouvelle URL Firebase
3. Retourne l'URL Firebase pour l'affichage
4. En cas d'échec, utilise l'URL locale temporairement

## Performance

- **Cache de 5 minutes** pour éviter les requêtes répétées
- **Limite de cache** de 100 entrées pour éviter la surcharge mémoire
- **Préchargement** possible pour plusieurs utilisateurs
- **Chargement asynchrone** pour ne pas bloquer l'UI

## Dépannage

### Avatar ne s'affiche pas

1. Vérifiez que `userId` est correct
2. Vérifiez les logs pour les erreurs de fetch
3. Vérifiez que Firebase Storage est configuré correctement

### Avatar local ne se convertit pas

1. Vérifiez les règles Firebase Storage
2. Vérifiez que l'utilisateur a les permissions d'upload
3. Vérifiez les logs pour les erreurs d'upload

### Cache problématique

```typescript
// Vider le cache si nécessaire
AvatarService.clearAllCache();
```

## Logs

Le service génère des logs détaillés pour le débogage :

- `AvatarService` : Logs du service
- `Avatar` : Logs du composant

Vérifiez les logs pour diagnostiquer les problèmes.
