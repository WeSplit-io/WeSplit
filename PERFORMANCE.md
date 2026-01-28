### Performance & Memory Playbook

This document tracks the main high-impact scenarios, metrics, and guardrails for
performance and OOM (out-of-memory) risk in the WeSplit mobile app.

It focuses on **shared wallet** flows and **split** flows, which combine heavy
Firestore usage, real-time listeners, and potentially large in-memory lists.

---

### 1. OOM / High-Memory Reproduction Scenarios

Use these concrete end-to-end flows when testing changes that touch shared
wallets or splits.

- **Shared wallet – large history**
  - Create or use a shared wallet with at least ~100 historical funding /
    withdrawal / transfer transactions.
  - Flow:
    - Launch the app in **development** mode.
    - Navigate `Dashboard → SplitsList (shared wallets tab) → SharedWalletDetails`.
    - Leave the details screen open and trigger a few more funding /
      withdrawal operations from a second device or account.
    - Observe whether the app slows down, the JS heap grows continuously, or
      the dev build terminates with an OOM.

- **Shared wallet – navigation churn**
  - Flow:
    - With the same large-history wallet:
      - Rapidly switch between `SplitsList` and `SharedWalletDetails` for the
        same wallet.
      - Open a different shared wallet, then return.
    - Watch for:
      - Increasing load time when re-opening the wallet.
      - Memory steadily increasing in Xcode/Android Studio or via dev logs.

- **Split details – large split with many participants/items**
  - Use a split with:
    - 20–50+ participants, and/or
    - 50–200+ line items.
  - Flow:
    - Open `SplitDetailsScreen` from:
      - `ManualBillCreation → Confirm → SplitDetails`, and
      - `SplitsList → existing split → SplitDetails`.
    - Let other users update the split in real time (accepting, paying, etc.).
    - Keep the screen open for several minutes.
    - Observe CPU, responsiveness, and whether memory grows without coming back
      down when leaving the screen.

- **Split settlement / payment flows**
  - Flow:
    - On a large split, run the settlement / payment flow that computes
      optimized transactions and/or triggers multiple blockchain transactions.
    - Verify that:
      - The JS thread remains responsive.
      - No sudden spikes in memory or crashes occur when clicking “Settle” or
        confirming payments.

---

### 2. Baseline Dev vs Release Behavior

For each of the scenarios above, run **both**:

- A **development build** (Metro / Expo, with dev logging enabled).
- A **release / production build** on the same physical device.

Record for each scenario:

- Device model + OS.
- Whether the app:
  - Remains stable.
  - Shows noticeable slowdowns / jank.
  - Terminates or shows an OOM / “app stopped” message.

This helps differentiate:

- **Dev-only issues** (often due to heavy logging and extra dev tooling).
- **True production risks** that must be addressed before shipping.

Store short notes from these runs in this file or your internal docs so future
changes can be compared against a known baseline.

---

### 3. Metrics & Instrumentation Helpers

To keep instrumentation lightweight and centralized, use a shared helper under
`src/utils/performance` for any counters or timing metrics you need in hot
paths (e.g. split details, shared wallet details).

Guidelines:

- Gate all metrics behind `__DEV__` and a simple feature flag (for example
  `ENABLE_PERF_METRICS`).
- Prefer **small numeric counters and simple summaries** (e.g. counts, max
  lengths) over logging entire objects or arrays.
- Avoid any instrumentation that significantly allocates memory or blocks the
  UI thread.

Example metric types:

- Number of shared wallet transactions loaded for a given wallet ID.
- Number of concurrent Firestore listeners attached to a given screen.
- Maximum number of split participants/items seen during a session.

These metrics should stay **non-critical** (the app must behave identically
whether metrics are enabled or not) and can be expanded over time as new
performance questions arise.

---

### 4. Validation & Regression Workflow

To avoid regressions and keep OOM risk low over time:

- **Before a change** touching shared wallet or split flows:
  - Run the relevant scenarios from section 1 on a dev build.
  - Optionally, enable `ENABLE_PERF_METRICS` and capture a quick snapshot of
    counts (e.g. max transaction count, listener count).
  - Note any crashes, visible jank, or unusually high counts.

- **After the change**:
  - Re-run the exact same scenarios on both dev and release builds.
  - Confirm that:
    - The app no longer crashes or worsens in memory usage.
    - Large lists (transactions, participants, items) stay responsive.
    - Metrics (when enabled) show bounded values (e.g. ≤100 transactions in
      memory for shared wallets).

- **During code review**:
  - Check that new Firestore listeners always:
    - Apply server-side limits where possible.
    - Keep only a bounded number of items in state.
  - Ensure any new lists rendering dynamic data use `FlatList`/`SectionList`
    rather than `map` over large arrays.
  - Avoid adding logs that print whole arrays or deep objects in hot paths.

These steps should be followed whenever modifying:

- Shared wallet flows (`SharedWalletDetailsScreen`, shared wallet hooks/services).
- Split flows (`SplitDetailsScreen`, split realtime hooks, settlement/optimizer).
- Backend endpoints that serve transaction or split histories.

---

### 5. Dev vs Production Bundler Settings

Because the codebase pulls in large dependencies (Solana SDK, Firebase,
analytics, etc.), Metro / Node can become memory-heavy during development,
especially when repeatedly touching hot paths like
`src/services/shared/transactionPostProcessing.ts`.

Recommended workflows:

- **Day-to-day development**
  - Start Metro with the default dev settings (no forced `NODE_ENV=production`),
    e.g. via `npm run start` (which already sets a safe but bounded Node heap
    for Metro) or `npx expo start`.
  - Use the in-app dev menu / fast refresh for quick iteration.

- **Production-like device testing**
  - Build a true release binary instead of running Metro in prod mode:
    - iOS: `expo run:ios --configuration Release`
    - Android: `expo run:android --variant release`
  - Use this build to validate OOM behavior and performance on real devices.

- **If Metro still hits OOM on your machine**
  - Optionally increase Node’s heap limit only for bundler commands, for
    example by setting:
  - `NODE_OPTIONS=--max_old_space_size=4096`
  - Apply this only to local dev scripts and monitor that it does not hide
    real app-level leaks (JS on device is still bounded independently of
    Metro’s heap).

#### 5.1 Dev Bundle Safe Mode

When you only need to validate on-chain behavior (e.g. shared wallet withdraw /
funding under load) and not reward/post-processing behavior, you can enable a
**DEV_BUNDLE_SAFE_MODE** flag to aggressively skip non-critical heavy modules
in development:

- Add `DEV_BUNDLE_SAFE_MODE=true` to your local `.env` file (do **not** commit
  this to production templates).
- In this mode, split and shared wallet flows continue to skip
  `transactionPostProcessing` entirely (as implemented in
  `ConsolidatedTransactionService.sendUSDCTransaction`), which prevents Metro
  from loading ~675 extra modules.
- This flag must never affect production builds; release builds should behave
  exactly as before and always run full post-processing.

If you still see Metro OOMs with `DEV_BUNDLE_SAFE_MODE=true`, use the Node heap
guarded scripts in `package.json` (`start`, `clear`, `clean-cache`) which are
already configured with `NODE_OPTIONS='--max-old-space-size=8192'` only for
bundler commands.

---

### 6. Shared Wallet Withdrawal & Stress Test Checklist

Use this checklist when validating changes related to shared wallet flows:

- **Single-withdrawal flow**
  - From `SplitsList` → `SharedWalletDetails`:
    - Open the shared wallet with a non-trivial history (10–50+ tx).
    - Tap **Withdraw**, set a small amount, and confirm.
    - Verify:
      - The modal shows clear success on the first attempt (no need to retry).
      - The shared wallet balance and transaction history update within a few
        seconds without navigating away.
      - No `wallet ID missing` or VirtualizedList/ScrollView warnings appear in
        the Metro logs while the screen is visible.

- **Back-to-back funding/withdrawals**
  - On the same shared wallet, perform several funding and withdrawal
    operations in a row in one session.
  - Verify:
    - The UI remains responsive and scroll performance in the details screen
      stays smooth.
    - The main FlatList is the only vertical scroller (no nested ScrollView +
      FlatList warnings).
    - Metro/Node memory (as seen in Activity Monitor or `top`) remains stable
      and does not grow without bound.

- **Regression notes**
  - After running the scenarios above, add a short note to this file (date,
    branch/commit, device used) indicating:
    - Whether any warnings or OOMs were seen.
    - Whether the user experience felt “first-try reliable” for withdrawals.
  - Re-run this checklist after any substantive change to:
    - `SharedWalletDetailsScreen`
    - `CentralizedTransactionModal`
    - `SharedWalletService` transaction-related methods



