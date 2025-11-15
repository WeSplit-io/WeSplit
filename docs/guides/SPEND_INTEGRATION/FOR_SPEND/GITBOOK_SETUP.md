# GitBook Setup Instructions

This folder is ready to be published as a GitBook. Follow these steps to set it up.

## Option 1: GitBook.com (Recommended)

### Step 1: Create a GitBook Account
1. Go to [https://www.gitbook.com](https://www.gitbook.com)
2. Sign up for a free account (or use existing account)

### Step 2: Create a New Space
1. Click "New" → "Space"
2. Choose "Import from GitHub" or "Create from scratch"
3. If importing from GitHub:
   - Connect your GitHub account
   - Select the repository containing this folder
   - Select the `docs/guides/SPEND_INTEGRATION/FOR_SPEND` folder

### Step 3: Configure GitBook
1. GitBook will automatically detect `SUMMARY.md` and `README.md`
2. The documentation will be organized according to `SUMMARY.md`
3. Customize the space settings:
   - Title: "WeSplit X Spend Documentation"
   - Description: "Integration guide for WeSplit and spend partnership - Amazon purchases with USDC"
   - Visibility: Set to "Private" and invite the spend team
   - **Important**: This is a partnership-specific space, separate from the main WeSplit documentation

### Step 4: Share with spend Team
1. Go to Space Settings → Members
2. Add team members by email
3. Set appropriate permissions (Viewer/Editor)
4. Share the GitBook URL with the team

## Option 2: GitBook CLI (Local Development)

### Prerequisites
```bash
npm install -g gitbook-cli
```

### Build GitBook
```bash
cd docs/guides/SPEND_INTEGRATION/FOR_SPEND
gitbook install
gitbook serve
```

This will:
- Install GitBook plugins
- Start a local server (usually at http://localhost:4000)
- Generate the documentation site

### Build Static Site
```bash
gitbook build
```

This creates a `_book` folder with static HTML files that can be hosted anywhere.

## Option 3: GitHub Pages

### Step 1: Build GitBook
```bash
cd docs/guides/SPEND_INTEGRATION/FOR_SPEND
gitbook build
```

### Step 2: Deploy to GitHub Pages
1. Push the `_book` folder to a `gh-pages` branch
2. Enable GitHub Pages in repository settings
3. The documentation will be available at: `https://[username].github.io/[repo]/`

## File Structure

```
FOR_SPEND/
├── README.md                          # Introduction (GitBook landing page)
├── SUMMARY.md                          # Table of contents (GitBook navigation)
├── EXTERNAL_WEB_APP_TECHNICAL_INTEGRATION.md  # Main guide
├── INTEGRATION_CHECKLIST.md           # Checklist
├── COMPLETENESS_VERIFICATION.md       # Verification doc
├── FINAL_VERIFICATION.md              # Final verification
├── book.json                          # GitBook configuration (optional)
└── .gitbook.yml                       # GitBook configuration (optional)
```

## Notes

- **SUMMARY.md** is the most important file - it defines the navigation structure
- **README.md** will be the landing page
- All markdown files are linked from SUMMARY.md
- GitBook supports anchor links (e.g., `#quick-start`) for deep linking to sections

## Customization

### Change Theme
Edit `book.json` or `.gitbook.yml`:
```json
{
  "plugins": ["theme-default", "theme-comscore"]
}
```

### Add Plugins
```json
{
  "plugins": [
    "theme-default",
    "search",
    "sharing",
    "code",
    "back-to-top-button"
  ]
}
```

### Custom Domain
In GitBook.com settings, you can:
1. Go to Space Settings → Domain
2. Add a custom domain (requires DNS configuration)

## Support

For GitBook help:
- Documentation: [https://docs.gitbook.com](https://docs.gitbook.com)
- Community: [https://community.gitbook.com](https://community.gitbook.com)

---

**Ready to publish!** The documentation is fully structured and ready for GitBook.

