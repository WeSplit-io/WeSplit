# Building GitBook Locally

## Issue with GitBook CLI

The old GitBook CLI (gitbook-cli) has compatibility issues with Node.js v18+. 

## Solution: Use GitBook.com Directly

**Recommended**: Upload files directly to GitBook.com - it will work perfectly!

### Steps:
1. Go to [gitbook.com](https://www.gitbook.com)
2. Create new Space
3. Upload these files:
   - `SUMMARY.md` (fixed version)
   - `README.md`
   - `EXTERNAL_WEB_APP_TECHNICAL_INTEGRATION.md`
   - `INTEGRATION_CHECKLIST.md`
4. GitBook.com will automatically:
   - Parse SUMMARY.md for navigation
   - Generate anchor links from headings
   - Build the documentation site

## Alternative: Use Modern GitBook CLI

If you want to test locally, use the modern GitBook CLI:

```bash
# Install modern GitBook CLI
npm install -g @gitbook/cli

# Build
cd docs/guides/SPEND_INTEGRATION/FOR_SPEND
gitbook build

# Serve locally
gitbook serve
```

## Fixed SUMMARY.md

The SUMMARY.md has been updated with correct anchor links that match the actual headings in the documentation.

---

**Note**: GitBook.com web interface is the easiest and most reliable method. The CLI is optional.

