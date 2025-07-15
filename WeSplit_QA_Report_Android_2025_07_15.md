
# 🧪 QA Report - WeSplit Android Testing

**Date:** 2025-07-15  
**Tester:** [Your Name]  
**Platform:** Android  
**Environment:** Development / Expo (Local Backend)  
**Device:** Emulator / Physical Device

---

## 🔍 General Observations

| Area             | Issue                                                                 | Suggestion                                                                 |
|------------------|------------------------------------------------------------------------|----------------------------------------------------------------------------|
| Email Mockup     | Uses `temp_wallet_xxx` instead of a real wallet                        | Ensure MWA wallet creation is triggered on signup                          |
| Navbar Icons     | Icons are not vertically centered                                      | Adjust layout styles: `alignItems` / `justifyContent`                     |
| Dashboard Layout | UI not aligned with mockups                                            | Use design tokens and Figma reference to update spacing/margins           |

---

## 🔁 API Issues & Rate Limits

| Component          | Issue                                                               | Suggestion                                                                |
|--------------------|----------------------------------------------------------------------|---------------------------------------------------------------------------|
| Group Details      | Infinite requests → rate limit (`/api/groups/:id`)                  | Debounce refresh or cache group data                                     |
| Invite Link (QR)   | Fails due to rate limit                                              | Disable button during cooldown / debounce API call                        |
| Contacts List      | Errors loading user contacts                                         | Cache or backoff logic on 429 response                                    |
| Wallet Info        | API fails fetching wallet repeatedly                                 | Throttle requests and delay wallet fetch until authentication is complete |

---

## ❌ Broken Features

| Feature               | Bug                                                               | Suggestion                                                               |
|------------------------|--------------------------------------------------------------------|--------------------------------------------------------------------------|
| Add Expense            | Can't create expense via group page                               | Check form submission and group context                                  |
| Settlement Screen      | Missing background and incorrect layout                           | Review screen hierarchy and styling                                      |
| Group Settings         | Invite link generation fails                                      | Implement retry logic and user feedback on failure                       |

---

## 🔐 Authentication & Wallet Flow

| Flow             | Issue                                                                 | Suggestion                                                                |
|------------------|------------------------------------------------------------------------|----------------------------------------------------------------------------|
| Signup/Login     | Returns temp wallet instead of real MWA wallet                         | Trigger wallet onboarding on first login                                  |
| Profile          | Wallet data fails to load due to API limits                            | Delay fetch until MWA is ready + throttle requests                        |
| Verification     | Email flow works correctly                                             | ✅ No issue here                                                           |

---

## 🧠 Cursor Prompt

```
Audit and fix the following issues from a QA test on Android:

1. Group API (`/api/groups/:id`) spams server repeatedly — implement debounce or caching
2. Add a retry throttle for any endpoint that throws a 429 'Too many requests' error
3. Fix navbar icons: not centered on Android
4. Realign Dashboard screen layout to match mockup from design tokens
5. Fix inability to create expense from Group page (ensure correct navigation context and state)
6. Add proper wallet creation via MWA on signup — current profile shows temp wallet address
7. Fix broken styling for Settlement screen (missing background, bad hierarchy)
8. Fix invite link + QR generation failures (debounce button + error UI)
9. Fix contact list loading (handle rate limiting gracefully)
10. Fix wallet load loop in profile (trigger wallet only after authentication + MWA ready)

Include a summary of where async logic should be wrapped with retry, debounce, or state-based caching. Provide inline fixes.
```

---

**Next Steps:**
- [ ] Validate all listed fixes on both Android and iOS
- [ ] Add logging and crash reporting (e.g., Sentry)
- [ ] Create Detox tests for group + wallet workflows
