import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import cron from 'node-cron';

// Config
import pool from './config/db.js';

// Middlewares
import { generalLimiter } from './middleware/rateLimiter.js';

// Services
import { syncProducts } from './services/googleSheetsService.js';

// Routes
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import checkoutRoutes from './routes/checkoutRoutes.js';
import { razorpayWebhook } from './controllers/checkoutController.js';
import { sendAdminAbandonedDigestEmail } from './services/emailService.js';
import bookFinderRoutes from './routes/bookFinderRoutes.js';
import pincodeRoutes from './routes/pincodeRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Enable gzip/brotli response compression for all routes
app.use(compression());

// Razorpay webhook: must receive the raw body (unparsed) so its signature can be checked.
// Registered before express.json() and before the rate limiter; it is protected by the signature instead.
app.post('/api/checkout/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

// Parsing JSON bodies
app.use(express.json());

// Apply general API rate limiting to all routes
app.use(generalLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1');
    return res.status(200).json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    return res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Map API Routes
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/book-finder', bookFinderRoutes);
app.use('/api/pincode', pincodeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// SEO Routes: robots.txt and sitemap.xml
let sitemapCache = null;
let sitemapCacheTime = 0;
const SITEMAP_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Same rules as frontend/public/robots.txt (the host serves that file directly when it exists)
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`# Mindfuels Publisher - robots.txt
# https://mindfuelspublisher.com

User-agent: Googlebot
User-agent: Bingbot
User-agent: Applebot
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: *
Allow: /
Allow: /api/products
Disallow: /admin
Disallow: /profile
Disallow: /cart
Disallow: /api/
Disallow: /health

Sitemap: https://mindfuelspublisher.com/sitemap.xml
`);
});

app.get('/sitemap.xml', async (req, res) => {
  res.type('application/xml');

  if (sitemapCache && (Date.now() - sitemapCacheTime < SITEMAP_CACHE_DURATION)) {
    return res.send(sitemapCache);
  }

  const baseUrl = process.env.FRONTEND_URL || 'https://mindfuelspublisher.com';
  const now = new Date().toISOString().split('T')[0];

  let productUrls = '';
  try {
    // products has no is_active or updated_at column, so every product is listed with today's date
    const [products] = await pool.query('SELECT product_id FROM products LIMIT 500');
    if (products && products.length > 0) {
      productUrls = products.map(p => {
        const lastmod = now;
        return `  <url>
    <loc>${baseUrl}/products?product=${encodeURIComponent(p.product_id)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }).join('\n');
    }
  } catch (err) {
    console.warn('[SEO] Failed to fetch products for sitemap:', err.message);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/book-finder</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/products</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/legal_pages</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>
  <url>
    <loc>${baseUrl}/cart</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
${productUrls}
</urlset>`.trim();

  sitemapCache = sitemap;
  sitemapCacheTime = Date.now();
  return res.send(sitemap);
});

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend files if found (Hostinger deployment support)
const candidatePaths = [
  path.join(__dirname, 'public'),
  path.join(__dirname, '../public_html'),
  path.join(__dirname, '../../public_html'),
  '/home/u241066033/domains/mindfuelspublisher.com/public_html',
  '/home/u241066033/public_html',
  path.join(__dirname, '../frontend/dist')
];

// Ensure index.html actually exists in the selected directory
const staticPath = candidatePaths.find(p => fs.existsSync(path.join(p, 'index.html')));

if (staticPath) {
  console.log(`[Server] Serving frontend static assets from: ${staticPath}`);
  app.use(express.static(staticPath, {
    etag: true,
    lastModified: true,
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        // Vite adds a content hash to these filenames, so they can be cached forever
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('.html')) {
        // Always revalidate HTML so visitors get the latest deploy
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        // Photos, videos, favicon: cache for a week but allow updates
        res.setHeader('Cache-Control', 'public, max-age=604800');
      }
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/robots.txt' || req.path === '/sitemap.xml') return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(staticPath, 'index.html'), (err) => {
      if (err) {
        res.status(404).json({ error: 'Page not found' });
      }
    });
  });
} else {
  // 404 Route handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  
  // Auth0 JWT check error responses
  if (err.name === 'UnauthorizedError' || err.code === 'FST_JWT_UNAUTHORIZED' || err.status === 401) {
    return res.status(401).json({ error: 'Invalid or missing authentication token.' });
  }
  
  return res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start scheduled product catalog synchronization (cron job: every 30 minutes)
cron.schedule('*/30 * * * *', async () => {
  console.log('[CRON] Starting scheduled Google Sheets catalog sync...');
  try {
    const result = await syncProducts();
    console.log('[CRON] Product sync successful:', result.message);
  } catch (error) {
    console.error('[CRON] Product sync failed:', error.message);
  }
});

// Owner digest every day at 9:00 IST: carts left behind (2–24 h idle) and checkouts not paid (last 24 h).
// Owner-only email. Each cart/checkout falls into exactly one digest, so nothing repeats.
async function sendAbandonedDigest() {
  try {
    const [carts] = await pool.query(`
      SELECT u.name, u.email, u.phone, COUNT(c.product_id) AS item_count,
             COALESCE(SUM(p.sp * c.quantity), 0) AS cart_value
      FROM cart c
      JOIN users u ON u.id = c.user_id
      JOIN products p ON p.product_id = c.product_id
      GROUP BY u.id, u.name, u.email, u.phone
      HAVING MAX(c.added_at) BETWEEN NOW() - INTERVAL 24 HOUR AND NOW() - INTERVAL 2 HOUR
      ORDER BY MAX(c.added_at) DESC
    `);
    const [unpaid] = await pool.query(`
      SELECT o.id, o.total_amount, o.created_at, u.name, u.email
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.payment_status = 'Unpaid'
        AND o.created_at BETWEEN NOW() - INTERVAL 24 HOUR AND NOW() - INTERVAL 30 MINUTE
      ORDER BY o.created_at DESC
    `);
    if (carts.length === 0 && unpaid.length === 0) return;
    await sendAdminAbandonedDigestEmail({ carts, unpaid });
  } catch (error) {
    console.error('[Digest] Owner digest failed:', error.message);
  }
}
cron.schedule('0 9 * * *', sendAbandonedDigest, { timezone: 'Asia/Kolkata' });

// Run an initial sync on startup — NON-BLOCKING so the server accepts requests immediately
const runInitialSync = () => {
  console.log('[Startup] Queuing initial Google Sheet product catalog sync (non-blocking)...');
  syncProducts()
    .then(() => console.log('[Startup] Initial product catalog sync completed successfully.'))
    .catch((error) => console.error('[Startup] Initial product catalog sync failed (checking credentials):', error.message));
};

app.listen(PORT, () => {
  console.log(`Server running in production-grade mode on port ${PORT}`);
  runInitialSync();
});
