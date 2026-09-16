/* ==========================================================================
   The Timber Bros — CMS Render
   Pulls content from /data/*.json and renders it into the page.
   This is what lets the admin panel update the site without touching HTML.
   NOTE: relies on fetch(), so it needs to be served over http(s)
   (GitHub Pages, or a local dev server) — it will not work opened via file://
   ========================================================================== */

(function () {
  // Pages in /pages/ use the default '../data/'. index.html (repo root) sets
  // window.CMS_DATA_BASE = 'data/' before this script loads.
  const DATA_BASE = window.CMS_DATA_BASE || '../data/';

  function esc(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function loadJSON(file) {
    const res = await fetch(DATA_BASE + file + '.json?_=' + Date.now());
    if (!res.ok) throw new Error('Could not load ' + file + '.json (' + res.status + ')');
    return res.json();
  }

  function tagsHTML(tags) {
    if (!tags || !tags.length) return '';
    const cls = {
      'Timber': 'tag-timber', 'Sawmilling': 'tag-timber',
      'Tools': 'tag-tools',
      'Craft': 'tag-craft', 'Techniques': 'tag-craft', 'Business': 'tag-craft', 'Interview': 'tag-craft',
      "Men's Health": 'tag-health', "Women's Health": 'tag-health'
    };
    return '<div class="episode-tags">' + tags.map(t =>
      `<span class="tag ${cls[t] || 'tag-craft'}">${esc(t)}</span>`
    ).join('') + '</div>';
  }

  /* ---------------- EPISODES ---------------- */
  async function renderEpisodes() {
    const featuredEl = document.getElementById('cms-featured-episode');
    const gridEl = document.getElementById('cms-episode-grid');
    const filterEl = document.getElementById('cms-filter-bar');
    if (!gridEl) return;

    let episodes;
    try { episodes = await loadJSON('episodes'); }
    catch (e) { gridEl.innerHTML = '<p class="text-sawdust">Could not load episodes right now.</p>'; console.error(e); return; }

    episodes = episodes.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const featured = episodes.find(e => e.featured) || episodes[0];
    const rest = episodes.filter(e => e !== featured);

    if (featuredEl && featured) {
      const links = featured.links || {};
      const streamBtns = [
        links.spotify ? `<a href="${esc(links.spotify)}" class="stream-btn">🎵 Spotify</a>` : '',
        links.apple ? `<a href="${esc(links.apple)}" class="stream-btn">🎙 Apple</a>` : '',
        links.youtube ? `<a href="${esc(links.youtube)}" class="stream-btn">▶️ YouTube</a>` : '',
        links.overcast ? `<a href="${esc(links.overcast)}" class="stream-btn">📻 Overcast</a>` : ''
      ].join('');
      featuredEl.innerHTML = `
        <button class="featured-ep-play" aria-label="Play latest episode">▶</button>
        <div>
          <span class="featured-badge">🔥 Latest Episode</span>
          <h2>Ep. ${esc(featured.number)} — ${esc(featured.title)}</h2>
          <p>${esc(featured.description)}</p>
          <div style="margin-bottom:16px;">${tagsHTML(featured.tags)}</div>
          <div class="stream-row">${streamBtns}</div>
        </div>`;
    }

    const allTags = Array.from(new Set(episodes.flatMap(e => e.tags || [])));
    if (filterEl) {
      filterEl.innerHTML = '<button class="filter-btn active" data-filter="">All Episodes</button>' +
        allTags.map(t => `<button class="filter-btn" data-filter="${esc(t)}">${esc(t)}</button>`).join('');
      filterEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        filterEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.filter;
        gridEl.querySelectorAll('.ep-card').forEach(card => {
          card.style.display = (!f || card.dataset.tags.includes('|' + f + '|')) ? '' : 'none';
        });
      });
    }

    gridEl.innerHTML = rest.map(ep => `
      <div class="ep-card reveal visible" data-tags="|${(ep.tags || []).join('|')}|">
        <div class="ep-meta"><span class="ep-number">EP. ${esc(ep.number)}</span><span class="ep-date">${esc(ep.dateDisplay || '')}</span></div>
        <h3>${esc(ep.title)}</h3>
        <p>${esc(ep.description)}</p>
        ${tagsHTML(ep.tags)}
        <div class="ep-footer"><span class="ep-duration">⏱ ${esc(ep.duration || '')}</span><button class="ep-play" aria-label="Play episode ${esc(ep.number)}">▶</button></div>
      </div>`).join('');
  }

  /* ---------------- GUESTS ---------------- */
  async function renderGuests() {
    const el = document.getElementById('cms-guest-grid');
    if (!el) return;
    let guests;
    try { guests = await loadJSON('guests'); }
    catch (e) { el.innerHTML = '<p class="text-sawdust">Could not load guests right now.</p>'; console.error(e); return; }

    el.innerHTML = guests.map(g => `
      <div class="guest-card reveal visible">
        <div class="guest-ep">${esc(g.episode)}</div>
        <div class="guest-name">${esc(g.name)}</div>
        <div class="guest-role">${esc(g.role)}</div>
        <p class="guest-bio">${esc(g.bio)}</p>
        ${tagsHTML(g.tags)}
      </div>`).join('');
  }

  /* ---------------- HOSTS ---------------- */
  async function renderHosts() {
    const el = document.getElementById('cms-hosts');
    if (!el) return;
    let data;
    try { data = await loadJSON('hosts'); }
    catch (e) { el.innerHTML = '<p class="text-sawdust">Could not load hosts right now.</p>'; console.error(e); return; }

    el.innerHTML = data.hosts.map(h => `
      <div class="host-full reveal visible">
        <div class="host-header">
          <div class="host-avatar-lg">${esc(h.icon)}</div>
          <div class="host-header-info">
            <span class="eyebrow">Host — Co-Founder</span>
            <h2>${esc(h.name)}</h2>
            <span class="host-sub">${esc(h.subtitle)}</span>
            <p style="color:var(--sawdust); font-size:0.95rem; margin:0; max-width:500px;">${esc(h.tagline)}</p>
          </div>
        </div>
        <div class="host-body">
          <div class="host-stat-row">
            ${(h.stats || []).map(s => `<div class="host-stat"><span class="host-stat-num">${esc(s.num)}</span><span class="host-stat-lbl">${esc(s.label)}</span></div>`).join('')}
          </div>
          ${(h.bio || []).map(p => `<p>${p}</p>`).join('')}
          <div class="host-links">
            ${(h.links || []).map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener" class="btn btn-${esc(l.style || 'outline')}" style="font-size:0.85rem; padding:10px 20px;">${esc(l.label)}</a>`).join('')}
          </div>
        </div>
      </div>`).join('');
  }

  /* ---------------- SPONSORS ---------------- */
  async function renderSponsors() {
    const statsEl = document.getElementById('cms-audience-stats');
    const tiersEl = document.getElementById('cms-tier-grid');
    const currentEl = document.getElementById('cms-current-sponsors');
    if (!statsEl && !tiersEl && !currentEl) return;
    let data;
    try { data = await loadJSON('sponsors'); }
    catch (e) { console.error(e); return; }

    if (statsEl) {
      statsEl.innerHTML = (data.audienceStats || []).map(s => `
        <div class="aud-stat"><span class="aud-num">${esc(s.num)}</span><span class="aud-lbl">${esc(s.label)}</span><span class="aud-sub">${esc(s.sub)}</span></div>`).join('');
    }
    if (tiersEl) {
      tiersEl.innerHTML = (data.tiers || []).map(t => `
        <div class="sponsor-tier${t.featured ? ' featured' : ''} reveal visible">
          ${t.featured && t.badge ? `<div class="tier-badge">${esc(t.badge)}</div>` : ''}
          <div class="tier-name">${esc(t.icon)} ${esc(t.name)}</div>
          <span class="tier-price">${esc(t.price)}</span>
          <ul class="tier-features">${(t.features || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
          <a href="contact.html" class="btn btn-${esc(t.ctaStyle || 'outline')}" style="width:100%; justify-content:center;">${esc(t.cta)}</a>
        </div>`).join('');
    }
    if (currentEl) {
      currentEl.innerHTML = (data.currentSponsors || []).map(s =>
        s.placeholder
          ? `<span class="sponsor-badge" style="opacity:0.5; cursor:default;">${esc(s.label)}</span>`
          : `<a href="${esc(s.url)}" target="_blank" rel="noopener" class="sponsor-badge">${esc(s.label)}</a>`
      ).join('');
    }
  }

  /* ---------------- HEALTH ---------------- */
  async function renderHealth() {
    const mensOrgsEl = document.getElementById('cms-mens-orgs');
    const mensTipsEl = document.getElementById('cms-mens-tips');
    const womensOrgsEl = document.getElementById('cms-womens-orgs');
    const womensTipsEl = document.getElementById('cms-womens-tips');
    if (!mensOrgsEl && !womensOrgsEl) return;
    let data;
    try { data = await loadJSON('health'); }
    catch (e) { console.error(e); return; }

    const orgCard = (o, variant) => `
      <a href="${esc(o.url)}" target="_blank" rel="noopener" class="org-card ${variant}">
        <div class="org-icon">${esc(o.icon)}</div>
        <h3>${esc(o.name)}</h3>
        <p>${esc(o.desc)}</p>
        <span class="org-link">${esc(o.linkText)}${o.phone ? ` <br><strong style="font-size:1rem; color:var(--cream);">${esc(o.phone)}</strong>` : ''}</span>
      </a>`;
    const tipCard = (t, variant) => `<div class="tip-card${variant ? ' ' + variant : ''}"><h4>${esc(t.title)}</h4><p>${esc(t.text)}</p></div>`;

    if (mensOrgsEl) mensOrgsEl.innerHTML = (data.mensOrgs || []).map(o => orgCard(o, 'mens')).join('');
    if (mensTipsEl) mensTipsEl.innerHTML = (data.mensTips || []).map(t => tipCard(t, '')).join('');
    if (womensOrgsEl) womensOrgsEl.innerHTML = (data.womensOrgs || []).map(o => orgCard(o, 'womens')).join('');
    if (womensTipsEl) womensTipsEl.innerHTML = (data.womensTips || []).map(t => tipCard(t, 'womens')).join('');

    const mensIntroEl = document.getElementById('cms-mens-intro');
    const womensIntroEl = document.getElementById('cms-womens-intro');
    if (mensIntroEl && data.mensIntro) mensIntroEl.textContent = data.mensIntro;
    if (womensIntroEl && data.womensIntro) womensIntroEl.textContent = data.womensIntro;
  }

  /* ---------------- COMMUNITY ---------------- */
  async function renderCommunity() {
    const hubEl = document.getElementById('cms-community-hub-text');
    const socialEl = document.getElementById('cms-social-hub');
    const testEl = document.getElementById('cms-testimonials');
    if (!hubEl && !socialEl && !testEl) return;
    let data;
    try { data = await loadJSON('community'); }
    catch (e) { console.error(e); return; }

    if (hubEl && data.hubText) hubEl.textContent = data.hubText;
    if (socialEl) socialEl.innerHTML = (data.socialLinks || []).map(s => `<a href="${esc(s.url)}" class="social-card">${esc(s.label)}</a>`).join('');
    if (testEl) testEl.innerHTML = (data.testimonials || []).map(t => `
      <div class="testimonial reveal visible">
        <p class="testimonial-text">${esc(t.text)}</p>
        <span class="testimonial-author">${esc(t.author)}</span>
        <span class="testimonial-location">${esc(t.location)}</span>
      </div>`).join('');
  }

  /* ---------------- ABOUT ---------------- */
  async function renderAbout() {
    const originEl = document.getElementById('cms-origin-text');
    const quoteEl = document.getElementById('cms-quote');
    const formatEl = document.getElementById('cms-format-list');
    const studioEl = document.getElementById('cms-studio-card');
    const whyEl = document.getElementById('cms-why-cards');
    const platformEl = document.getElementById('cms-platform-strip');
    if (!originEl && !whyEl) return;
    let data;
    try { data = await loadJSON('about'); }
    catch (e) { console.error(e); return; }

    if (originEl) originEl.innerHTML = (data.originParagraphs || []).map(p => `<p class="text-sawdust" style="margin-top:16px;">${p}</p>`).join('');
    if (quoteEl && data.quote) quoteEl.textContent = data.quote;
    if (formatEl) formatEl.innerHTML = (data.formatItems || []).map(i => `
      <li style="display:flex; gap:14px; align-items:flex-start; font-size:0.95rem; color:var(--sawdust);">
        <span style="color:var(--amber); font-weight:700; font-size:1.1rem; flex-shrink:0;">${esc(i.icon)}</span>
        <span><strong style="color:var(--cream);">${esc(i.boldText)}</strong> ${esc(i.rest)}</span>
      </li>`).join('');
    if (studioEl && data.studio) studioEl.innerHTML = `
      <div class="studio-icon">🎚</div>
      <div>
        <h4 style="color:var(--amber); margin-bottom:6px;">${esc(data.studio.title)}</h4>
        <p style="font-size:0.9rem; color:var(--sawdust); margin:0;">${esc(data.studio.text)}</p>
        <a href="${esc(data.studio.url)}" target="_blank" rel="noopener" class="text-amber" style="font-size:0.85rem; font-weight:600; margin-top:8px; display:inline-block;">${esc(data.studio.linkText)}</a>
      </div>`;
    if (whyEl) whyEl.innerHTML = (data.whyCards || []).map(c => `
      <div class="why-card reveal visible">
        <div class="why-icon">${esc(c.icon)}</div>
        <div><h4>${esc(c.title)}</h4><p>${esc(c.text)}</p></div>
      </div>`).join('');
    if (platformEl) platformEl.innerHTML = (data.platforms || []).map(p => `<a href="${esc(p.url)}" class="platform-btn">${esc(p.label)}</a>`).join('');
  }

  /* ---------------- CONTACT ---------------- */
  async function renderContact() {
    const itemsEl = document.getElementById('cms-contact-items');
    const socialEl = document.getElementById('cms-contact-social');
    if (!itemsEl && !socialEl) return;
    let data;
    try { data = await loadJSON('contact'); }
    catch (e) { console.error(e); return; }

    if (itemsEl) itemsEl.innerHTML = (data.contactItems || []).map(c => `
      <div class="contact-item">
        <div class="contact-icon">${esc(c.icon)}</div>
        <div>
          <h4>${esc(c.title)}</h4>
          <p>${esc(c.desc)}</p>
          <a href="${esc(c.url)}"${c.url && c.url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(c.linkText)}</a>
        </div>
      </div>`).join('');
    if (socialEl) socialEl.innerHTML = (data.socialLinks || []).map(s => `
      <a href="${esc(s.url)}" target="_blank" rel="noopener" style="display:flex; gap:12px; align-items:center; color:var(--sawdust); font-size:0.9rem; text-decoration:none; transition:color 0.2s;" onmouseover="this.style.color='#C8842A'" onmouseout="this.style.color=''">
        <span>${esc(s.icon)}</span> ${esc(s.label)}
      </a>`).join('');
  }

  /* ---------------- HOME ---------------- */
  async function renderHome() {
    const heroEyebrowEl = document.getElementById('cms-hero-eyebrow');
    const heroTitleEl = document.getElementById('cms-hero-title');
    const heroLeadEl = document.getElementById('cms-hero-lead');
    const badgesEl = document.getElementById('cms-listen-badges');
    const statsEl = document.getElementById('cms-stats-bar');
    const topicsEl = document.getElementById('cms-topic-grid');
    const latestEpEl = document.getElementById('cms-latest-ep');
    const videoTeaserEl = document.getElementById('cms-video-teaser');
    const recentEpEl = document.getElementById('cms-recent-episodes');
    const hostsTeaserTextEl = document.getElementById('cms-hosts-teaser-text');
    const hostsMiniEl = document.getElementById('cms-hosts-mini');
    const studioLineEl = document.getElementById('cms-studio-line');
    const sponsorCtaEl = document.getElementById('cms-sponsor-cta');
    if (!heroTitleEl && !recentEpEl && !hostsMiniEl) return;

    let home, episodes, hostsData;
    try {
      [home, episodes, hostsData] = await Promise.all([
        loadJSON('home'), loadJSON('episodes'), loadJSON('hosts')
      ]);
    } catch (e) { console.error(e); return; }

    if (heroEyebrowEl && home.hero) heroEyebrowEl.textContent = home.hero.eyebrow;
    if (heroTitleEl && home.hero) heroTitleEl.innerHTML = `${esc(home.hero.titleLine1)}\n        <em>${esc(home.hero.titleLine2)}</em>`;
    if (heroLeadEl && home.hero) heroLeadEl.textContent = home.hero.lead;
    if (badgesEl && home.hero) {
      const b = home.hero;
      badgesEl.innerHTML = `
        <span class="listen-label">Find us on</span>
        <a href="${esc(b.spotifyUrl)}" class="badge" aria-label="Listen on Spotify"><svg width="14" height="14" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg> Spotify</a>
        <a href="${esc(b.appleUrl)}" class="badge" aria-label="Listen on Apple Podcasts"><svg width="14" height="14" viewBox="0 0 24 24" fill="#A855F7"><path d="M12 0C5.4 0 0 5.373 0 12s5.4 12 12 12 12-5.373 12-12S18.6 0 12 0zm.613 16.82c-.134.066-.28.1-.427.1s-.294-.034-.427-.1c-.414-.203-4.126-2.12-4.126-6.82 0-2.507 2.04-4.547 4.553-4.547s4.553 2.04 4.553 4.547c0 4.7-3.712 6.617-4.126 6.82zM12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg> Apple</a>
        <a href="${esc(b.overcastUrl)}" class="badge" aria-label="Listen on Overcast"><svg width="14" height="14" viewBox="0 0 24 24" fill="#FC7E0F"><circle cx="12" cy="12" r="12"/></svg> Overcast</a>
        <a href="${esc(b.youtubeUrl)}" class="badge" aria-label="Listen on YouTube Music"><svg width="14" height="14" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> YouTube</a>`;
    }

    if (statsEl) statsEl.innerHTML = (home.stats || []).map(s => `
      <div class="stat-block"><span class="stat-num">${esc(s.num)}</span><span class="stat-label">${esc(s.label)}</span></div>`).join('');

    if (topicsEl) topicsEl.innerHTML = (home.topics || []).map(t => `
      <div class="topic-pill"><span class="topic-icon">${esc(t.icon)}</span> ${esc(t.label)}</div>`).join('');

    const sorted = (episodes || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const latest = sorted.find(e => e.featured) || sorted[0];
    const recent = sorted.slice(0, 3);

    if (latestEpEl && latest) {
      latestEpEl.innerHTML = `
        <button class="play-btn" aria-label="Play latest episode">▶</button>
        <div>
          <div class="latest-ep-label">Ep. ${esc(latest.number)} — New Drop</div>
          <div class="latest-ep-title">${esc(latest.title)}</div>
          <div class="latest-ep-meta" style="margin-top:4px;">Hazy & Plummo · ${esc(latest.duration || '')} · ${(latest.tags || []).join(' / ')}</div>
        </div>`;
    }
    if (videoTeaserEl && home.videoTeaser) {
      videoTeaserEl.innerHTML = `
        <div style="font-size:2.5rem; margin-bottom:12px;">🎥</div>
        <h3>${esc(home.videoTeaser.title)}</h3>
        <p>${esc(home.videoTeaser.text)}</p>
        <a href="pages/community.html" class="btn btn-outline" style="font-size:0.8rem; padding:10px 20px;">Join the List</a>`;
    }
    if (recentEpEl) {
      recentEpEl.innerHTML = recent.map(ep => `
        <div class="card episode-card reveal visible">
          <div class="card-body">
            <div class="ep-num">EP. ${esc(ep.number)}</div>
            <h3>${esc(ep.title)}</h3>
            <p>${esc(ep.description)}</p>
            ${tagsHTML(ep.tags)}
            <a href="pages/episodes.html" class="btn btn-outline" style="font-size:0.8rem;padding:8px 18px;">Listen →</a>
          </div>
        </div>`).join('');
    }

    if (hostsTeaserTextEl && home.hostsTeaser) hostsTeaserTextEl.textContent = home.hostsTeaser.text;
    if (studioLineEl && home.hostsTeaser) studioLineEl.innerHTML = home.hostsTeaser.studioText;
    if (hostsMiniEl && hostsData && hostsData.hosts) {
      hostsMiniEl.innerHTML = hostsData.hosts.map(h => {
        const mainLink = (h.links || [])[0] || {};
        const linkLabel = (mainLink.url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
        return `
        <div class="card" style="flex:1; padding:28px; text-align:center;">
          <div style="font-size:3rem; margin-bottom:12px;">${esc(h.icon)}</div>
          <h3 style="font-size:1.1rem; margin-bottom:8px;">${esc(h.name)}</h3>
          <p style="font-size:0.85rem;" class="text-smoke">${esc(h.subtitle)}</p>
          ${mainLink.url ? `<a href="${esc(mainLink.url)}" class="text-amber" style="font-size:0.8rem;">${esc(linkLabel)} →</a>` : ''}
        </div>`;
      }).join('');
    }

    if (sponsorCtaEl && home.sponsorCta) {
      sponsorCtaEl.innerHTML = `
        <span class="eyebrow">${esc(home.sponsorCta.eyebrow)}</span>
        <h2>${esc(home.sponsorCta.title)}</h2>
        <p class="text-sawdust" style="margin-top:16px; margin-bottom:28px;">${esc(home.sponsorCta.text)}</p>
        <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap;">
          <a href="pages/sponsors.html" class="btn btn-primary">Become a Sponsor</a>
          <a href="pages/contact.html" class="btn btn-outline">Talk to Us First</a>
        </div>`;
    }
  }

  window.TimberBrosCMS = {
    renderEpisodes, renderGuests, renderHosts, renderSponsors,
    renderHealth, renderCommunity, renderAbout, renderContact, renderHome
  };
})();
