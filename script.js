// Clock — desktop menubar (HH:MM:SS) and iPhone status bar (h:mm)
function updateClock() {
  const now = new Date();
  const el = document.getElementById('clock');
  if (el) {
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
  }
  const ihEl = document.getElementById('ih-clock');
  if (ihEl) {
    const h12 = now.getHours() % 12 || 12;
    ihEl.textContent = `${h12}:${now.getMinutes().toString().padStart(2, '0')}`;
  }
}
updateClock();
setInterval(updateClock, 1000);

const SANITY_PROJECT_ID = 'hk3szrp3';
const SANITY_DATASET = 'production';

async function sanityFetch(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${SANITY_DATASET}?query=${encoded}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.result;
}

function imageUrl(ref) {
  if (!ref) return null;
  const id = ref.replace('image-', '').replace(/-([a-z]+)$/, '.$1');
  return `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${id}`;
}

// Fallback hardcoded projects (used until Sanity has data)
const fallbackProjects = [
  { title: 'Jazz Club', url: 'https://untitled.stream/library/project/cLDFZupLwp3tK6FMi4AqB', embedUrl: 'https://untitled.stream/embed/rSLJoUjUAFgy', color: '#F59C9A', emoji: '🎷', desc: '', photos: [] },
  { title: 'House with no windows', url: 'https://untitled.stream/library/project/25Goh8U7PjkcCSxnTC3Vp', embedUrl: 'https://untitled.stream/embed/pjs7eCJMnrky', color: '#C5DBA9', emoji: '🏠', desc: '', photos: [] },
  { title: 'Beat Dump', url: 'https://untitled.stream/library/project/NXMnADuKzTjPIl12vewGC', embedUrl: 'https://untitled.stream/embed/XfHgnsAgeVYI', color: '#FFBE98', emoji: '🥁', desc: '', photos: [] },
  { title: 'Orange 🍊', url: 'https://untitled.stream/library/project/y5CKeZOzNm3GjCfoCPXKu', embedUrl: 'https://untitled.stream/embed/NQ76feLWNIEq', color: '#FFE7AB', emoji: '🍊', desc: '', photos: [] },
];

let musicProjects = fallbackProjects;

async function loadMusicProjects() {
  try {
    const raw = await sanityFetch(`*[_type == "musicProject"] | order(order asc)`);
    if (raw && raw.length) {
      musicProjects = raw.map(p => ({
        title: p.title || '',
        createdAt: p._createdAt || '',
        url: p.projectUrl || '',
        embedUrl: p.embedUrl || '',
        color: p.color || '#F59C9A',
        emoji: p.emoji || '🎵',
        desc: p.desc || '',
        photos: (p.photos || []).map(ph => ({
          src: imageUrl(ph.image?.asset?._ref),
          caption: ph.caption || '',
        })),
      }));
    }
  } catch(e) { /* use fallback */ }
}
async function openMusicFolder() {
  await loadMusicProjects();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-window modal-large">
      <div class="modal-titlebar">
        <button class="modal-back js-back" aria-label="Back">&#8249;</button>
        <span class="modal-title">Music</span>
      </div>
      <div class="modal-body music-body">
        <div class="music-list">
          ${musicProjects.map((p, i) => `
            <div class="music-list-item" data-project-index="${i}">
              <div class="music-list-accent" style="background:${p.color};"></div>
              <div class="music-list-num">${String(i + 1).padStart(2, '0')}</div>
              <div class="music-list-info">
                <div class="music-list-title">${p.title.replace(/\p{Emoji}/gu, '').trim()}</div>
              </div>
              <div class="music-list-arrow">→</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  mountModal(overlay, 'music');

  overlay.querySelectorAll('.music-list-item').forEach(card => {
    card.addEventListener('click', () => {
      const p = musicProjects[card.dataset.projectIndex];
      // detail opens on top of the list — back returns to the list
      openProjectDetail(p);
    });
  });
}

function openProjectDetail(p) {
  const photos = p.photos.length ? p.photos : [null, null, null];

  const photosHTML = photos.map(photo => {
    const src = photo?.src || null;
    const caption = photo?.caption || '';
    return `
      <div class="pd-photo">
        ${src
          ? `<img src="${src}" alt=""/>`
          : `<div class="pd-photo-empty">📷</div>`}
        <div class="pd-caption">${caption || '<span class="pd-caption-empty">add caption</span>'}</div>
      </div>`;
  }).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-window pd-window">

      <!-- Hero banner -->
      <div class="pd-hero" style="background:${p.color};">
        <div class="pd-hero-lights">
          <button class="modal-back js-back" aria-label="Back">&#8249;</button>
        </div>
        <div class="pd-hero-text">
          <h1 class="pd-hero-title">${p.title.replace(/\p{Emoji}/gu, '').trim()}</h1>
          <p class="pd-hero-artist">youfoundmikey</p>
        </div>
      </div>

      <!-- Body -->
      <div class="pd-body">

        <!-- Left: player + notes -->
        <div class="pd-left">
          ${p.embedUrl ? `
          <div class="pd-embed-wrap">
            <iframe src="${p.embedUrl}" width="100%" height="352" allowfullscreen allow="picture-in-picture" frameborder="0" loading="lazy" style="display:block;"></iframe>
          </div>` : ''}
          <div class="pd-note">
            <p class="pd-note-label">notes</p>
            <p class="pd-note-text">${p.desc || 'nothing to see here yet.'}</p>
          </div>
        </div>

        <!-- Right: photos -->
        <div class="pd-right">
          <p class="pd-photos-label">photos</p>
          <div class="pd-photos">${photosHTML}</div>
        </div>

      </div>
    </div>
  `;

  mountModal(overlay);
}

async function openFitsFolder() {
  let fits = [];
  try {
    fits = await sanityFetch(`*[_type == "fit"] | order(order asc, _createdAt desc)`);
  } catch(e) {}

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-window modal-large">
      <div class="modal-titlebar">
        <button class="modal-back js-back" aria-label="Back">&#8249;</button>
        <span class="modal-title">Fits</span>
      </div>
      <div class="fits-body">
        <p class="fits-header">Archive</p>
        <div class="fits-grid">
          ${fits.length ? fits.map(f => `
            <div class="fit-card">
              ${f.photo?.asset?._ref
                ? `<img class="fit-photo" src="${imageUrl(f.photo.asset._ref)}" alt=""/>`
                : `<div class="fit-photo-placeholder">👗</div>`}
              <div class="fit-info">
                <div class="fit-date">${f.date || ''}</div>
                <div class="fit-desc">${f.desc || ''}</div>
              </div>
            </div>
          `).join('') : '<p style="padding:24px;color:rgba(255,255,255,0.3);">nothing to see here yet.</p>'}
        </div>
      </div>
    </div>
  `;
  mountModal(overlay, 'fits');

  overlay.querySelectorAll('.fit-photo').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => openLightbox(img.src));
  });
}

function openLightbox(src) {
  const lb = document.createElement('div');
  lb.className = 'lightbox-overlay';
  lb.innerHTML = `<img class="lightbox-img" src="${src}" alt=""/>`;
  document.body.appendChild(lb);
  history.pushState({ modal: true }, '');
  const close = () => {
    lb.remove();
    const i = modalStack.findIndex(m => m.el === lb);
    if (i >= 0) modalStack.splice(i, 1);
  };
  modalStack.push({ el: lb, close });
  lb.addEventListener('click', () => history.back());
}

async function openDesignFolder() {
  let projects = [];
  try {
    projects = await sanityFetch(`*[_type == "designProject"] | order(order asc, _createdAt desc)`);
  } catch(e) {}

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-window modal-large">
      <div class="modal-titlebar">
        <button class="modal-back js-back" aria-label="Back">&#8249;</button>
        <span class="modal-title">Design</span>
      </div>
      <div class="design-body">
        <p class="design-section-title">Work</p>
        <div class="design-grid">
          ${projects.length ? projects.map(p => `
            <div class="design-card">
              <div class="design-preview" style="background:${p.color || '#FFE7AB'};">
                ${p.images?.[0]?.asset?._ref
                  ? `<img class="design-img" src="${imageUrl(p.images[0].asset._ref)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" alt=""/>`
                  : (p.emoji || '🎨')}
              </div>
              <div class="design-info">
                <div class="design-name">${p.name || ''}</div>
                <div class="design-type">${p.type || ''}</div>
              </div>
            </div>
          `).join('') : '<p style="padding:24px;color:rgba(255,255,255,0.3);">nothing to see here yet.</p>'}
        </div>
      </div>
    </div>
  `;
  mountModal(overlay, 'design');

  // tap a design image to expand it — same lightbox as the fits archive
  overlay.querySelectorAll('.design-img').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => openLightbox(img.src));
  });
}

async function openThingsFolder() {
  let items = [];
  try {
    items = await sanityFetch(`*[_type == "thingsILike"] | order(order asc, _createdAt desc)`);
  } catch(e) {}

  function getYouTubeId(url) {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function renderMediaItem(m) {
    if (m.type === 'music' || m.type === 'video') {
      const ytId = m.linkUrl ? getYouTubeId(m.linkUrl) : null;
      if (ytId) {
        return `<a href="${m.linkUrl}" target="_blank" class="til-yt-thumb">
          <img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="${m.linkTitle || ''}"/>
          <div class="til-yt-play">▶</div>
          ${m.linkTitle ? `<div class="til-yt-title">${m.linkTitle}</div>` : ''}
        </a>`;
      }
      return `<div class="til-polaroid-media til-link-block">
        <span class="til-link-big-icon">${m.type === 'music' ? '🎵' : '🎬'}</span>
        <a href="${m.linkUrl}" target="_blank" class="til-link-label">${m.linkTitle || 'Open link'} ↗</a>
      </div>`;
    }
    const src = m.image?.asset?._ref ? imageUrl(m.image.asset._ref) : null;
    return `<div class="til-polaroid-media">
      ${src ? `<img src="${src}" alt=""/>` : `<div class="til-polaroid-placeholder">📷</div>`}
    </div>`;
  }

  function renderCard(item) {
    const caption = item.caption || '';
    const cat = item.category || '';
    const mediaItems = item.media && item.media.length ? item.media : [];

    // Music links live in their own row below the media, not in the grid
    const visual = mediaItems.filter(m => m.type !== 'music');
    const musicLinks = mediaItems.filter(m => m.type === 'music');
    const multiMedia = visual.length > 1;

    const mediaHTML = multiMedia
      ? `<div class="til-multi-media">${visual.map(renderMediaItem).join('')}</div>`
      : visual.length === 1
        ? renderMediaItem(visual[0])
        : musicLinks.length
          ? ''
          : `<div class="til-polaroid-media"><div class="til-polaroid-placeholder">📷</div></div>`;

    const linksHTML = musicLinks.length
      ? `<div class="til-links">${musicLinks.map(m => `
          <a href="${m.linkUrl}" target="_blank" class="til-music-link">
            <span>🎵</span>
            <span class="til-music-link-title">${m.linkTitle || m.linkUrl}</span>
            <span class="til-music-link-arrow">↗</span>
          </a>`).join('')}</div>`
      : '';

    return `
      <div class="til-polaroid${multiMedia ? ' til-multi' : ''}">
        ${mediaHTML}
        ${linksHTML}
        ${caption ? `<p class="til-polaroid-caption">${caption}</p>` : ''}
        ${cat ? `<span class="til-polaroid-cat">${cat}</span>` : ''}
      </div>`;
  }

  const categories = ['All', 'Music', 'Nature', 'Cars', 'Art', 'Nerd Things', 'Misc'];

  function buildGrid(filter) {
    const filtered = filter === 'All' ? items : items.filter(i => i.category === filter);
    return filtered.length
      ? filtered.map(renderCard).join('')
      : `<p class="til-empty">nothing to see here yet.</p>`;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-window til-window">
      <div class="modal-titlebar">
        <button class="modal-back js-back" aria-label="Back">&#8249;</button>
        <span class="modal-title">Things I Like</span>
      </div>
      <div class="til-inner">
        <div class="til-header">
          <h2 class="til-title">Things I Like</h2>
          <p class="til-subtitle">a showcase of the things that interest me</p>
          <div class="til-filters">
            ${categories.map(c => `<button class="til-filter-btn${c === 'All' ? ' active' : ''}" data-cat="${c}">${c}</button>`).join('')}
          </div>
        </div>
        <div class="til-grid" id="til-grid">
          ${buildGrid('All')}
        </div>
      </div>
    </div>
  `;

  mountModal(overlay, 'things');

  overlay.querySelectorAll('.til-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.til-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      overlay.querySelector('#til-grid').innerHTML = buildGrid(btn.dataset.cat);
    });
  });
}

// ── History-aware modal stack: back button/gesture closes the top window ──
const modalStack = [];

function popTopModal() {
  while (modalStack.length) {
    const top = modalStack.pop();
    if (document.body.contains(top.el)) { top.close(); return; }
  }
}

window.addEventListener('popstate', popTopModal);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalStack.length) history.back();
});

function mountModal(overlay, folderKey) {
  document.body.appendChild(overlay);

  // every open window gets its own history entry, so "back" peels it off
  if (folderKey) {
    if (location.hash === '#' + folderKey) history.pushState({ modal: true }, '');
    else location.hash = folderKey;
  } else {
    history.pushState({ modal: true }, '');
  }

  const close = () => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.15s';
    setTimeout(() => { overlay.remove(); }, 150);
    if (folderKey) history.replaceState(null, '', ' ');
    const i = modalStack.findIndex(m => m.el === overlay);
    if (i >= 0) modalStack.splice(i, 1);
  };
  modalStack.push({ el: overlay, close });

  const requestClose = () => history.back();
  overlay.querySelector('.js-close')?.addEventListener('click', requestClose);
  overlay.querySelectorAll('.js-back').forEach(b => b.addEventListener('click', requestClose));
  overlay.addEventListener('click', e => { if (e.target === overlay) requestClose(); });
}

const isMobile = () => window.innerWidth <= 768;

function openFolder(f) {
  if (f === 'music')       openMusicFolder();
  else if (f === 'fits')   openFitsFolder();
  else if (f === 'design') openDesignFolder();
  else if (f === 'things') openThingsFolder();
}

document.querySelectorAll('.folder[data-folder]').forEach(el => {
  // Desktop: double-click
  el.addEventListener('dblclick', () => openFolder(el.dataset.folder));
  // Mobile: single tap
  el.addEventListener('click', () => {
    if (isMobile()) openFolder(el.dataset.folder);
  });
});

// iPhone home screen apps — single tap, like the real thing
document.querySelectorAll('.ih-app[data-folder]').forEach(el => {
  el.addEventListener('click', () => openFolder(el.dataset.folder));
});


// Drag folders (desktop only)
let dragging = null, ox = 0, oy = 0, didDrag = false;

document.querySelectorAll('.folder').forEach(el => {
  el.addEventListener('mousedown', e => {
    if (isMobile()) return;
    dragging = el;
    didDrag = false;
    const rect = el.getBoundingClientRect();
    ox = e.clientX - rect.left;
    oy = e.clientY - rect.top;
    el.style.zIndex = 50;
    e.preventDefault();
  });
});

document.addEventListener('mousemove', e => {
  if (!dragging) return;
  didDrag = true;
  const area = document.getElementById('desktop-area').getBoundingClientRect();
  let x = e.clientX - area.left - ox;
  let y = e.clientY - area.top  - oy;
  x = Math.max(0, Math.min(area.width  - 180, x));
  y = Math.max(0, Math.min(area.height - 160, y));
  dragging.style.left = x + 'px';
  dragging.style.top  = y + 'px';
});

document.addEventListener('mouseup', () => {
  if (dragging) { dragging.style.zIndex = ''; dragging = null; }
});

// Block dblclick if folder was dragged
document.querySelectorAll('.folder[data-folder]').forEach(el => {
  el.addEventListener('dblclick', e => { if (didDrag) e.stopImmediatePropagation(); });
});

// Restore open folder on page refresh via URL hash
const hashFolder = location.hash.replace('#', '');
if (hashFolder) openFolder(hashFolder);

// ── iPhone home widgets: now playing, weather, world clock ──

async function initIhMusic() {
  const btn = document.getElementById('ih-music');
  if (!btn) return;
  await loadMusicProjects();
  // newest project wins; fallback list has no dates, so [0] is fine
  const p = [...musicProjects].sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  )[0];
  if (!p) return;

  const art = document.getElementById('ih-music-art');
  const src = p.photos?.[0]?.src;
  if (src) {
    art.innerHTML = `<img src="${src}" alt=""/>`;
  } else {
    art.style.background = p.color || '#2a2a2a';
    art.textContent = p.emoji || '🎵';
  }
  document.getElementById('ih-music-title').textContent = p.title || 'Untitled';
  btn.addEventListener('click', () => openProjectDetail(p));
}

const IH_WX_CODES = [
  [[0], 'Clear', 'sun'],
  [[1, 2], 'Partly cloudy', 'partly'],
  [[3], 'Cloudy', 'cloud'],
  [[45, 48], 'Foggy', 'fog'],
  [[51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], 'Rain', 'rain'],
  [[71, 73, 75, 77, 85, 86], 'Snow', 'snow'],
  [[95, 96, 99], 'Thunderstorms', 'bolt'],
];

const IH_WX_ICONS = {
  sun: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#FFD60A"><circle cx="12" cy="12" r="5"/><g stroke="#FFD60A" stroke-width="2" stroke-linecap="round"><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g></svg>',
  partly: '<svg width="20" height="20" viewBox="0 0 24 24"><circle cx="9" cy="9" r="4" fill="#FFD60A"/><path d="M8 19a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 18 12a3.5 3.5 0 0 1-.5 7H8z" fill="#fff"/></svg>',
  cloud: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M7 19a5 5 0 0 1-.7-9.95A6.5 6.5 0 0 1 19 11a4 4 0 0 1-.5 8H7z"/></svg>',
  fog: '<svg width="20" height="20" viewBox="0 0 24 24"><path d="M7 13a5 5 0 0 1-.7-9.95A6.5 6.5 0 0 1 19 5.5 4 4 0 0 1 18.5 13H7z" fill="#fff" opacity="0.9"/><g stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"><path d="M5 17h14M7 20.5h10"/></g></svg>',
  rain: '<svg width="20" height="20" viewBox="0 0 24 24"><path d="M7 14a5 5 0 0 1-.7-9.95A6.5 6.5 0 0 1 19 6.5 4 4 0 0 1 18.5 14H7z" fill="#fff"/><g stroke="#9ECBFF" stroke-width="2" stroke-linecap="round"><path d="M8 17l-1 3.5M13 17l-1 3.5M18 17l-1 3.5"/></g></svg>',
  snow: '<svg width="20" height="20" viewBox="0 0 24 24"><path d="M7 14a5 5 0 0 1-.7-9.95A6.5 6.5 0 0 1 19 6.5 4 4 0 0 1 18.5 14H7z" fill="#fff"/><g fill="#fff"><circle cx="8" cy="18.5" r="1.3"/><circle cx="13" cy="20" r="1.3"/><circle cx="17" cy="17.5" r="1.3"/></g></svg>',
  bolt: '<svg width="20" height="20" viewBox="0 0 24 24"><path d="M7 13a5 5 0 0 1-.7-9.95A6.5 6.5 0 0 1 19 5.5 4 4 0 0 1 18.5 13H7z" fill="#fff"/><path d="M13 12l-4 6h3l-1.5 5 5-7h-3l1.8-4z" fill="#FFD60A"/></svg>',
};

async function initIhWeather() {
  const tempEl = document.getElementById('ih-wx-temp');
  if (!tempEl) return;
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.006' +
      '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min' +
      '&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=1'
    );
    const d = await res.json();
    const code = d.current?.weather_code ?? 3;
    const match = IH_WX_CODES.find(([codes]) => codes.includes(code)) || IH_WX_CODES[2];
    tempEl.textContent = `${Math.round(d.current.temperature_2m)}°`;
    document.getElementById('ih-wx-cond').textContent = match[1];
    document.getElementById('ih-wx-icon').innerHTML = IH_WX_ICONS[match[2]];
    document.getElementById('ih-wx-hilo').textContent =
      `H:${Math.round(d.daily.temperature_2m_max[0])}° L:${Math.round(d.daily.temperature_2m_min[0])}°`;
  } catch (e) {
    document.getElementById('ih-wx-cond').textContent = 'offline';
  }
}

function initIhClocks() {
  const wrap = document.getElementById('ih-clocks');
  if (!wrap) return;
  const cities = [
    ['LA', 'America/Los_Angeles'],
    ['NYC', 'America/New_York'],
    ['Paris', 'Europe/Paris'],
    ['Seoul', 'Asia/Seoul'],
  ];
  wrap.innerHTML = cities.map(([label], i) => `
    <div class="ih-clock">
      <div class="ih-clock-face" id="ih-cf-${i}">
        <div class="ih-hand ih-hand-h" id="ih-hh-${i}"></div>
        <div class="ih-hand ih-hand-m" id="ih-hm-${i}"></div>
        <div class="ih-clock-dot"></div>
      </div>
      <span class="ih-clock-label">${label}</span>
    </div>
  `).join('');

  const fmts = cities.map(([, tz]) =>
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false })
  );

  function tick() {
    const now = new Date();
    fmts.forEach((fmt, i) => {
      const parts = fmt.formatToParts(now);
      const h = +parts.find(p => p.type === 'hour').value % 24;
      const m = +parts.find(p => p.type === 'minute').value;
      document.getElementById(`ih-hh-${i}`).style.transform = `rotate(${(h % 12) * 30 + m * 0.5}deg)`;
      document.getElementById(`ih-hm-${i}`).style.transform = `rotate(${m * 6}deg)`;
      document.getElementById(`ih-cf-${i}`).classList.toggle('day', h >= 6 && h < 18);
    });
  }
  tick();
  setInterval(tick, 10000);
}

if (isMobile()) {
  initIhMusic();
  initIhWeather();
  initIhClocks();
}
