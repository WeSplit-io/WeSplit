# Accurate TestFlight Update Test

## The Real Issue

Based on research and your original problem:
- **AsyncStorage PERSISTS** during TestFlight updates (uses NSUserDefaults/SharedPreferences)
- **The real issue**: SecureStore failures in production builds
- **Our fix**: Use Keychain/MMKV as primary (already implemented)

---

## Accurate TestFlight Simulation

### What Actually Happens
1. App updates via TestFlight
2. **Nothing gets cleared automatically**
3. SecureStore might fail (production issue)
4. Wallet recovery should use Keychain/MMKV fallback

### Accurate Test

Instead of clearing AsyncStorage, we should:

1. **Simulate SecureStore Failure**
   - Force Keychain/MMKV usage
   - Test wallet recovery without SecureStore

2. **Test Auth State Restoration**
   - Simulate auth state loss
   - Test wallet recovery after auth ready

3. **Test UserId Change**
   - Simulate userId change
   - Test email-based recovery

---

## Recommendation

**Keep Test 1 as-is for now** (clearing AsyncStorage), but:
- Add note that it's a "worst-case scenario" test
- Add Test 1b: SecureStore failure simulation
- Test on real TestFlight update to verify actual behavior

**Test 2 (App Deletion) is accurate** - Keep as-is.

---

## Action Items

1. ✅ Keep current tests (they test wallet persistence)
2. ⚠️ Add note about AsyncStorage persistence
3. 🔄 Test on real TestFlight update
4. 📝 Document actual behavior observed

