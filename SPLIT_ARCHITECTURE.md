### Split Architecture Overview

This document summarizes how split-related logic is structured and where new code should plug in.

### 1. Public Facade: `SplitWalletService`

- **Location**: `src/services/split/index.ts`
- **Responsibility**: Single entry point for all **split wallet** operations:
  - Creation & management: `createSplitWallet`, `createDegenSplitWallet`, `updateSplitWallet`, `updateSplitWalletParticipants`, `lockSplitWallet`, etc.
  - Payments & settlement: `processParticipantPayment`, `payParticipantShare`, `extractFairSplitFunds`, degen payouts, fund locking, verification, reconciliation.
  - Security & keys: `storeSplitWalletPrivateKey*`, `getSplitWalletPrivateKey*`, `hasLocalPrivateKey*`, `cleanupOldPrivateKeys`, creator checks.
  - Queries & completion: `getSplitWallet`, `getSplitWalletByBillId`, `getSplitWalletCompletion`, existence/creator/status helpers.
  - Synchronization: `syncSplitStatusFromSplitWalletToSplitStorage`, `syncAllParticipantsFromSplitWalletToSplitStorage`.
  - Cleanup: `cancelSplitWallet`, `completeSplitWallet`, `burnSplitWalletAndCleanup`.

**Guideline**: UI screens, hooks, and non-`split/` services should call only this facade for wallet-related work, never `SplitWalletPayments`, `SplitWalletManagement`, `SplitWalletSecurity`, etc. directly.

### 2. Layers and Responsibilities

- **`src/services/split/*` (wallet / Solana-facing layer)**:
  - Modular services:
    - `SplitWalletCreation`, `SplitWalletManagement`, `SplitWalletPayments`, `SplitWalletSecurity`,
      `SplitWalletCleanup`, `SplitWalletAtomicUpdates`, `SplitWalletCache`, `SplitDataSynchronizer`,
      `SplitValidationService`, `SplitRouletteService`, handlers under `handlers/`.
  - These are **internal implementation details** behind `SplitWalletService`.
  - They are the only place that should touch:
    - Solana RPC / SPL token clients (via shared transaction/memory helpers).
    - Low-level wallet mutation details, atomic updates, and roulette internals.

- **`src/services/splits/*` (Firestore storage + invitations + realtime layer)**:
  - `SplitStorageService`: CRUD for `splits` collection, pagination, participant updates, delete.
  - `splitRealtimeService`: Firestore `onSnapshot` listeners for splits.
  - `splitInvitationService`: QR / link / NFC invitations and join logic.
  - **Interaction with wallets**:
    - Uses `SplitWalletService` for any wallet-side sync or cleanup (e.g. wallet updates on join, deletion).
    - Uses `SplitWalletQueries` only for reading wallet docs when needed.

### 3. Logging & Performance Guardrails

- **Verbose logging flag**:
  - `const ENABLE_VERBOSE_SPLIT_LOGS = __DEV__ && (process.env.ENABLE_VERBOSE_SPLIT_LOGS === '1' || process.env.ENABLE_VERBOSE_SPLIT_LOGS === 'true');`
  - Used in:
    - `src/services/split/SplitWalletQueries.ts`
    - `src/hooks/useSplitDetails.ts`
    - `src/utils/performance/settlementOptimizer.ts`
  - **Rule**: High-frequency or large-payload logs in split flows must be **guarded** by this flag.
- **Payload size**:
  - Do **not** log entire split wallets, participant arrays, or full transaction objects.
  - Log only:
    - IDs (`splitId`, `billId`, `walletId`), counts, and compact samples (e.g. first few participants).

### 4. Adding New Split Features

When adding or extending split functionality:

- **From UI / hooks**:
  - Call `SplitWalletService` for wallet actions.
  - Call `SplitStorageService` for Firestore `splits` data.
  - Use `splitRealtimeService` for realtime subscriptions.
- **In the split layer**:
  - Add new low-level operations in the appropriate `SplitWallet*` module.
  - Expose a single, high-level method on `SplitWalletService` that wraps those operations.
  - Keep Solana/RPC imports centralized and shared (no new top-level `@solana/web3.js` imports).

Following this structure keeps the split stack slimmer, easier to reason about, and safer to extend without reintroducing heavy or duplicated Solana and split logic into the client bundle.

