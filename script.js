// Clock
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
        <div class="modal-btn close js-close"></div>
        <div class="modal-btn min"></div>
        <div class="modal-btn max"></div>
        <span class="modal-title">Music</span>
      </div>
      <div class="modal-body music-body">
        <div class="music-grid">
          ${musicProjects.map((p, i) => `
            <div class="project-card" style="background:${p.color};" data-project-index="${i}">
              <div class="project-emoji">${p.emoji}</div>
              <div class="project-title">${p.title}</div>
              <div class="project-tag">open ↗</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  mountModal(overlay);

  overlay.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => {
      const p = musicProjects[card.dataset.projectIndex];
      overlay.remove();
      setTimeout(() => openProjectDetail(p), 160);
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
          <div class="modal-btn close js-close"></div>
          <div class="modal-btn min"></div>
          <div class="modal-btn max"></div>
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
        <div class="modal-btn close js-close"></div>
        <div class="modal-btn min"></div>
        <div class="modal-btn max"></div>
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
  mountModal(overlay);

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
  lb.addEventListener('click', () => lb.remove());
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
        <div class="modal-btn close js-close"></div>
        <div class="modal-btn min"></div>
        <div class="modal-btn max"></div>
        <span class="modal-title">Design</span>
      </div>
      <div class="design-body">
        <p class="design-section-title">Work</p>
        <div class="design-grid">
          ${projects.length ? projects.map(p => `
            <div class="design-card">
              <div class="design-preview" style="background:${p.color || '#FFE7AB'};">
                ${p.images?.[0]?.asset?._ref
                  ? `<img src="${imageUrl(p.images[0].asset._ref)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" alt=""/>`
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
  mountModal(overlay);
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
    const multiMedia = mediaItems.length > 1;

    const mediaHTML = multiMedia
      ? `<div class="til-multi-media">${mediaItems.map(renderMediaItem).join('')}</div>`
      : mediaItems.length === 1
        ? renderMediaItem(mediaItems[0])
        : `<div class="til-polaroid-media"><div class="til-polaroid-placeholder">📷</div></div>`;

    return `
      <div class="til-polaroid${multiMedia ? ' til-multi' : ''}">
        ${mediaHTML}
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
        <div class="modal-btn close js-close"></div>
        <div class="modal-btn min"></div>
        <div class="modal-btn max"></div>
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

  mountModal(overlay);

  overlay.querySelectorAll('.til-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.til-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      overlay.querySelector('#til-grid').innerHTML = buildGrid(btn.dataset.cat);
    });
  });
}

function mountModal(overlay) {
  document.body.appendChild(overlay);
  const close = () => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.15s';
    setTimeout(() => {
      overlay.remove();
    }, 150);
  };
  overlay.querySelector('.js-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
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
