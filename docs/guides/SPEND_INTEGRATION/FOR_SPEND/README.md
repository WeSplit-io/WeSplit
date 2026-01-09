# WeSplit × SPEND Integration

> ⚠️ **IMPORTANT**: This documentation has been consolidated.  
> **Please use the single source of truth:** [`docs/SPEND_INTEGRATION_GUIDE.md`](../../../SPEND_INTEGRATION_GUIDE.md)

---

## 📖 Primary Documentation

### **[SPEND Integration Guide](../../../SPEND_INTEGRATION_GUIDE.md)** ⭐

This is your **complete, up-to-date integration guide**. It includes:

- ✅ All API endpoints with request/response examples
- ✅ Webhook documentation (both directions)
- ✅ Authentication setup
- ✅ Error handling
- ✅ Testing commands
- ✅ Integration flow diagram

**Base URL**: `https://us-central1-wesplit-35186.cloudfunctions.net`

---

## 🚀 Quick Start

```bash
# Test your API key
curl -X GET "https://us-central1-wesplit-35186.cloudfunctions.net/searchKnownUsers?query=test&limit=5" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 📞 Support

- **Technical Questions**: vcharles@dappzy.io
- **API Documentation**: [`docs/SPEND_INTEGRATION_GUIDE.md`](../../../SPEND_INTEGRATION_GUIDE.md)

---

## 📁 Archive Notice

The files in this folder are **archived** and may be outdated. The following have been consolidated into the main guide:

| Old File | Status |
|----------|--------|
| `SPEND_API_REFERENCE.md` | ➡️ Merged into main guide |
| `SPEND_INTEGRATION_QUICK_REFERENCE.md` | ➡️ Merged into main guide |
| `EXTERNAL_WEB_APP_TECHNICAL_INTEGRATION.md` | ➡️ Merged into main guide |
| `INTEGRATION_CHECKLIST.md` | ➡️ Merged into main guide |
| `DEEP_LINK_*.md` | ➡️ Archived (deep links now standard) |

**Always refer to [`docs/SPEND_INTEGRATION_GUIDE.md`](../../../SPEND_INTEGRATION_GUIDE.md) for the latest information.**

---

**Last Updated**: January 2025