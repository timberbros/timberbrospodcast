# 🪵 The Timber Bros Podcast — Website

A multi-page static website for **The Timber Bros Podcast**, Australia's favourite woodworking podcast with Hazy & Plummo.

## Pages

| File | Page |
|------|------|
| `index.html` | Home |
| `pages/about.html` | About the Show |
| `pages/hosts.html` | The Hosts |
| `pages/episodes.html` | Episode Library |
| `pages/health.html` | Woodworker Health Resources |
| `pages/community.html` | Community, Feedback & Story Submission |
| `pages/sponsors.html` | Sponsorship Packages |
| `pages/guests.html` | Show Guests & Guest Application |
| `pages/contact.html` | Contact |

## Deploying to GitHub Pages

1. Create a new repository on GitHub (e.g. `timberbros-website`)
2. Upload all files maintaining the folder structure
3. Go to **Settings → Pages**
4. Set source to **Deploy from a branch → main → / (root)**
5. Save — your site will be live at `https://yourusername.github.io/timberbros-website`

### Custom Domain (thetimberbros.com)
1. In **Settings → Pages → Custom Domain**, enter `thetimberbros.com`
2. Add a `CNAME` file to the repo root containing `thetimberbros.com`
3. Update your DNS: add a CNAME record pointing `www` → `yourusername.github.io`
4. For the apex domain add A records pointing to GitHub Pages IPs:
   - 185.199.108.153
   - 185.199.109.153
   - 185.199.110.153
   - 185.199.111.153

## File Structure

```
timberbros/
├── index.html          ← Home page
├── _config.yml         ← GitHub Pages config
├── README.md
├── css/
│   └── style.css       ← All styles (design system)
├── js/
│   └── main.js         ← Navigation, form handling, scroll reveal
└── pages/
    ├── about.html
    ├── hosts.html
    ├── episodes.html
    ├── health.html
    ├── community.html
    ├── sponsors.html
    ├── guests.html
    └── contact.html
```

## Connecting Real Podcast Links

Search for `href="#"` across all HTML files and replace with your actual platform URLs:
- Spotify episode links
- Apple Podcasts link
- YouTube channel / playlist
- Overcast / Pocket Casts links

## Contact Form Setup

The forms currently use a JavaScript demo handler. To make them functional, connect to a form service such as:
- **Formspree** (free tier available) — add `action="https://formspree.io/f/YOUR_ID"` to each `<form>`
- **Netlify Forms** — add `netlify` attribute if hosted on Netlify
- **EmailJS** — client-side email sending

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--charcoal` | `#1C1A17` | Main background |
| `--amber` | `#C8842A` | Primary accent / CTAs |
| `--cream` | `#F0E8D8` | Body text |
| `--forest` | `#2D4A2D` | Men's health accent |
| `--sawdust` | `#D4BC94` | Secondary text |

Fonts loaded from Google Fonts:
- **Playfair Display** — headings (display, serif)
- **Source Sans 3** — body text
- **Courier Prime** — monospace / episode numbers

---

Built with ❤️ for The Timber Bros · Sydney, Australia
