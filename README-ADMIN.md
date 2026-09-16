# Timber Bros Admin / CMS

Your site now has a lightweight admin panel at **`/admin/`** (e.g. `https://thetimberbros.com/admin/`) that lets you update the Home page, Episode Library, Guests, Hosts, Sponsors, Community, Health and About/Contact pages without touching any HTML.

## How it works

The site is still a plain static site hosted on GitHub Pages — nothing about your hosting changes. What changed:

- Content that used to be hard-coded into the page HTML (episodes, guests, hosts, sponsor tiers, testimonials, health resources, etc.) now lives in small JSON files under `/data/`.
- Each public page loads its JSON file with JavaScript and renders it into the page at load time (see `/js/cms-render.js`).
- The admin panel (`/admin/`) is a page that reads and writes those JSON files directly on GitHub, using the GitHub API, and commits the changes to your repo. GitHub Pages then rebuilds automatically, the same as any other commit — usually live within a minute or two.

**Your login is a GitHub Personal Access Token.** There's no separate password to manage or lose — the token itself is what proves you're allowed to publish changes. Anyone without a valid token (with write access to your repo) cannot save anything, even if they find the admin URL.

## One-time setup: create your token

1. On GitHub, go to **Settings → Developer settings → Personal access tokens → Fine-grained tokens** (`https://github.com/settings/personal-access-tokens/new`).
2. Click **Generate new token**. Name it something like "Timber Bros Admin".
3. Set an expiry you're comfortable with (you can always generate a new one later).
4. Under **Repository access**, choose **Only select repositories** and pick your website repo.
5. Under **Permissions → Repository permissions**, find **Contents** and set it to **Read and write**.
6. Click **Generate token** and copy it — GitHub only shows it once. Store it somewhere safe (a password manager is ideal).

## Signing in

1. Go to `https://thetimberbros.com/admin/` (or `yourusername.github.io/yourrepo/admin/` if you haven't pointed the custom domain there).
2. Enter your GitHub username/org, your repository name, the branch (`main` unless you use something else), and paste your token.
3. Click **Sign In**. The panel checks the token against your repo before letting you in.

The token is stored only in your browser (`localStorage`) so you don't have to paste it every time — it never touches any server other than GitHub's own API. Use **Sign Out** on a shared computer to clear it.

## Editing content

Pick a section from the left sidebar (Home Page, Episode Library, Show Guests, Hosts, Sponsorship Page, Health Resources, Community Page, About Page, Contact Page). Each section may have a few tabs for its different content blocks (e.g. Sponsorship has Audience Stats, Tiers, and Current Sponsors).

- **Lists** (episodes, guests, sponsor tiers, testimonials, etc.): click **Edit** on an item to change it, **Delete** to remove it, ↑/↓ to reorder, or **+ Add** to create a new one.
- **Single fields** (like the About page quote, or the Health page hotline numbers): just edit the boxes directly.
- A few fields (Hosts' stats/bio/links) are edited as small JSON snippets rather than individual boxes, since each host has a different number of them — the format is shown pre-filled, so you're just editing values, not writing JSON from scratch.

Click **Save & Publish** at the top of a section when you're done with it. This commits the change straight to your GitHub repo, and the live site updates within a minute or two (GitHub Pages' normal build time).

### About the Home page

The Home page's hero text, stats bar, topics grid, video teaser, hosts teaser text, and sponsor call-to-action are all editable under **Home Page** in the sidebar. The "Latest Episode" strip and the 3 "Recent Episodes" cards on the home page are **not** separately editable — they're pulled live from whatever is in the Episode Library, so they always stay in sync automatically. Change an episode there and the home page updates itself. Likewise, the two host mini-cards on the home page pull their name, icon, subtitle and main link straight from the Hosts section.

## What's NOT covered

- The contact/feedback/application forms still just simulate submission (as before) — they were never wired to a real backend. See the main `README.md` for options like Formspree if you want those to actually send you messages.
- Images (like the logo) still need to be replaced by uploading a new file to `/images/` in the repo — the admin panel only manages text content, not file uploads.

## Troubleshooting

- **"Could not sign in"** — double-check the owner/repo/branch spelling, and that the token has **Contents: Read and write** permission for that specific repo.
- **A page shows "Could not load..."** — the public pages fetch `/data/*.json` with JavaScript, which requires being served over `http(s)`. This works fine on GitHub Pages; it won't work if you just double-click an HTML file to open it locally (`file://`). To preview locally, run a simple local server, e.g. `python3 -m http.server` from the site folder, then visit `http://localhost:8000`.
- **Changes aren't showing up** — GitHub Pages typically takes 30–90 seconds to rebuild after a commit. Check the **Actions** tab on your GitHub repo to see the build status.
