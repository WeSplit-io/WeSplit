# Deep Link Files for WeSplit Website

Copy these files to your existing wesplit.io website project.

---

## 1. Apple App Site Association

**File path:** `public/.well-known/apple-app-site-association` (NO file extension!)

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "G7JK3MSC7S.com.wesplit.app",
        "paths": [
          "/join-split",
          "/join-split/*",
          "/view-split",
          "/view-split/*"
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": [
      "G7JK3MSC7S.com.wesplit.app"
    ]
  }
}
```

---

## 2. Android Asset Links

**File path:** `public/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.wesplit.app",
      "sha256_cert_fingerprints": [
        "e6:ea:d2:32:2e:5a:67:60:b1:ae:67:fb:89:13:b3:78:1d:37:44:0f:36:2b:59:f9:7b:64:ff:0e:a6:ef:c1:82"
      ]
    }
  }
]


```

---

## 3. Add to your firebase.json

Add these configurations to your website's `firebase.json`:

```json
{
  "hosting": {
    "public": "public",
    "headers": [
      {
        "source": "/.well-known/apple-app-site-association",
        "headers": [
          { "key": "Content-Type", "value": "application/json" }
        ]
      },
      {
        "source": "/.well-known/assetlinks.json",
        "headers": [
          { "key": "Content-Type", "value": "application/json" }
        ]
      }
    ],
    "rewrites": [
      {
        "source": "/join-split",
        "destination": "/join-split/index.html"
      },
      {
        "source": "/join-split/**",
        "destination": "/join-split/index.html"
      },
      {
        "source": "/view-split",
        "destination": "/view-split/index.html"
      },
      {
        "source": "/view-split/**",
        "destination": "/view-split/index.html"
      }
    ]
  }
}
```

---

## 4. Landing Page

**File path:** `public/join-split/index.html` (also copy to `public/view-split/index.html`)

The full HTML is in the WeSplit project at:
`/public/join-split/index.html`

This page:
- Automatically tries to open the WeSplit app
- Shows split details if passed via URL
- Provides App Store / Play Store download links

---

## Quick Checklist

- [ ] Create `public/.well-known/` folder
- [ ] Add `apple-app-site-association` file (no extension)
- [ ] Add `assetlinks.json` file
- [ ] Create `public/join-split/` folder
- [ ] Add `index.html` landing page
- [ ] Create `public/view-split/` folder  
- [ ] Copy same `index.html` (or link to join-split)
- [ ] Update `firebase.json` with headers and rewrites
- [ ] Deploy: `firebase deploy --only hosting`
- [ ] Verify: `curl https://wesplit.io/.well-known/apple-app-site-association`

---

## Testing

After deploying, verify the files are accessible:

```bash
# Test Apple AASA
curl -I https://wesplit.io/.well-known/apple-app-site-association

# Test Android Asset Links
curl -I https://wesplit.io/.well-known/assetlinks.json

# Test landing page
curl -I https://wesplit.io/join-split
```

All should return `200 OK` with `Content-Type: application/json` for the first two.

