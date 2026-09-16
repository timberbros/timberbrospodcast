/* ==========================================================================
   The Timber Bros — Admin CMS
   A password-free "login" that uses your GitHub Personal Access Token as the
   real credential: without a valid token with write access to the repo,
   nothing can be saved. Reads/writes go straight to the GitHub Contents API,
   which commits to your repo and triggers a normal GitHub Pages rebuild.
   ========================================================================== */

const AUTH_KEY = 'tbcms_auth_v1';
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

/* ---------------- base64 helpers (unicode-safe) ---------------- */
function b64Encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64Decode(str) {
  return decodeURIComponent(escape(atob(str.replace(/\n/g, ''))));
}

/* ---------------- auth state ---------------- */
function getAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); }
  catch (e) { return null; }
}
function setAuth(auth) { localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); }
function clearAuth() { localStorage.removeItem(AUTH_KEY); }

/* ---------------- GitHub API ---------------- */
async function ghRequest(path, opts) {
  const auth = getAuth();
  if (!auth) throw new Error('Not signed in');
  const res = await fetch('https://api.github.com' + path, Object.assign({
    headers: {
      'Authorization': 'Bearer ' + auth.token,
      'Accept': 'application/vnd.github+json'
    }
  }, opts));
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${res.statusText} ${body ? '— ' + body.slice(0, 300) : ''}`);
  }
  return res.json();
}

async function ghGetFile(path) {
  const auth = getAuth();
  const data = await ghRequest(`/repos/${auth.owner}/${auth.repo}/contents/${path}?ref=${encodeURIComponent(auth.branch)}`);
  return { json: JSON.parse(b64Decode(data.content)), sha: data.sha };
}

async function ghPutFile(path, obj, sha, message) {
  const auth = getAuth();
  const body = {
    message: message || `Update ${path} via admin CMS`,
    content: b64Encode(JSON.stringify(obj, null, 2) + '\n'),
    branch: auth.branch
  };
  if (sha) body.sha = sha;
  return ghRequest(`/repos/${auth.owner}/${auth.repo}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

/* ==========================================================================
   CONTENT SCHEMA
   Describes every editable file. Each file has one or more "blocks":
     - {type:'list', key, label, itemLabel(item), fields:[...], newItem()}
     - {type:'fields', key (or null for root), label, fields:[...]}
     - {type:'stringlist', key, label} — array of plain strings/HTML strings
   Field types: text, textarea, checkbox, tags (comma list), json (raw)
   ========================================================================== */

function fld(key, label, type) { return { key, label, type: type || 'text' }; }

const SCHEMA = {
  home: {
    path: 'data/home.json', title: 'Home Page',
    blocks: [
      {
        type: 'fields', key: null, label: 'Hero',
        fields: [
          fld('hero.eyebrow', 'Eyebrow text'),
          fld('hero.titleLine1', 'Headline — line 1'),
          fld('hero.titleLine2', 'Headline — line 2 (italic)'),
          fld('hero.lead', 'Lead paragraph', 'textarea'),
          fld('hero.spotifyUrl', 'Spotify URL'),
          fld('hero.appleUrl', 'Apple Podcasts URL'),
          fld('hero.overcastUrl', 'Overcast URL'),
          fld('hero.youtubeUrl', 'YouTube URL')
        ]
      },
      {
        type: 'list', key: 'stats', label: 'Stats Bar',
        itemLabel: s => `${s.num} — ${s.label}`,
        fields: [fld('num', 'Number (e.g. "50+")'), fld('label', 'Label')],
        newItem: () => ({ num: '', label: '' })
      },
      {
        type: 'list', key: 'topics', label: 'Topics Grid',
        itemLabel: t => t.label,
        fields: [fld('icon', 'Icon Emoji'), fld('label', 'Label')],
        newItem: () => ({ icon: '🪵', label: '' })
      },
      {
        type: 'fields', key: 'videoTeaser', label: 'Video Teaser',
        fields: [fld('title', 'Title'), fld('text', 'Text', 'textarea')]
      },
      {
        type: 'fields', key: 'hostsTeaser', label: 'Hosts Teaser',
        fields: [
          fld('text', 'Intro paragraph', 'textarea'),
          fld('studioText', 'Studio line (HTML allowed)', 'textarea')
        ]
      },
      {
        type: 'fields', key: 'sponsorCta', label: 'Sponsor Call-To-Action',
        fields: [fld('eyebrow', 'Eyebrow text'), fld('title', 'Title'), fld('text', 'Text', 'textarea')]
      }
    ]
  },
  episodes: {
    path: 'data/episodes.json', title: 'Episode Library',
    blocks: [{
      type: 'list', key: null, label: 'Episodes',
      itemLabel: e => `Ep. ${e.number || '?'} — ${e.title || '(untitled)'}`,
      fields: [
        fld('number', 'Episode Number'),
        fld('title', 'Title'),
        fld('description', 'Description', 'textarea'),
        fld('date', 'Date (YYYY-MM-DD, used for sorting)'),
        fld('dateDisplay', 'Date (as displayed, e.g. "2 Jun 2025")'),
        fld('duration', 'Duration (e.g. "62 min")'),
        fld('tags', 'Tags (comma separated)', 'tags'),
        fld('featured', 'Show as the featured "Latest Episode" banner', 'checkbox'),
        fld('links.spotify', 'Spotify URL (only used if featured)'),
        fld('links.apple', 'Apple Podcasts URL (only used if featured)'),
        fld('links.youtube', 'YouTube URL (only used if featured)'),
        fld('links.overcast', 'Overcast URL (only used if featured)')
      ],
      newItem: () => ({ id: 'ep' + Date.now(), number: '', title: '', description: '', date: '', dateDisplay: '', duration: '', tags: [], featured: false, links: {} })
    }]
  },
  guests: {
    path: 'data/guests.json', title: 'Show Guests',
    blocks: [{
      type: 'list', key: null, label: 'Guests',
      itemLabel: g => g.name || '(unnamed)',
      fields: [
        fld('name', 'Name'),
        fld('episode', 'Episode (e.g. "EP. 049")'),
        fld('role', 'Role / Location (e.g. "🏗️ Custom Furniture Maker · NSW")'),
        fld('bio', 'Bio', 'textarea'),
        fld('tags', 'Tags (comma separated)', 'tags')
      ],
      newItem: () => ({ id: 'g' + Date.now(), name: '', episode: '', role: '', bio: '', tags: [] })
    }]
  },
  hosts: {
    path: 'data/hosts.json', title: 'The Hosts',
    blocks: [{
      type: 'list', key: 'hosts', label: 'Hosts',
      itemLabel: h => h.name || '(unnamed)',
      fields: [
        fld('icon', 'Avatar Emoji'),
        fld('name', 'Name'),
        fld('subtitle', 'Subtitle (e.g. "Plummo\'s Timber · Sydney NSW")'),
        fld('tagline', 'Short Tagline', 'textarea'),
        fld('stats', 'Stats — JSON array of {num, label}, exactly 4 shown', 'json'),
        fld('bio', 'Bio Paragraphs — JSON array of HTML strings', 'json'),
        fld('links', 'Links — JSON array of {label, url, style: primary|outline}', 'json')
      ],
      newItem: () => ({ id: 'host' + Date.now(), icon: '🪵', name: '', subtitle: '', tagline: '', stats: [], bio: [], links: [] })
    }]
  },
  sponsors: {
    path: 'data/sponsors.json', title: 'Sponsorship Page',
    blocks: [
      {
        type: 'list', key: 'audienceStats', label: 'Audience Stats',
        itemLabel: s => `${s.num} — ${s.label}`,
        fields: [fld('num', 'Number (e.g. "50K+")'), fld('label', 'Label'), fld('sub', 'Sub-text')],
        newItem: () => ({ num: '', label: '', sub: '' })
      },
      {
        type: 'list', key: 'tiers', label: 'Sponsorship Tiers',
        itemLabel: t => `${t.icon || ''} ${t.name || '(unnamed tier)'}`,
        fields: [
          fld('icon', 'Icon Emoji'), fld('name', 'Tier Name'), fld('price', 'Price (e.g. "From $250 / episode")'),
          fld('features', 'Features — comma separated (use ; to separate if a feature has a comma)', 'tags'),
          fld('cta', 'Button Text'), fld('ctaStyle', 'Button Style (primary, outline, or forest)'),
          fld('featured', 'Highlight as most popular', 'checkbox'), fld('badge', 'Badge Text (only if highlighted)')
        ],
        newItem: () => ({ id: 'tier' + Date.now(), icon: '🪵', name: '', price: '', features: [], cta: 'Enquire →', ctaStyle: 'outline', featured: false, badge: '' })
      },
      {
        type: 'list', key: 'currentSponsors', label: 'Current Sponsors',
        itemLabel: s => s.label,
        fields: [fld('label', 'Label'), fld('url', 'URL'), fld('placeholder', 'This is a placeholder (no link)', 'checkbox')],
        newItem: () => ({ label: '', url: '', placeholder: false })
      }
    ]
  },
  health: {
    path: 'data/health.json', title: 'Health Resources',
    blocks: [
      {
        type: 'fields', key: null, label: 'Crisis Hotlines & Intros',
        fields: [
          fld('hotlines.lifeline', 'Lifeline number'),
          fld('hotlines.beyondblue', 'Beyond Blue number'),
          fld('hotlines.crisisText', 'Crisis text line instructions'),
          fld('mensIntro', "Men's Health intro paragraph", 'textarea'),
          fld('womensIntro', "Women's Health intro paragraph", 'textarea')
        ]
      },
      {
        type: 'list', key: 'mensOrgs', label: "Men's Health Organisations",
        itemLabel: o => o.name, fields: [
          fld('icon', 'Icon Emoji'), fld('name', 'Name'), fld('desc', 'Description', 'textarea'),
          fld('linkText', 'Link Text (e.g. "beyondblue.org.au →")'), fld('phone', 'Phone (optional)'), fld('url', 'URL')
        ], newItem: () => ({ icon: '🔵', name: '', desc: '', linkText: '', phone: '', url: '' })
      },
      {
        type: 'list', key: 'mensTips', label: "Men's Occupational Health Tips",
        itemLabel: t => t.title, fields: [fld('title', 'Title (with emoji)'), fld('text', 'Text', 'textarea')],
        newItem: () => ({ title: '', text: '' })
      },
      {
        type: 'list', key: 'womensOrgs', label: "Women's Health Organisations",
        itemLabel: o => o.name, fields: [
          fld('icon', 'Icon Emoji'), fld('name', 'Name'), fld('desc', 'Description', 'textarea'),
          fld('linkText', 'Link Text'), fld('phone', 'Phone (optional)'), fld('url', 'URL')
        ], newItem: () => ({ icon: '💜', name: '', desc: '', linkText: '', phone: '', url: '' })
      },
      {
        type: 'list', key: 'womensTips', label: "Women's Occupational Health Tips",
        itemLabel: t => t.title, fields: [fld('title', 'Title (with emoji)'), fld('text', 'Text', 'textarea')],
        newItem: () => ({ title: '', text: '' })
      }
    ]
  },
  community: {
    path: 'data/community.json', title: 'Community Page',
    blocks: [
      { type: 'fields', key: null, label: 'Community Hub Intro', fields: [fld('hubText', 'Hub intro text', 'textarea')] },
      {
        type: 'list', key: 'socialLinks', label: 'Social Links',
        itemLabel: s => s.label, fields: [fld('label', 'Label (with emoji)'), fld('url', 'URL')],
        newItem: () => ({ label: '', url: '' })
      },
      {
        type: 'list', key: 'testimonials', label: 'Community Voices / Testimonials',
        itemLabel: t => t.author, fields: [fld('text', 'Quote', 'textarea'), fld('author', 'Author (e.g. "— Craig M.")'), fld('location', 'Location')],
        newItem: () => ({ text: '', author: '', location: '' })
      }
    ]
  },
  about: {
    path: 'data/about.json', title: 'About Page',
    blocks: [
      { type: 'fields', key: null, label: 'Quote', fields: [fld('quote', 'Pull quote text', 'textarea')] },
      { type: 'stringlist', key: 'originParagraphs', label: 'Origin Story Paragraphs (HTML allowed)' },
      {
        type: 'list', key: 'formatItems', label: 'Show Format List',
        itemLabel: i => i.boldText, fields: [fld('icon', 'Icon Emoji'), fld('boldText', 'Bold lead-in text'), fld('rest', 'Rest of the sentence')],
        newItem: () => ({ icon: '🎙', boldText: '', rest: '' })
      },
      {
        type: 'fields', key: 'studio', label: 'Studio Card',
        fields: [fld('title', 'Title'), fld('text', 'Text', 'textarea'), fld('linkText', 'Link Text'), fld('url', 'URL')]
      },
      {
        type: 'list', key: 'whyCards', label: '"Why Listen" Cards',
        itemLabel: c => c.title, fields: [fld('icon', 'Icon Emoji'), fld('title', 'Title'), fld('text', 'Text', 'textarea')],
        newItem: () => ({ icon: '🪵', title: '', text: '' })
      },
      {
        type: 'list', key: 'platforms', label: 'Platform Links',
        itemLabel: p => p.label, fields: [fld('label', 'Label (with emoji)'), fld('url', 'URL')],
        newItem: () => ({ label: '', url: '' })
      }
    ]
  },
  contact: {
    path: 'data/contact.json', title: 'Contact Page',
    blocks: [
      {
        type: 'list', key: 'contactItems', label: 'Direct Contact Channels',
        itemLabel: c => c.title, fields: [
          fld('icon', 'Icon Emoji'), fld('title', 'Title'), fld('desc', 'Description'),
          fld('linkText', 'Link Text'), fld('url', 'URL (mailto: or https://)')
        ], newItem: () => ({ icon: '📧', title: '', desc: '', linkText: '', url: '' })
      },
      {
        type: 'list', key: 'socialLinks', label: 'Find Us Online Links',
        itemLabel: s => s.label, fields: [fld('icon', 'Icon Emoji'), fld('label', 'Label'), fld('url', 'URL')],
        newItem: () => ({ icon: '📷', label: '', url: '' })
      }
    ]
  }
};

/* ---------------- path helpers ---------------- */
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, val) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== 'object') o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = val;
}

/* ---------------- state ---------------- */
let currentSectionKey = null;
let currentFile = null;   // { json, sha }
let currentItemIndex = null; // for list blocks
let currentBlockIndex = 0;
let dirty = false;

function setDirty(v) {
  dirty = v;
  const el = $('#save-indicator');
  if (el) el.textContent = dirty ? 'Unsaved changes' : 'All changes saved';
  if (el) el.className = dirty ? 'save-indicator dirty' : 'save-indicator clean';
}

/* ---------------- LOGIN ---------------- */
function renderLogin(errorMsg) {
  $('#app').innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-logo">🪵</div>
        <h1>Timber Bros Admin</h1>
        <p class="login-sub">Sign in with a GitHub Personal Access Token that has write access to your website repo. This token <em>is</em> your login — no one can save changes here without it.</p>
        ${errorMsg ? `<div class="login-error">${errorMsg}</div>` : ''}
        <form id="login-form">
          <label>GitHub Username or Org<input type="text" id="f-owner" placeholder="e.g. ozsoundz" required></label>
          <label>Repository Name<input type="text" id="f-repo" placeholder="e.g. timberbros-website" required></label>
          <label>Branch<input type="text" id="f-branch" value="main"></label>
          <label>Personal Access Token<input type="password" id="f-token" placeholder="ghp_..." required></label>
          <button type="submit" class="btn-primary">Sign In</button>
        </form>
        <details class="login-help">
          <summary>How do I get a token?</summary>
          <ol>
            <li>On GitHub, go to <strong>Settings → Developer settings → Personal access tokens → Fine-grained tokens</strong>.</li>
            <li>Click <strong>Generate new token</strong>. Give it a name like "Timber Bros Admin".</li>
            <li>Under <strong>Repository access</strong>, choose "Only select repositories" and pick your website repo.</li>
            <li>Under <strong>Permissions → Repository permissions</strong>, set <strong>Contents</strong> to <strong>Read and write</strong>.</li>
            <li>Generate the token and paste it above. Keep it secret — treat it like a password.</li>
          </ol>
        </details>
      </div>
    </div>`;
  $('#login-form').addEventListener('submit', onLoginSubmit);
}

async function onLoginSubmit(e) {
  e.preventDefault();
  const owner = $('#f-owner').value.trim();
  const repo = $('#f-repo').value.trim();
  const branch = $('#f-branch').value.trim() || 'main';
  const token = $('#f-token').value.trim();
  const btn = $('#login-form button');
  btn.disabled = true; btn.textContent = 'Checking…';
  setAuth({ owner, repo, branch, token });
  try {
    await ghRequest(`/repos/${owner}/${repo}`);
    await renderApp();
  } catch (err) {
    clearAuth();
    renderLogin('Could not sign in: ' + err.message + '. Check the repo name, branch, and that your token has Contents: Read and write access.');
  }
}

/* ---------------- APP SHELL ---------------- */
async function renderApp() {
  const auth = getAuth();
  $('#app').innerHTML = `
    <div class="shell">
      <nav class="sidebar">
        <div class="sidebar-brand">🪵 Timber Bros<span>Admin</span></div>
        <div class="sidebar-repo">${auth.owner}/${auth.repo} <span class="branch-pill">${auth.branch}</span></div>
        <ul class="sidebar-nav" id="sidebar-nav"></ul>
        <button id="btn-logout" class="btn-logout">Sign Out</button>
      </nav>
      <main class="main" id="main-panel">
        <div class="empty-state">Choose a section from the left to start editing.</div>
      </main>
    </div>`;

  $('#sidebar-nav').innerHTML = Object.keys(SCHEMA).map(key => `
    <li><button class="nav-item" data-key="${key}">${SCHEMA[key].title}</button></li>`).join('');
  $$('.nav-item').forEach(b => b.addEventListener('click', () => loadSection(b.dataset.key)));
  $('#btn-logout').addEventListener('click', () => {
    if (dirty && !confirm('You have unsaved changes. Sign out anyway?')) return;
    clearAuth(); renderLogin();
  });
}

async function loadSection(key) {
  if (dirty && !confirm('You have unsaved changes in the current section. Discard them?')) return;
  currentSectionKey = key;
  currentBlockIndex = 0;
  currentItemIndex = null;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.key === key));
  const main = $('#main-panel');
  main.innerHTML = `<div class="loading">Loading ${SCHEMA[key].title}…</div>`;
  try {
    const file = await ghGetFile(SCHEMA[key].path);
    currentFile = file;
    setDirty(false);
    renderSection();
  } catch (err) {
    main.innerHTML = `<div class="error-box">Could not load <code>${SCHEMA[key].path}</code>: ${err.message}</div>`;
  }
}

/* ---------------- SECTION / BLOCK RENDER ---------------- */
function renderSection() {
  const schema = SCHEMA[currentSectionKey];
  const main = $('#main-panel');
  const blockTabs = schema.blocks.map((b, i) => `<button class="block-tab ${i === currentBlockIndex ? 'active' : ''}" data-i="${i}">${b.label}</button>`).join('');

  main.innerHTML = `
    <div class="main-header">
      <h2>${schema.title}</h2>
      <div class="header-actions">
        <span id="save-indicator" class="save-indicator clean">All changes saved</span>
        <button id="btn-save" class="btn-primary">Save & Publish</button>
      </div>
    </div>
    ${schema.blocks.length > 1 ? `<div class="block-tabs">${blockTabs}</div>` : ''}
    <div id="block-content"></div>`;

  $$('.block-tab').forEach(t => t.addEventListener('click', () => {
    currentBlockIndex = parseInt(t.dataset.i, 10);
    currentItemIndex = null;
    renderSection();
  }));
  $('#btn-save').addEventListener('click', saveCurrentFile);

  renderBlock();
}

function renderBlock() {
  const schema = SCHEMA[currentSectionKey];
  const block = schema.blocks[currentBlockIndex];
  const container = $('#block-content');

  if (block.type === 'list') {
    const list = block.key ? (getPath(currentFile.json, block.key) || []) : currentFile.json;
    if (currentItemIndex === null) {
      container.innerHTML = `
        <div class="list-toolbar"><button id="btn-add-item" class="btn-secondary">+ Add ${block.label.replace(/s$/, '')}</button></div>
        <div class="item-list" id="item-list"></div>`;
      const listEl = $('#item-list');
      listEl.innerHTML = list.map((item, i) => `
        <div class="item-row" data-i="${i}">
          <span class="item-label">${escHtml(block.itemLabel(item))}</span>
          <span class="item-actions">
            <button class="icon-btn" data-act="up" title="Move up">↑</button>
            <button class="icon-btn" data-act="down" title="Move down">↓</button>
            <button class="icon-btn" data-act="edit" title="Edit">Edit</button>
            <button class="icon-btn danger" data-act="delete" title="Delete">Delete</button>
          </span>
        </div>`).join('') || '<p class="empty-hint">Nothing here yet — click "Add" to create one.</p>';

      listEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.icon-btn');
        if (!btn) return;
        const i = parseInt(btn.closest('.item-row').dataset.i, 10);
        const act = btn.dataset.act;
        if (act === 'edit') { currentItemIndex = i; renderBlock(); }
        else if (act === 'delete') {
          if (!confirm(`Delete "${block.itemLabel(list[i])}"? This cannot be undone until you re-add it.`)) return;
          list.splice(i, 1); setDirty(true); renderBlock();
        } else if (act === 'up' && i > 0) {
          [list[i - 1], list[i]] = [list[i], list[i - 1]]; setDirty(true); renderBlock();
        } else if (act === 'down' && i < list.length - 1) {
          [list[i + 1], list[i]] = [list[i], list[i + 1]]; setDirty(true); renderBlock();
        }
      });
      $('#btn-add-item').addEventListener('click', () => {
        list.push(block.newItem());
        setDirty(true);
        currentItemIndex = list.length - 1;
        renderBlock();
      });
    } else {
      const item = list[currentItemIndex];
      container.innerHTML = `
        <div class="item-editor">
          <button class="back-link" id="btn-back">← Back to list</button>
          <form id="item-form">${block.fields.map(f => renderFieldHTML(f, getPath(item, f.key))).join('')}</form>
        </div>`;
      $('#btn-back').addEventListener('click', () => { commitFormToItem(block.fields, item); currentItemIndex = null; renderBlock(); });
      $('#item-form').addEventListener('input', () => { commitFormToItem(block.fields, item); setDirty(true); });
    }
  } else if (block.type === 'fields') {
    const target = block.key ? (getPath(currentFile.json, block.key) || {}) : currentFile.json;
    if (block.key) setPath(currentFile.json, block.key, target);
    container.innerHTML = `<form id="item-form" class="item-editor">${block.fields.map(f => renderFieldHTML(f, getPath(target, f.key))).join('')}</form>`;
    $('#item-form').addEventListener('input', () => { commitFormToItem(block.fields, target); setDirty(true); });
  } else if (block.type === 'stringlist') {
    const list = getPath(currentFile.json, block.key) || [];
    container.innerHTML = `
      <div class="list-toolbar"><button id="btn-add-str" class="btn-secondary">+ Add Paragraph</button></div>
      <div class="stringlist" id="stringlist"></div>`;
    const wrap = $('#stringlist');
    wrap.innerHTML = list.map((s, i) => `
      <div class="stringlist-row" data-i="${i}">
        <textarea rows="3" data-i="${i}">${escHtml(s)}</textarea>
        <div class="item-actions vertical">
          <button class="icon-btn" data-act="up">↑</button>
          <button class="icon-btn" data-act="down">↓</button>
          <button class="icon-btn danger" data-act="delete">Delete</button>
        </div>
      </div>`).join('') || '<p class="empty-hint">No paragraphs yet.</p>';
    wrap.addEventListener('input', (e) => {
      const ta = e.target.closest('textarea');
      if (!ta) return;
      list[parseInt(ta.dataset.i, 10)] = ta.value;
      setDirty(true);
    });
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.icon-btn');
      if (!btn) return;
      const i = parseInt(btn.closest('.stringlist-row').dataset.i, 10);
      const act = btn.dataset.act;
      if (act === 'delete') { if (!confirm('Delete this paragraph?')) return; list.splice(i, 1); setDirty(true); renderBlock(); }
      else if (act === 'up' && i > 0) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; setDirty(true); renderBlock(); }
      else if (act === 'down' && i < list.length - 1) { [list[i + 1], list[i]] = [list[i], list[i + 1]]; setDirty(true); renderBlock(); }
    });
    $('#btn-add-str').addEventListener('click', () => { list.push(''); setPath(currentFile.json, block.key, list); setDirty(true); renderBlock(); });
  }
}

function escHtml(str) {
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderFieldHTML(field, value) {
  const id = 'f_' + field.key.replace(/\./g, '_');
  if (field.type === 'textarea') {
    return `<label class="field">${field.label}<textarea rows="4" id="${id}" data-key="${field.key}" data-type="${field.type}">${escHtml(value)}</textarea></label>`;
  }
  if (field.type === 'checkbox') {
    return `<label class="field field-checkbox"><input type="checkbox" id="${id}" data-key="${field.key}" data-type="${field.type}" ${value ? 'checked' : ''}> ${field.label}</label>`;
  }
  if (field.type === 'tags') {
    const v = Array.isArray(value) ? value.join(', ') : '';
    return `<label class="field">${field.label}<input type="text" id="${id}" data-key="${field.key}" data-type="${field.type}" value="${escHtml(v)}"></label>`;
  }
  if (field.type === 'json') {
    const v = JSON.stringify(value == null ? [] : value, null, 2);
    return `<label class="field">${field.label}<textarea rows="6" class="mono" id="${id}" data-key="${field.key}" data-type="${field.type}">${escHtml(v)}</textarea></label>`;
  }
  return `<label class="field">${field.label}<input type="text" id="${id}" data-key="${field.key}" data-type="${field.type}" value="${escHtml(value)}"></label>`;
}

function commitFormToItem(fields, item) {
  fields.forEach(f => {
    const el = $('#f_' + f.key.replace(/\./g, '_'));
    if (!el) return;
    let val;
    if (f.type === 'checkbox') val = el.checked;
    else if (f.type === 'tags') val = el.value.split(',').map(s => s.trim()).filter(Boolean);
    else if (f.type === 'json') {
      try { val = JSON.parse(el.value); el.classList.remove('field-error'); }
      catch (e) { el.classList.add('field-error'); return; }
    } else val = el.value;
    setPath(item, f.key, val);
  });
}

async function saveCurrentFile() {
  const btn = $('#btn-save');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const schema = SCHEMA[currentSectionKey];
    const result = await ghPutFile(schema.path, currentFile.json, currentFile.sha, `Update ${schema.title} via admin CMS`);
    currentFile.sha = result.content.sha;
    setDirty(false);
    btn.textContent = 'Saved ✓';
    setTimeout(() => { btn.textContent = 'Save & Publish'; }, 1500);
  } catch (err) {
    alert('Save failed: ' + err.message);
    btn.textContent = 'Save & Publish';
  } finally {
    btn.disabled = false;
  }
}

/* ---------------- INIT ---------------- */
window.addEventListener('beforeunload', (e) => {
  if (dirty) { e.preventDefault(); e.returnValue = ''; }
});

(async function init() {
  const auth = getAuth();
  if (!auth) { renderLogin(); return; }
  try {
    await ghRequest(`/repos/${auth.owner}/${auth.repo}`);
    await renderApp();
  } catch (err) {
    clearAuth();
    renderLogin('Your session could not be verified: ' + err.message);
  }
})();
