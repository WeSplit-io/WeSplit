# GitHub Pages Documentation Setup

This guide explains how to set up free documentation hosting using GitHub Pages with MkDocs.

## What Was Set Up

1. **MkDocs Configuration** (`mkdocs.yml`) - Documentation site configuration
2. **GitHub Actions Workflow** (`.github/workflows/docs.yml`) - Auto-deploys docs on push
3. **Documentation Index** (`docs/index.md`) - Homepage for your docs

## Setup Steps

### 1. Update Repository URLs

Edit `mkdocs.yml` and replace:
- `YOUR_USERNAME` with your GitHub username
- Update `repo_url` if needed

### 2. Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`
4. Click **Save**

### 3. Push Changes

```bash
git add mkdocs.yml docs/index.md .github/workflows/docs.yml requirements-docs.txt
git commit -m "Add GitHub Pages documentation setup"
git push origin main
```

### 4. Wait for Deployment

- GitHub Actions will automatically build and deploy your docs
- Check the **Actions** tab in your repository
- Once complete, your docs will be available at:
  `https://YOUR_USERNAME.github.io/WeSplit`

## Local Development

### Install MkDocs Locally (Optional)

```bash
pip install -r requirements-docs.txt
```

### Preview Documentation Locally

```bash
mkdocs serve
```

Visit `http://127.0.0.1:8000` to preview your docs.

### Build Documentation

```bash
mkdocs build
```

This creates a `site/` folder with static HTML files.

## Adding New Documentation

1. Add your `.md` files to the `docs/` folder
2. Update `mkdocs.yml` navigation section to include new pages
3. Push to `main` branch
4. GitHub Actions will automatically rebuild and deploy

## Customization

### Change Theme Colors

Edit `mkdocs.yml`:
```yaml
theme:
  palette:
    - scheme: default
      primary: indigo  # Change to: red, blue, green, etc.
```

### Add More Navigation Sections

Edit the `nav:` section in `mkdocs.yml`:
```yaml
nav:
  - Home: index.md
  - Your Section:
    - Page 1: page1.md
    - Page 2: page2.md
```

## Benefits

✅ **Completely Free** - No limits, no shutdowns  
✅ **Automatic Updates** - Deploys on every push  
✅ **Fast & Reliable** - Hosted on GitHub's CDN  
✅ **Search Functionality** - Built-in search  
✅ **Mobile Friendly** - Responsive design  
✅ **Version Control** - All docs in your repo  

## Troubleshooting

### Docs Not Updating?

1. Check GitHub Actions workflow status
2. Ensure `gh-pages` branch exists
3. Verify GitHub Pages is enabled in Settings

### Build Errors?

1. Check the Actions tab for error messages
2. Test locally with `mkdocs serve`
3. Verify all markdown files are valid

### Need Help?

- [MkDocs Documentation](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)

---

**Your documentation is now hosted for free on GitHub Pages!** 🎉
