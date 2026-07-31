// Clock for the desktop menubar
function updateClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const s = now.getSeconds().toString().padStart(2, '0');
  el.textContent = `${h}:${m}:${s}`;
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
      // detail opens on top of the list; back returns to the list
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

  // tap a design image to expand it, same lightbox as the fits archive
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

// iPhone home screen apps: single tap, like the real thing
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

// ── iPhone home widgets: spinning CD, fits carousel, notes ──

async function initIhCd() {
  const btn = document.getElementById('ih-cd');
  if (!btn) return;
  await loadMusicProjects();

  const stage = document.getElementById('ih-cd-stage');
  const titleEl = document.getElementById('ih-cd-title');

  // every project with a cover; projects without one still get a turn
  // on the disc using their color + emoji
  const discs = musicProjects.map(p => ({
    src: p.photos?.[0]?.src || null,
    title: p.title || 'Untitled',
    color: p.color || '#2a2a2a',
    emoji: p.emoji || '🎵',
    project: p,
  }));
  if (!discs.length) return;

  stage.innerHTML = discs.map(d => d.src
    ? `<img class="ih-cd-cover" src="${d.src}?w=300&h=300&fit=crop&auto=format" alt=""/>`
    : `<span class="ih-cd-cover ih-cd-fallback" style="background:${d.color};">${d.emoji}</span>`
  ).join('');
  const covers = [...stage.children];

  let i = 0;
  function show(n) {
    covers.forEach((el, k) => el.classList.toggle('on', k === n));
    titleEl.textContent = discs[n].title;
  }
  show(0);

  if (discs.length > 1) {
    setInterval(() => {
      i = (i + 1) % covers.length;
      show(i);
    }, 4500);
  }

  // tapping the disc opens whichever project is showing
  btn.addEventListener('click', () => openProjectDetail(discs[i].project));
}

async function initIhFits() {
  const stage = document.getElementById('ih-fits-stage');
  if (!stage) return;
  const dateEl = document.getElementById('ih-fits-date');
  let fits = [];
  try {
    fits = await sanityFetch(
      `*[_type == "fit" && defined(photo.asset)] | order(order asc, _createdAt desc)[0...8]`
    );
  } catch (e) { /* leave it empty */ }

  const shots = (fits || [])
    .map(f => ({ src: imageUrl(f.photo?.asset?._ref), date: f.date || '' }))
    .filter(s => s.src);

  if (!shots.length) {
    stage.innerHTML = '<span class="ih-fits-empty">👗</span>';
    return;
  }

  stage.innerHTML = shots
    .map(s => `<img class="ih-fits-slide" src="${s.src}?w=700&h=900&fit=crop&auto=format" alt=""/>`)
    .join('');
  const slides = [...stage.querySelectorAll('.ih-fits-slide')];

  let i = 0;
  function show(n) {
    slides.forEach((el, k) => el.classList.toggle('on', k === n));
    if (dateEl) dateEl.textContent = shots[n].date;
  }
  show(0);

  if (shots.length > 1) {
    setInterval(() => {
      i = (i + 1) % slides.length;
      show(i);
    }, 5200);
  }

  document.getElementById('ih-fits').addEventListener('click', () => openFolder('fits'));
}

async function initIhNote() {
  const wrap = document.getElementById('ih-note');
  if (!wrap) return;
  let note = null;
  try {
    const rows = await sanityFetch(
      `*[_type == "homeNote" && defined(body)] | order(order asc, _createdAt desc)[0...1]`
    );
    note = rows && rows[0];
  } catch (e) { /* fall through to the default */ }

  const head = document.getElementById('ih-note-head');
  const body = document.getElementById('ih-note-body');
  if (note) {
    if (note.title) head.textContent = note.title;
    body.textContent = note.body;
  } else {
    // nothing posted yet, so say something rather than sit empty
    body.textContent = 'Everything here is something I made or something I love. Poke around.';
  }
}

if (isMobile()) {
  initIhCd();
  initIhFits();
  initIhNote();
}


/* ══════════════════════════════════════════════════════════════════
   MOTION LAYER
   Cursor parallax, the desktop read-me note, and mobile scroll life.
   All of it bails out if the visitor asked for reduced motion.
   ══════════════════════════════════════════════════════════════════ */

const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Cursor parallax: the desk shifts a little as you move over it ── */
(function initParallax() {
  if (prefersReducedMotion) return;
  const desk = document.querySelector('.desktop');
  if (!desk) return;

  let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

  function frame() {
    // ease toward the pointer so it glides instead of snapping
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    desk.style.setProperty('--mx', cx.toFixed(4));
    desk.style.setProperty('--my', cy.toFixed(4));
    raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001)
      ? requestAnimationFrame(frame)
      : null;
  }

  window.addEventListener('mousemove', e => {
    if (isMobile()) return;
    tx = (e.clientX / window.innerWidth  - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });

  // drift back to centre when the cursor leaves the window
  window.addEventListener('mouseleave', () => {
    tx = 0; ty = 0;
    if (!raf) raf = requestAnimationFrame(frame);
  });
})();

/* ── The read-me note: drag it, close it, get it back from the "?" ── */
(function initDesktopNote() {
  const note   = document.getElementById('desktop-note');
  const close  = document.getElementById('dn-close');
  const reopen = document.getElementById('dn-reopen');
  if (!note) return;

  close?.addEventListener('click', e => {
    e.stopPropagation();
    note.classList.add('dn-hidden');
  });

  reopen?.addEventListener('click', () => {
    note.classList.remove('dn-hidden');
  });

  // drag, same feel as the folders
  let ndx = 0, ndy = 0, ndragging = false;

  note.addEventListener('mousedown', e => {
    if (isMobile() || e.target.closest('.dn-close')) return;
    const r = note.getBoundingClientRect();
    // hand positioning over to left/top so dragging is absolute
    note.style.animation = 'none';
    note.style.translate = '0 0';
    note.style.bottom = 'auto';
    note.style.left = r.left + 'px';
    note.style.top  = r.top  + 'px';
    ndx = e.clientX - r.left;
    ndy = e.clientY - r.top;
    ndragging = true;
    note.classList.add('dn-dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!ndragging) return;
    const pad = 8;
    const maxX = window.innerWidth  - note.offsetWidth  - pad;
    const maxY = window.innerHeight - note.offsetHeight - pad;
    note.style.left = Math.max(pad, Math.min(maxX, e.clientX - ndx)) + 'px';
    note.style.top  = Math.max(38,  Math.min(maxY, e.clientY - ndy)) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!ndragging) return;
    ndragging = false;
    note.classList.remove('dn-dragging');
  });
})();

/* ── Mobile: wallpaper drifts on scroll, cards reveal as they arrive ── */
(function initMobileMotion() {
  if (!isMobile() || prefersReducedMotion) return;
  const home = document.querySelector('.iphone-home');
  if (!home) return;

  // parallax the wallpaper at roughly a third of scroll speed
  let ticking = false;
  home.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      home.style.setProperty('--scrollShift', (home.scrollTop * 0.28) + 'px');
      ticking = false;
    });
  }, { passive: true });

  // anything scrolled into view fades up once
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('seen');
        io.unobserve(en.target);
      }
    });
  }, { root: home, threshold: 0.12 });

  // only tag what sits below the fold, so the top of the page never flashes
  requestAnimationFrame(() => {
    const fold = window.innerHeight * 0.94;
    document.querySelectorAll(
      '.ih-widget-row, .ih-cd, .ih-grid, .ih-dots'
    ).forEach(el => {
      if (el.getBoundingClientRect().top > fold) {
        el.style.animation = 'none';
        el.classList.add('reveal');
        io.observe(el);
      }
    });
  });
})();
