# SPEND Integration - Endpoints & Deep Links

**Base URL**: `https://us-central1-wesplit-35186.cloudfunctions.net`  
**API Key**: `wsk_05uyyl_bk27aDC8dOiNh-oInWEtQwS4mKy2EWi3VVYg`  
**Expires**: November 28, 2026

---

## Production Endpoints

| Method | Endpoint | Full URL |
|--------|----------|----------|
| POST | `/createSplitFromPayment` | `https://us-central1-wesplit-35186.cloudfunctions.net/createSplitFromPayment` |
| POST | `/matchUsersByEmail` | `https://us-central1-wesplit-35186.cloudfunctions.net/matchUsersByEmail` |
| POST | `/batchInviteParticipants` | `https://us-central1-wesplit-35186.cloudfunctions.net/batchInviteParticipants` |
| POST | `/inviteParticipantsToSplit` | `https://us-central1-wesplit-35186.cloudfunctions.net/inviteParticipantsToSplit` |
| POST | `/payParticipantShare` | `https://us-central1-wesplit-35186.cloudfunctions.net/payParticipantShare` |
| GET | `/getSplitStatus` | `https://us-central1-wesplit-35186.cloudfunctions.net/getSplitStatus` |
| GET | `/searchKnownUsers` | `https://us-central1-wesplit-35186.cloudfunctions.net/searchKnownUsers` |
| POST | `/spendWebhook` | `https://us-central1-wesplit-35186.cloudfunctions.net/spendWebhook` |

---

## Test Endpoints

| Method | Endpoint | Full URL |
|--------|----------|----------|
| POST | `/testCreateSplitFromPayment` | `https://us-central1-wesplit-35186.cloudfunctions.net/testCreateSplitFromPayment` |
| POST | `/mockSpendWebhook` | `https://us-central1-wesplit-35186.cloudfunctions.net/mockSpendWebhook` |
| GET | `/getSpendWebhookFormat` | `https://us-central1-wesplit-35186.cloudfunctions.net/getSpendWebhookFormat` |

---

## Deep Links

### View Split (SPEND → WeSplit)
**App Scheme:**
```
wesplit://view-split?splitId={splitId}&userId={userId}
```

**Universal Link:**
```
https://wesplit-deeplinks.web.app/view-split?splitId={splitId}&userId={userId}
```

### Return to SPEND (WeSplit → SPEND)
**App Scheme:**
```
wesplit://spend-callback?callbackUrl={encodedUrl}&orderId={orderId}&status={status}
```

**Universal Link:**
```
https://wesplit-deeplinks.web.app/spend-callback?callbackUrl={encodedUrl}&orderId={orderId}&status={status}
```

**Parameters:**
- `callbackUrl` - Your SPEND callback URL (URL encoded)
- `orderId` - SPEND order ID (optional)
- `status` - `success`, `error`, or `cancelled` (optional, defaults to `success`)
