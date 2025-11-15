# Partnership Documentation Structure

This folder follows a reusable structure for partnership integrations. This allows you to duplicate this structure for future partnerships.

## Structure Overview

```
FOR_SPEND/
├── README.md                          # Partnership introduction
├── SUMMARY.md                         # GitBook navigation
├── EXTERNAL_WEB_APP_TECHNICAL_INTEGRATION.md  # Main integration guide
├── INTEGRATION_CHECKLIST.md           # Implementation checklist
├── book.json                          # GitBook config
├── .gitbook.yml                       # GitBook config (alternative)
├── GITBOOK_SETUP.md                   # Setup instructions
└── .gitignore                         # Build files
```

## For Future Partnerships

To create documentation for a new partnership:

1. **Duplicate this folder structure**
   ```bash
   cp -r FOR_SPEND FOR_PARTNER_NAME
   ```

2. **Update partnership-specific content:**
   - Replace "spend" with partner name in all files
   - Update `book.json` title: "WeSplit X [Partner] Documentation"
   - Update examples to match partner's use case
   - Update README.md with partner-specific introduction

3. **Keep the same structure:**
   - Same file organization
   - Same SUMMARY.md structure (update content, keep structure)
   - Same GitBook configuration

4. **Create separate GitBook space:**
   - Each partnership gets its own GitBook space
   - Keeps documentation organized and partner-specific
   - Allows different access permissions per partner

## Files to Customize Per Partnership

### Required Updates:
- `README.md` - Partnership introduction
- `book.json` - Title and description
- `.gitbook.yml` - Title and description
- `EXTERNAL_WEB_APP_TECHNICAL_INTEGRATION.md` - Update examples and use cases
- `INTEGRATION_CHECKLIST.md` - Update partner-specific requirements

### Keep As-Is:
- `SUMMARY.md` - Structure (update content, keep structure)
- `GITBOOK_SETUP.md` - Setup instructions (update title references)
- `.gitignore` - Build files

## GitBook Organization

### Recommended Structure:
```
WeSplit Documentation (Main)
├── WeSplit X Spend Documentation (Partnership Space)
├── WeSplit X Partner2 Documentation (Partnership Space)
└── WeSplit X Partner3 Documentation (Partnership Space)
```

Each partnership space is:
- **Separate** from main documentation
- **Private** to the specific partner
- **Reusable** structure for easy duplication

---

**Last Updated**: 2024

