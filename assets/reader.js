// Pembaca PDF dalam laman (pdf.js). Berfungsi di telefon & komputer.
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

const box = document.getElementById('reader');
const status = document.getElementById('reader-status');

async function start() {
  const url = box.dataset.pdf;
  let doc;
  try {
    doc = await pdfjsLib.getDocument({ url }).promise;
  } catch (err) {
    status.innerHTML = 'Ebook tidak dapat dipaparkan di sini. Sila guna butang <b>Muat turun PDF</b> di atas.';
    console.error(err);
    return;
  }
  status.remove();

  const first = await doc.getPage(1);
  const v1 = first.getViewport({ scale: 1 });
  const ratio = v1.height / v1.width;

  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const el = document.createElement('div');
    el.className = 'reader-page';
    el.dataset.n = n;
    el.style.aspectRatio = `1 / ${ratio}`;
    el.innerHTML = `<span class="pno">${n} / ${doc.numPages}</span>`;
    box.appendChild(el);
    pages.push(el);
  }

  const rendered = new Map();
  async function render(el) {
    const n = +el.dataset.n;
    const w = Math.round(el.clientWidth * Math.min(window.devicePixelRatio || 1, 2.5));
    if (rendered.get(n) === w) return;
    rendered.set(n, w);
    const page = await doc.getPage(n);
    const vp0 = page.getViewport({ scale: 1 });
    el.style.aspectRatio = `${vp0.width} / ${vp0.height}`;
    const vp = page.getViewport({ scale: w / vp0.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    el.querySelector('canvas')?.remove();
    el.prepend(canvas);
  }

  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && render(e.target)),
    { root: box, rootMargin: '600px 0px' }
  );
  pages.forEach((p) => io.observe(p));

  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      pages.forEach((p) => {
        const r = p.getBoundingClientRect();
        const b = box.getBoundingClientRect();
        if (r.bottom > b.top - 600 && r.top < b.bottom + 600) render(p);
      });
    }, 250);
  });
}

if (box) start();
