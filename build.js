#!/usr/bin/env node
// Penjana laman statik syarahBukhari.
// Baca content/*.json -> hasilkan laman HTML dalam _site/
// Guna: node build.js   (tiada dependency luar)

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, '_site');

// ---------- util ----------
const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const slugify = (s = '') =>
  String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ebook';

const paras = (s = '') =>
  String(s)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');

function youtubeId(url = '') {
  url = String(url).trim();
  if (!url) return '';
  if (/^[\w-]{11}$/.test(url)) return url;
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : '';
}

// Laluan media: "/uploads/x.pdf" atau "uploads/x.pdf" -> relatif kepada akar laman.
// Pautan penuh (https://...) dibiarkan.
const media = (p, base) => {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  return base + String(p).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
};

// Alamat penuh laman (diisi oleh GitHub Actions) untuk pratonton pautan WhatsApp/Facebook
// Versi aset (cap jari kandungan) supaya browser tidak guna fail CSS/JS lama dalam cache
const crypto = require('crypto');
const ver = (f) => crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, f))).digest('hex').slice(0, 8);
const V_CSS = ver('assets/style.css');
const V_JS = ver('assets/reader.js');

const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');
const absMedia = (p) => (!p ? '' : /^https?:\/\//i.test(p) ? p : SITE_URL ? media(p, SITE_URL + '/') : '');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function write(rel, html) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
}

// ---------- baca kandungan ----------
const tetapan = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/tetapan.json'), 'utf8'));
const SITE = tetapan.nama_laman || 'syarahBukhari';

const kitabDir = path.join(ROOT, 'content/kitab');
const kitabList = fs
  .readdirSync(kitabDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const data = JSON.parse(fs.readFileSync(path.join(kitabDir, f), 'utf8'));
    const slug = slugify(path.basename(f, '.json'));
    const used = new Set();
    const ebooks = (data.ebooks || [])
      .filter((e) => e && e.tajuk && e.terbit !== false)
      .map((e) => {
        let s = slugify(e.tajuk);
        let n = 2;
        while (used.has(s)) s = `${slugify(e.tajuk)}-${n++}`;
        used.add(s);
        return { ...e, slug: s, vid: youtubeId(e.youtube), short: /\/shorts\//.test(e.youtube || '') };
      });
    return { ...data, slug, ebooks };
  })
  .sort((a, b) => (a.urutan ?? 999) - (b.urutan ?? 999) || String(a.tajuk).localeCompare(String(b.tajuk)));

// ---------- templat ----------
const ICON = {
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
};

function layout({ base, title, desc, body, image = '', extraHead = '' }) {
  const fullTitle = title ? `${title} · ${SITE}` : SITE;
  return `<!doctype html>
<html lang="ms">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc || tetapan.slogan)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc || tetapan.slogan)}">
<meta property="og:type" content="website">${image ? `\n<meta property="og:image" content="${esc(image)}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<meta name="theme-color" content="#5a2650">
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}assets/style.css?v=${V_CSS}">
${extraHead}
</head>
<body>
<header class="topbar">
  <div class="wrap topbar-in">
    <a class="brand" href="${base}index.html"><span class="brand-mark">${ICON.book}</span>${esc(SITE)}</a>
    <nav><a href="${base}index.html#kitab">Kitab</a><a href="${base}index.html#tentang">Tentang</a></nav>
  </div>
</header>
<main>
${body}
</main>
<footer class="foot">
  <div class="wrap">
    <p class="foot-name">${esc(SITE)}</p>
    <p>Diringkaskan daripada <em>Shahih Bukhari bersama Terjemahan dan Ulasan</em> — Maulana Muhammad Asri Yusoff.</p>
    <p>${esc(tetapan.kredit || '')}${tetapan.hubungi ? ` · <a href="${esc(/^[^@\s]+@[^@\s]+$/.test(tetapan.hubungi) ? 'mailto:' + tetapan.hubungi : tetapan.hubungi)}">Hubungi kami</a>` : ''}</p>
    <p class="foot-small">Semua ebook dan video di laman ini percuma untuk dibaca, dimuat turun dan dikongsi.</p>
  </div>
</footer>
</body>
</html>`;
}

const ebookCard = (k, e, i, base) => `
<a class="ecard" href="${base}kitab/${k.slug}/${e.slug}/index.html" data-search="${esc(`${e.tajuk} ${e.subtajuk || ''} ${k.tajuk}`.toLowerCase())}">
  ${e.kulit
    ? `<span class="ecard-cover"><img src="${esc(media(e.kulit, base))}" alt="" width="76" height="122" loading="lazy" style="width:76px;height:auto;max-width:100%"><span class="ecard-badge">${String(i + 1).padStart(2, '0')}</span></span>`
    : `<span class="ecard-num">${String(i + 1).padStart(2, '0')}</span>`}
  <span class="ecard-body">
    <span class="ecard-kitab">${esc(k.tajuk)}</span>
    <span class="ecard-title">${esc(e.tajuk)}</span>
    ${e.subtajuk ? `<span class="ecard-sub">${esc(e.subtajuk)}</span>` : ''}
    <span class="ecard-tags">
      <span class="tag ${e.pdf ? 'on' : ''}">${ICON.book}${e.pdf ? 'Ebook' : 'Ebook akan datang'}</span>
      <span class="tag ${e.vid ? 'on' : ''}">${ICON.play}${e.vid ? 'Video' : 'Video akan datang'}</span>
    </span>
  </span>
</a>`;

// ---------- laman utama ----------
function homePage() {
  const base = '';
  const totalEbook = kitabList.reduce((n, k) => n + k.ebooks.length, 0);
  const totalVideo = kitabList.reduce((n, k) => n + k.ebooks.filter((e) => e.vid).length, 0);
  const body = `
<section class="hero">
  <div class="wrap hero-in">
    <p class="hero-ar" lang="ar" dir="rtl">شرح صحيح البخاري</p>
    <h1>${esc(SITE)}</h1>
    <p class="hero-lead">${esc(tetapan.slogan)}</p>
    <div class="hero-stats">
      <span><b>${kitabList.length}</b> kitab</span>
      <span><b>${totalEbook}</b> ebook</span>
      <span><b>${totalVideo}</b> video</span>
    </div>
    <a class="btn btn-light" href="#kitab">Mula membaca</a>
  </div>
</section>

<section class="wrap section" id="kitab">
  <div class="section-head">
    <h2>Senarai Kitab</h2>
    <label class="search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input type="search" id="cari" placeholder="Cari ebook…" aria-label="Cari ebook">
    </label>
  </div>
  ${kitabList
    .map(
      (k) => `
  <div class="kitab" data-kitab>
    <div class="kitab-head">
      <div>
        <p class="kitab-no">Kitab ${esc(k.urutan ?? '')}</p>
        <h3><a href="kitab/${k.slug}/index.html">${esc(k.tajuk)}</a></h3>
        ${k.penerangan ? `<p class="muted">${esc(k.penerangan)}</p>` : ''}
      </div>
      ${k.tajuk_arab ? `<p class="kitab-ar" lang="ar" dir="rtl">${esc(k.tajuk_arab)}</p>` : ''}
    </div>
    <div class="egrid">
      ${k.ebooks.map((e, i) => ebookCard(k, e, i, base)).join('')}
    </div>
  </div>`
    )
    .join('')}
  <p class="empty" id="tiada" hidden>Tiada ebook yang sepadan dengan carian.</p>
</section>

<section class="about" id="tentang">
  <div class="wrap about-in">
    <h2>Tentang laman ini</h2>
    <div class="prose">${paras(tetapan.pengenalan)}</div>
  </div>
</section>

<script>
(function(){
  var q=document.getElementById('cari'); if(!q) return;
  q.addEventListener('input',function(){
    var t=q.value.trim().toLowerCase(), any=false;
    document.querySelectorAll('[data-kitab]').forEach(function(k){
      var shown=0;
      k.querySelectorAll('.ecard').forEach(function(c){
        var ok=!t||c.dataset.search.indexOf(t)>-1; c.hidden=!ok; if(ok) shown++;
      });
      k.hidden=!shown; if(shown) any=true;
    });
    document.getElementById('tiada').hidden=any;
  });
})();
</script>`;
  write('index.html', layout({ base, title: '', body }));
}

// ---------- laman kitab ----------
function kitabPage(k) {
  const base = '../../';
  const body = `
<section class="phead">
  <div class="wrap">
    <nav class="crumb"><a href="${base}index.html">Utama</a><span>/</span><span>${esc(k.tajuk)}</span></nav>
    <p class="kitab-no light">Kitab ${esc(k.urutan ?? '')}</p>
    <h1>${esc(k.tajuk)}</h1>
    ${k.tajuk_arab ? `<p class="phead-ar" lang="ar" dir="rtl">${esc(k.tajuk_arab)}</p>` : ''}
    ${k.penerangan ? `<p class="phead-lead">${esc(k.penerangan)}</p>` : ''}
  </div>
</section>
<section class="wrap section">
  <div class="egrid">
    ${k.ebooks.map((e, i) => ebookCard(k, e, i, base)).join('') || '<p class="empty">Ebook akan dimuat naik tidak lama lagi.</p>'}
  </div>
</section>`;
  write(`kitab/${k.slug}/index.html`, layout({ base, title: k.tajuk, desc: k.penerangan, body }));
}

// ---------- laman ebook ----------
function ebookPage(k, e, i) {
  const base = '../../../';
  const prev = k.ebooks[i - 1];
  const next = k.ebooks[i + 1];
  const pdf = media(e.pdf, base);
  const pdfName = `${SITE} - ${k.tajuk} - ${e.tajuk}.pdf`;
  const title = `${e.tajuk} — ${k.tajuk}`;
  const desc = e.ringkasan || e.subtajuk || `${e.tajuk}, ${k.tajuk}. Ebook dan video penerangan percuma.`;

  const video = e.vid
    ? `<div class="video${e.short ? ' video-short' : ''}"><iframe src="https://www.youtube-nocookie.com/embed/${e.vid}?rel=0" title="Video: ${esc(e.tajuk)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`
    : `<div class="video video-empty"><span class="ve-icon">${ICON.play}</span><p>Video penerangan akan datang, insya-Allah.</p></div>`;

  const reader = pdf
    ? `<div class="reader-bar">
        <span class="reader-title">${ICON.book} Baca ebook</span>
        <span class="reader-actions">
          <a class="btn btn-plum" href="${esc(pdf)}" download="${esc(pdfName)}">${ICON.down}Muat turun PDF</a>
          <a class="btn btn-ghost" href="${esc(pdf)}" target="_blank" rel="noopener">${ICON.open}Buka penuh</a>
        </span>
      </div>
      <div class="reader" id="reader" data-pdf="${esc(pdf)}">
        <p class="reader-status" id="reader-status">Memuatkan ebook…</p>
      </div>`
    : `<div class="reader reader-empty"><span class="ve-icon">${ICON.book}</span><p>Ebook ini akan dimuat naik tidak lama lagi, insya-Allah.</p></div>`;

  const pageUrlNote = `${e.tajuk} (${k.tajuk}) — ebook & video percuma di ${SITE}`;

  const body = `
<section class="phead">
  <div class="wrap">
    <nav class="crumb"><a href="${base}index.html">Utama</a><span>/</span><a href="../index.html">${esc(k.tajuk)}</a><span>/</span><span>${esc(e.tajuk)}</span></nav>
    <p class="kitab-no light">${esc(k.tajuk)} · ${i + 1} daripada ${k.ebooks.length}</p>
    <h1>${esc(e.tajuk)}</h1>
    ${e.subtajuk ? `<p class="phead-lead">${esc(e.subtajuk)}</p>` : ''}
  </div>
</section>
<section class="wrap section ebook">
  ${video}
  ${e.ringkasan ? `<div class="prose summary">${paras(e.ringkasan)}</div>` : ''}
  ${reader}
  <div class="share">
    <a class="btn btn-ghost" id="kongsi" href="https://wa.me/?text=${encodeURIComponent(pageUrlNote)}" target="_blank" rel="noopener" data-text="${esc(pageUrlNote)}">${ICON.share}Kongsi di WhatsApp</a>
  </div>
  <nav class="pager">
    ${prev ? `<a class="pager-l" href="../${prev.slug}/index.html"><small>← Sebelum</small>${esc(prev.tajuk)}</a>` : '<span></span>'}
    ${next ? `<a class="pager-r" href="../${next.slug}/index.html"><small>Seterusnya →</small>${esc(next.tajuk)}</a>` : '<span></span>'}
  </nav>
</section>
<script>
(function(){var a=document.getElementById('kongsi');if(a)a.href='https://wa.me/?text='+encodeURIComponent(a.dataset.text+'\\n'+location.href);})();
</script>
${pdf ? `<script type="module" src="${base}assets/reader.js?v=${V_JS}"></script>` : ''}`;

  write(`kitab/${k.slug}/${e.slug}/index.html`, layout({ base, title, desc, body, image: absMedia(e.kulit) }));
}

// ---------- 404 ----------
// Dihidangkan dari sebarang laluan, jadi laman ini berdiri sendiri (gaya sebaris).
function notFound() {
  write('404.html', `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Tidak dijumpai · ${esc(SITE)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#faf7f2;color:#2b1a29;font:16px/1.6 system-ui,sans-serif;text-align:center;padding:16px}h1{color:#5a2650;font-weight:600}a{display:inline-block;margin-top:8px;background:#5a2650;color:#faf7f2;padding:10px 18px;border-radius:999px;text-decoration:none}</style></head>
<body><div><h1>Halaman tidak dijumpai</h1><p>Pautan ini mungkin telah berubah.</p><a id="home" href="/">Kembali ke laman utama</a></div>
<script>document.getElementById('home').href=location.pathname.split('/kitab/')[0].replace(/[^/]*$/,'')||'/';</script></body></html>`);
}

// ---------- bina ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));
copyDir(path.join(ROOT, 'uploads'), path.join(OUT, 'uploads'));
copyDir(path.join(ROOT, 'admin'), path.join(OUT, 'admin'));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

homePage();
let count = 0;
for (const k of kitabList) {
  kitabPage(k);
  k.ebooks.forEach((e, i) => {
    ebookPage(k, e, i);
    count++;
  });
}
notFound();

// Amaran untuk fail PDF yang tiada
for (const k of kitabList)
  for (const e of k.ebooks)
    if (e.pdf && !/^https?:/i.test(e.pdf) && !fs.existsSync(path.join(ROOT, e.pdf.replace(/^\/+/, ''))))
      console.warn(`AMARAN: fail PDF tidak dijumpai untuk "${k.tajuk} / ${e.tajuk}": ${e.pdf}`);

console.log(`Siap: ${kitabList.length} kitab, ${count} ebook -> _site/`);
