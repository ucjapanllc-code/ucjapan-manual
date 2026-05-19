/* ===================================
   UCJapan 宅建士実務マニュアル
   script.js
=================================== */

'use strict';

/* ---------- State ---------- */
const state = {
  headings: [],       // { id, text, level, el }
  searchIndex: [],    // { id, heading, text } — flat sections for Fuse.js
  fuse: null,
  searchActive: false,
};

/* ---------- DOM refs ---------- */
const $ = id => document.getElementById(id);
const menuToggle   = $('menu-toggle');
const sidebar      = $('sidebar');
const overlay      = $('overlay');
const tocEl        = $('toc');
const contentEl    = $('content');
const searchInput  = $('search-input');
const searchClear  = $('search-clear');
const searchResults = $('search-results');
const darkToggle   = $('dark-toggle');
const backToTop    = $('back-to-top');

/* ===================================
   1. DARK MODE
=================================== */
function initDarkMode() {
  const saved = localStorage.getItem('ucjapan-dark');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved !== null ? saved === 'true' : prefersDark;
  setDark(isDark, false);
}

function setDark(on, save = true) {
  document.body.classList.toggle('dark', on);
  darkToggle.textContent = on ? '☀️' : '🌙';
  darkToggle.title = on ? 'ライトモードに切り替え' : 'ダークモードに切り替え';
  if (save) localStorage.setItem('ucjapan-dark', on);
}

darkToggle.addEventListener('click', () => {
  setDark(!document.body.classList.contains('dark'));
});

/* ===================================
   2. SIDEBAR / MOBILE MENU
=================================== */
function openMenu() {
  sidebar.classList.add('open');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

menuToggle.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeMenu() : openMenu();
});

overlay.addEventListener('click', closeMenu);

/* ===================================
   3. MARKDOWN LOAD & RENDER
=================================== */
async function loadManual() {
  contentEl.innerHTML = `
    <div id="loading">
      <div class="spinner"></div>
      <div>マニュアルを読み込み中...</div>
    </div>`;

  try {
    const res = await fetch('content/manual.md');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();

    // Configure marked
    marked.setOptions({
      breaks: false,
      gfm: true,
    });

    // Custom renderer: add id attributes to headings
    const renderer = new marked.Renderer();
    renderer.heading = function(text, level) {
      const id = slugify(text);
      return `<h${level} id="${id}" class="anchor-target">${text}</h${level}>\n`;
    };

    const html = marked.parse(md, { renderer });
    contentEl.innerHTML = html;

    // Build TOC + search index after render
    buildTOC();
    buildSearchIndex();
    initScrollSpy();

    // Check URL hash
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) setTimeout(() => target.scrollIntoView(), 100);
    }

  } catch (err) {
    contentEl.innerHTML = `
      <div style="padding:40px;color:var(--color-danger)">
        <strong>⚠ マニュアルの読み込みに失敗しました</strong><br>
        <small>${err.message}</small><br><br>
        <small>このファイルをブラウザで直接開いている場合、ローカルサーバー経由でアクセスしてください:<br>
        <code>python3 -m http.server 8080</code></small>
      </div>`;
  }
}

/* ===================================
   4. TABLE OF CONTENTS
=================================== */
function slugify(text) {
  // Remove markdown formatting
  return text
    .replace(/[*`_~]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w　-鿿一-龯가-힯-]/g, '')
    .toLowerCase() || 'heading-' + Math.random().toString(36).slice(2);
}

function buildTOC() {
  const headings = contentEl.querySelectorAll('h1, h2, h3');
  state.headings = [];
  tocEl.innerHTML = '';

  headings.forEach(el => {
    const level = parseInt(el.tagName[1]);
    const text = el.textContent;
    const id = el.id || slugify(text);
    el.id = id;

    state.headings.push({ id, text, level, el });

    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = text;
    a.dataset.level = level;
    a.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      history.pushState(null, '', `#${id}`);
      // Close mobile menu after click
      if (window.innerWidth <= 768) closeMenu();
    });
    tocEl.appendChild(a);
  });
}

/* ===================================
   5. SCROLL SPY
=================================== */
function initScrollSpy() {
  if (!state.headings.length) return;

  const tocLinks = tocEl.querySelectorAll('a');
  const headingEls = state.headings.map(h => h.el);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        tocLinks.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, {
    rootMargin: '-60px 0px -70% 0px',
    threshold: 0,
  });

  headingEls.forEach(el => observer.observe(el));
}

/* ===================================
   6. SEARCH (Fuse.js)
=================================== */
function buildSearchIndex() {
  // Build per-section search index: each h2/h3 section is one entry
  const nodes = Array.from(contentEl.children);
  const index = [];

  let currentHeading = { id: '', heading: 'マニュアル', text: '' };

  nodes.forEach(node => {
    const tag = node.tagName?.toLowerCase();
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      if (currentHeading.text.trim()) {
        index.push({ ...currentHeading });
      }
      currentHeading = {
        id: node.id,
        heading: node.textContent,
        text: '',
      };
    } else {
      currentHeading.text += ' ' + (node.textContent || '');
    }
  });

  if (currentHeading.text.trim()) {
    index.push({ ...currentHeading });
  }

  state.searchIndex = index;

  if (typeof Fuse !== 'undefined') {
    state.fuse = new Fuse(index, {
      keys: [
        { name: 'heading', weight: 0.6 },
        { name: 'text',    weight: 0.4 },
      ],
      includeMatches: true,
      threshold: 0.35,
      minMatchCharLength: 2,
    });
  }
}

function performSearch(query) {
  query = query.trim();

  if (!query) {
    hideSearchResults();
    return;
  }

  searchClear.style.display = 'block';

  if (!state.fuse) {
    // Fuse not loaded yet — simple text search fallback
    simpleSearch(query);
    return;
  }

  const results = state.fuse.search(query, { limit: 10 });

  if (!results.length) {
    showSearchResults(`<div style="padding:16px;text-align:center;color:var(--color-text-mute);font-size:13px">「${escHtml(query)}」に一致する箇所が見つかりませんでした</div>`, 0);
    return;
  }

  let html = '';
  results.forEach(r => {
    const item = r.item;
    const snippet = buildSnippet(item.text, query, 100);
    html += `<div class="search-result-item" data-id="${escAttr(item.id)}">
      <div class="search-result-title">${escHtml(item.heading)}</div>
      <div class="search-result-snippet">${snippet}</div>
    </div>`;
  });

  showSearchResults(html, results.length);
}

function simpleSearch(query) {
  const q = query.toLowerCase();
  const hits = state.searchIndex.filter(item =>
    item.heading.toLowerCase().includes(q) || item.text.toLowerCase().includes(q)
  ).slice(0, 10);

  if (!hits.length) {
    showSearchResults(`<div style="padding:16px;text-align:center;color:var(--color-text-mute);font-size:13px">「${escHtml(query)}」に一致する箇所が見つかりませんでした</div>`, 0);
    return;
  }

  let html = '';
  hits.forEach(item => {
    const snippet = buildSnippet(item.text, query, 100);
    html += `<div class="search-result-item" data-id="${escAttr(item.id)}">
      <div class="search-result-title">${escHtml(item.heading)}</div>
      <div class="search-result-snippet">${snippet}</div>
    </div>`;
  });

  showSearchResults(html, hits.length);
}

function showSearchResults(html, count) {
  searchResults.innerHTML =
    `<div id="search-results-header">${count ? count + ' 件の結果' : '結果なし'}</div>` + html;

  searchResults.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        history.pushState(null, '', `#${id}`);
      }
      hideSearchResults();
      searchInput.value = '';
      searchClear.style.display = 'none';
    });
  });

  searchResults.classList.add('active');
  state.searchActive = true;
}

function hideSearchResults() {
  searchResults.classList.remove('active');
  state.searchActive = false;
}

function buildSnippet(text, query, maxLen) {
  const q = query.toLowerCase();
  const t = text.trim().replace(/\s+/g, ' ');
  const idx = t.toLowerCase().indexOf(q);

  let snippet;
  if (idx >= 0) {
    const start = Math.max(0, idx - 40);
    const end = Math.min(t.length, idx + q.length + 60);
    snippet = (start > 0 ? '…' : '') + t.slice(start, end) + (end < t.length ? '…' : '');
  } else {
    snippet = t.slice(0, maxLen) + (t.length > maxLen ? '…' : '');
  }

  // Highlight query in snippet
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escHtml(snippet).replace(
    new RegExp(escHtml(query), 'gi'),
    m => `<mark>${m}</mark>`
  );
}

/* Search events */
let searchDebounce = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => performSearch(searchInput.value), 200);
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    hideSearchResults();
    searchInput.value = '';
    searchClear.style.display = 'none';
  }
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.style.display = 'none';
  hideSearchResults();
});

document.addEventListener('click', e => {
  if (state.searchActive && !searchResults.contains(e.target) && !searchInput.contains(e.target)) {
    hideSearchResults();
  }
});

/* ===================================
   7. BACK TO TOP
=================================== */
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ===================================
   8. UTILS
=================================== */
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return str.replace(/"/g, '&quot;');
}

/* ===================================
   9. INIT
=================================== */
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  loadManual();
});
