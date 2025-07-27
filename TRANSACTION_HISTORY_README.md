# Transaction History Feature

## Vue d'ensemble

Cette fonctionnalité ajoute un historique complet des transactions avec filtrage et modal de détails.

## Fonctionnalités

### 1. Écran d'historique des transactions (`TransactionHistoryScreen`)

- **Navigation** : Accessible depuis le Dashboard via "See all" dans la section Transactions
- **Filtrage** : 3 onglets pour filtrer les transactions :
  - **All** : Toutes les transactions
  - **Income** : Revenus (receive, deposit)
  - **Expenses** : Dépenses (send, withdraw)
- **Design** : Cards avec le même design que les sections transactions
- **Pull-to-refresh** : Actualisation des données
- **État vide** : Illustration avec message quand aucune transaction

### 2. Modal de détails des transactions (`TransactionModal`)

- **Déclenchement** : Clic sur une transaction dans l'historique
- **Informations affichées** :
  - Montant et devise
  - Date et heure
  - Destinataire/Expéditeur
  - Note/Description
  - ID de transaction
  - On-chain ID (hash)
  - Lien vers Solscan
  - Frais de transaction
  - Statut (Completed, Pending, Failed)

### 3. Composant réutilisable (`TransactionItem`)

- **Réutilisable** : Peut être utilisé dans différentes parties de l'app
- **Personnalisable** : Option pour afficher/masquer l'heure
- **Callback** : Fonction onPress optionnelle

## Structure des fichiers

```
src/
├── screens/
│   └── TransactionHistory/
│       ├── TransactionHistoryScreen.tsx
│       ├── styles.ts
│       └── index.tsx
├── components/
│   ├── TransactionModal.tsx
│   └── TransactionItem.tsx
└── services/
    └── firebaseDataService.ts (service existant)
```

## Types de transactions supportés

- **send** : Envoi d'argent
- **receive** : Réception d'argent
- **deposit** : Dépôt/Top-up
- **withdraw** : Retrait

## Navigation

```typescript
// Depuis le Dashboard
navigation.navigate('TransactionHistory');

// Depuis n'importe où dans l'app
navigation.navigate('TransactionHistory');
```

## Utilisation du composant TransactionItem

```typescript
import TransactionItem from '../components/TransactionItem';

<TransactionItem
  transaction={transaction}
  onPress={(transaction) => {
    // Ouvrir le modal ou naviguer
  }}
  showTime={true} // optionnel, par défaut true
/>
```

## Styles et thème

- **Couleurs** : Utilise le système de couleurs existant
- **Design** : Cohérent avec le reste de l'app
- **Dark theme** : Support complet du thème sombre
- **Responsive** : Adapté aux différentes tailles d'écran

## Intégration avec Firebase

- **Service** : Utilise `firebaseTransactionService.getUserTransactions()`
- **Structure** : Compatible avec la structure existante des transactions
- **Performance** : Chargement optimisé avec pagination possible

## Test

Pour tester avec des données de test :

```bash
node test-transactions.js
```

Cela ajoutera 4 transactions de test à Firebase pour tester l'interface.

## Améliorations futures possibles

1. **Pagination** : Chargement par pages pour les gros volumes
2. **Recherche** : Filtrage par texte
3. **Export** : Export des transactions en CSV/PDF
4. **Notifications** : Notifications push pour nouvelles transactions
5. **Graphiques** : Visualisation des dépenses/revenus
6. **Catégories** : Catégorisation des transactions
7. **Filtres avancés** : Par date, montant, statut 