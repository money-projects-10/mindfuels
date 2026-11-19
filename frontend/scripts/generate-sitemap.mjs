// Rebuilds public/sitemap.xml from the live book list (read-only) plus the category pages.
// Run from the frontend folder whenever books are added or removed in the Google Sheet:
//   node scripts/generate-sitemap.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://mindfuelspublisher.com';
const today = new Date().toISOString().split('T')[0];

// Keep in step with the filter lists in src/pages/AllProducts.jsx
const classes = [
  'Early Foundation (Pre Nursery & Nursery)',
  'Kindergarten Years (U.K.G & L.K.G)',
  'Lower Primary (Class 1 & 2)',
  'Upper Primary (Class 3 & 4)',
  'Middle School (Class 5 & 6)',
];
const interests = ['Story Books', 'Rhymes & Poems', 'Activity Books', 'Calligraphy & Cursive', 'Art & Creativity', 'Phonetics', 'All-Subject Activity Books'];
const subjects = ['English', 'Hindi', 'Mathematics', 'Science & Computer', 'Mental Ability & GK', 'All-in-One'];

const books = [];
for (let page = 1; ; page++) {
  const res = await fetch(`${SITE}/api/products?limit=50&page=${page}`);
  if (!res.ok) throw new Error(`Could not read the book list (page ${page}): HTTP ${res.status}`);
  const data = await res.json();
  books.push(...data.products);
  if (page >= data.pagination.totalPages) break;
}

const query = (key, value) => `${SITE}/products?${new URLSearchParams({ [key]: value })}`;
const xmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const entry = (loc, changefreq, priority) =>
  `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

const urls = [
  entry(`${SITE}/`, 'daily', '1.0'),
  entry(`${SITE}/products`, 'daily', '0.9'),
  ...classes.map((v) => entry(query('class', v), 'weekly', '0.8')),
  ...subjects.map((v) => entry(query('subject', v), 'weekly', '0.8')),
  ...interests.map((v) => entry(query('interest', v), 'weekly', '0.8')),
  ...books
    .filter((b) => !/^DEMO/i.test(b.product_id))
    .map((b) => entry(query('product', b.product_id), 'weekly', '0.7')),
  entry(`${SITE}/legal_pages`, 'monthly', '0.4'),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(here, '..', 'public', 'sitemap.xml'), xml);
console.log(`sitemap.xml written: ${urls.length} pages (${books.length} books read)`);
