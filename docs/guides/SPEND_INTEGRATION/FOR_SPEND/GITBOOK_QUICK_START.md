# GitBook Quick Start - Files to Upload

## ✅ Required Files for GitBook

When creating your GitBook space, you need to upload these files:

### Essential Files (Required)
1. **SUMMARY.md** - Table of contents/navigation structure
2. **README.md** - Landing page/introduction
3. **EXTERNAL_WEB_APP_TECHNICAL_INTEGRATION.md** - Main integration guide
4. **INTEGRATION_CHECKLIST.md** - Implementation checklist

### Optional Files (Nice to Have)
- **book.json** - GitBook configuration (optional, GitBook will use defaults)
- **.gitbook.yml** - Alternative GitBook configuration (optional)

### Files NOT to Upload (Internal Only)
- **GITBOOK_SETUP.md** - Setup instructions (for your reference)
- **PARTNERSHIP_STRUCTURE.md** - Structure guide (for your reference)

---

## 📤 How to Upload to GitBook

### Option 1: Import from GitHub (Recommended)
1. Go to [gitbook.com](https://www.gitbook.com)
2. Create new Space
3. Choose "Import from GitHub"
4. Select your repository
5. Select the `docs/guides/SPEND_INTEGRATION/FOR_SPEND` folder
6. GitBook will automatically detect `SUMMARY.md` and `README.md`

### Option 2: Upload Files Manually
1. Create new Space in GitBook
2. Upload these files in this order:
   - `SUMMARY.md` (GitBook will use this for navigation)
   - `README.md` (will be the landing page)
   - `EXTERNAL_WEB_APP_TECHNICAL_INTEGRATION.md`
   - `INTEGRATION_CHECKLIST.md`
3. GitBook will automatically organize based on `SUMMARY.md`

---

## ✅ Verification Checklist

Before uploading, verify:
- [x] `SUMMARY.md` exists and references all files correctly
- [x] `README.md` exists
- [x] `EXTERNAL_WEB_APP_TECHNICAL_INTEGRATION.md` exists
- [x] `INTEGRATION_CHECKLIST.md` exists
- [x] All file paths in `SUMMARY.md` match actual file names

---

## 🎯 What Happens After Upload

1. GitBook reads `SUMMARY.md` to build navigation
2. `README.md` becomes the landing page
3. All sections from `SUMMARY.md` appear in the sidebar
4. Anchor links (like `#quick-start`) work automatically
5. Code blocks are syntax highlighted
6. Search functionality works automatically

---

## ⚠️ Important Notes

- **File names must match exactly** - GitBook is case-sensitive
- **SUMMARY.md is critical** - Without it, GitBook won't know how to organize content
- **README.md is the landing page** - This is what users see first
- **Anchor links work automatically** - Links like `#quick-start` will jump to that section

---

**Yes, you can just drop the MD files and it will work!** GitBook is designed to work with just markdown files and `SUMMARY.md`.

