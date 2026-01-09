# SPEND Integration Documentation

> **📖 For SPEND Partners:** [**SPEND_INTEGRATION_GUIDE.md**](../../SPEND_INTEGRATION_GUIDE.md)

---

## Documentation Structure

```
docs/
├── SPEND_INTEGRATION_GUIDE.md      ← 📖 Single doc for SPEND team
│
└── guides/SPEND_INTEGRATION/
    ├── README.md                   ← You are here (internal)
    ├── SPEND_SPLITS_COMPLETE_LOGIC.md     ← Internal: backend logic
    └── SPEND_SPLITS_END_TO_END_AUDIT.md   ← Internal: security audit
```

---

## For SPEND Team

**Use only:** [`docs/SPEND_INTEGRATION_GUIDE.md`](../../SPEND_INTEGRATION_GUIDE.md)

Contains everything needed:
- ✅ All API endpoints with examples
- ✅ Webhook documentation
- ✅ Authentication & error handling
- ✅ Testing commands

---

## For WeSplit Team (Internal)

| File | Purpose |
|------|---------|
| `SPEND_SPLITS_COMPLETE_LOGIC.md` | Complete backend logic flow |
| `SPEND_SPLITS_END_TO_END_AUDIT.md` | Security and data flow audit |

### Code References

| Component | Location |
|-----------|----------|
| Firebase Functions | `services/firebase-functions/src/spendApiEndpoints.js` |
| Integration Services | `src/services/integrations/spend/` |
| Test Scripts | `services/firebase-functions/test-spend-endpoints.js` |

---

**Status:** ✅ Production Ready
