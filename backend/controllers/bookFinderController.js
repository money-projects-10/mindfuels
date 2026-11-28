import crypto from 'crypto';
import pool from '../config/db.js';
import { CLASS_BANDS, FOCUS_AREAS, MAX_NAME_LENGTH, findBand } from '../config/bookFinder.js';
import { recommendProducts, explainResults } from '../services/bookFinderService.js';
import { sendBookFinderListEmail, sendSchoolEnquiryAlert } from '../services/emailService.js';

const SITE_URL = process.env.FRONTEND_URL || 'https://mindfuelspublisher.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USER_TYPES = ['parent', 'teacher', 'school'];

// ---- helpers --------------------------------------------------------------

/** Accepts "a,b" or ["a","b"] and keeps only known keys. */
const parseKeys = (value, allowed) => {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  const clean = list.map(v => String(v).trim()).filter(Boolean);
  return [...new Set(clean)].filter(k => allowed.includes(k));
};
const bandKeys = () => CLASS_BANDS.map(b => b.key);
const focusKeys = () => FOCUS_AREAS.map(f => f.key);

const cleanText = (value, max) => String(value ?? '').trim().slice(0, max);

const unsubscribeToken = (email) => {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(email.toLowerCase()).digest('hex');
};

// CSV cells: quote, escape quotes, and neutralise spreadsheet formulas (=, +, -, @)
const csvCell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

// ---- public: recommendations ----------------------------------------------

/** GET /api/book-finder/recommendations?class=early,kg&focus=reading,maths */
export const getRecommendations = async (req, res) => {
  try {
    const bands = parseKeys(req.query.class, bandKeys());
    const focus = parseKeys(req.query.focus, focusKeys());
    if (bands.length === 0) {
      return res.status(400).json({ error: 'Please choose a class.' });
    }

    const result = await recommendProducts({ bandKeys: bands, focusKeys: focus });
    return res.status(200).json({
      level: result.level,
      explanation: explainResults(result),
      classes: result.bands.map(b => ({ key: b.key, label: b.label, ages: b.ages })),
      focus: result.focuses.map(f => ({ key: f.key, label: f.label })),
      products: result.products
    });
  } catch (error) {
    console.error('[BookFinder] Recommendation failed:', error);
    return res.status(500).json({ error: 'Could not load recommendations. Please try again.' });
  }
};

// ---- public: lead capture -------------------------------------------------

/** POST /api/book-finder/leads */
export const createLead = async (req, res) => {
  try {
    const body = req.body || {};

    // Honeypot: real people never fill this hidden field. Pretend success so bots move on.
    if (cleanText(body.website, 200) !== '') {
      return res.status(200).json({ ok: true });
    }

    const email = cleanText(body.email, 255).toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (body.consent !== true) {
      return res.status(400).json({ error: 'Please tick the box so we can send your list.' });
    }

    const userType = cleanText(body.user_type, 20);
    if (!USER_TYPES.includes(userType)) {
      return res.status(400).json({ error: 'Please choose parent, teacher or school.' });
    }

    const bands = parseKeys(body.classes ?? body.class, bandKeys());
    if (bands.length === 0) {
      return res.status(400).json({ error: 'Please choose a class.' });
    }
    if (userType !== 'school' && bands.length > 1) {
      return res.status(400).json({ error: 'Please choose one class.' });
    }
    const focus = parseKeys(body.focus, focusKeys());

    // School-only fields
    let school = { name: null, city: null, phone: null, students: null };
    if (userType === 'school') {
      school.name = cleanText(body.school_name, 160);
      school.city = cleanText(body.school_city, 100);
      school.phone = String(body.school_phone || '').replace(/\D/g, '');
      school.students = parseInt(body.school_students, 10);
      if (school.name.length < 2) return res.status(400).json({ error: 'Please enter the school name.' });
      if (school.city.length < 2) return res.status(400).json({ error: 'Please enter the city.' });
      if (school.phone.length < 10) return res.status(400).json({ error: 'Please enter a valid phone number.' });
      if (!Number.isInteger(school.students) || school.students < 1 || school.students > 100000) {
        return res.status(400).json({ error: 'Please enter roughly how many students.' });
      }
    }

    const name = cleanText(body.name, MAX_NAME_LENGTH) || null;
    const bandLabels = bands.map(k => findBand(k).label).join(', ');
    const rec = await recommendProducts({ bandKeys: bands, focusKeys: focus });
    const productIds = rec.products.map(p => p.product_id).join(',');

    await pool.query(
      `INSERT INTO book_finder_leads
        (email, name, user_type, class_bands, focus_areas, recommended_product_ids, consent,
         school_name, school_city, school_phone, school_students,
         utm_source, utm_medium, utm_campaign, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email, name, userType, bands.join(','), focus.join(',') || null, productIds,
        school.name, school.city, school.phone || null, school.students,
        cleanText(body.utm_source, 100) || null,
        cleanText(body.utm_medium, 100) || null,
        cleanText(body.utm_campaign, 100) || null,
        req.ip || null
      ]
    );

    // Email the list (with unsubscribe link). Needs the unsubscribe secret so the link can be verified.
    const token = unsubscribeToken(email);
    if (token) {
      const unsubscribeUrl = `${SITE_URL}/api/book-finder/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
      sendBookFinderListEmail({
        to: email,
        name,
        bandLabels,
        products: rec.products,
        resultsUrl: `${SITE_URL}/book-finder/results?class=${bands.join(',')}${focus.length ? `&focus=${focus.join(',')}` : ''}`,
        unsubscribeUrl
      }).catch(e => console.error('[BookFinder] List email failed:', e.message));
    } else {
      console.warn('[BookFinder] UNSUBSCRIBE_SECRET not set. List email not sent.');
    }

    // Owner alert for schools
    if (userType === 'school') {
      sendSchoolEnquiryAlert({
        schoolName: school.name,
        city: school.city,
        phone: school.phone,
        email,
        students: school.students,
        bandLabels
      }).catch(e => console.error('[BookFinder] School alert failed:', e.message));
    }

    return res.status(200).json({ ok: true, count: rec.products.length });
  } catch (error) {
    console.error('[BookFinder] Lead save failed:', error);
    return res.status(500).json({ error: 'Could not save your request. Please try again.' });
  }
};

/** GET /api/book-finder/unsubscribe?email=...&token=... */
export const unsubscribeLead = async (req, res) => {
  const email = cleanText(req.query.email, 255).toLowerCase();
  const token = cleanText(req.query.token, 200);
  const expected = EMAIL_RE.test(email) ? unsubscribeToken(email) : null;

  const valid = expected && token.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));

  if (!valid) {
    return res.status(400).type('html').send(page('This link is not valid', 'Please use the unsubscribe link from your email, or message us on WhatsApp.'));
  }

  await pool.query('UPDATE book_finder_leads SET unsubscribed_at = NOW() WHERE email = ? AND unsubscribed_at IS NULL', [email]);
  return res.status(200).type('html').send(page('You are unsubscribed', 'You will no longer receive offers from Mindfuels. You can still use the Book Finder any time.'));
};

const page = (title, text) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Mindfuels</title></head>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:60px auto;padding:0 16px;color:#1e293b;">
<h1 style="color:#FF5A36;font-size:24px;">${title}</h1><p>${text}</p><p><a href="${SITE_URL}" style="color:#FF5A36;">Back to Mindfuels</a></p></body></html>`;

// ---- admin: leads list and CSV --------------------------------------------

/** Builds the WHERE clause from ?user_type=, ?class=, ?from=, ?to= (used by the table and the CSV). */
const leadFilters = (query) => {
  const where = [];
  const params = [];
  if (USER_TYPES.includes(query.user_type)) {
    where.push('user_type = ?');
    params.push(query.user_type);
  }
  const band = bandKeys().includes(query.class) ? query.class : null;
  if (band) {
    where.push('FIND_IN_SET(?, class_bands) > 0');
    params.push(band);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.from || '')) {
    where.push('created_at >= ?');
    params.push(`${query.from} 00:00:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.to || '')) {
    where.push('created_at <= ?');
    params.push(`${query.to} 23:59:59`);
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
};

/** GET /api/admin/book-finder-leads (admin only; mounted behind requireAdmin) */
export const listLeads = async (req, res) => {
  try {
    const { sql, params } = leadFilters(req.query);
    const [rows] = await pool.query(
      `SELECT id, created_at, email, name, user_type, class_bands, focus_areas, consent, unsubscribed_at,
              school_name, school_city, school_phone, school_students, utm_source, utm_campaign, converted
       FROM book_finder_leads ${sql} ORDER BY created_at DESC LIMIT 500`,
      params
    );
    return res.status(200).json(rows);
  } catch (error) {
    console.error('[BookFinder] List failed:', error);
    return res.status(500).json({ error: 'Failed to load leads' });
  }
};

/** GET /api/admin/book-finder-leads.csv (admin only) */
export const exportLeadsCsv = async (req, res) => {
  try {
    const { sql, params } = leadFilters(req.query);
    const [rows] = await pool.query(
      `SELECT created_at, email, name, user_type, class_bands, focus_areas, consent, unsubscribed_at,
              school_name, school_city, school_phone, school_students, utm_source, utm_campaign
       FROM book_finder_leads ${sql} ORDER BY created_at DESC`,
      params
    );
    const header = ['date', 'email', 'name', 'type', 'classes', 'focus', 'consent', 'unsubscribed', 'school', 'city', 'phone', 'students', 'utm_source', 'utm_campaign'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        r.created_at ? new Date(r.created_at).toISOString() : '',
        r.email, r.name, r.user_type, r.class_bands, r.focus_areas,
        r.consent ? 'yes' : 'no', r.unsubscribed_at ? 'yes' : 'no',
        r.school_name, r.school_city, r.school_phone, r.school_students,
        r.utm_source, r.utm_campaign
      ].map(csvCell).join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="book-finder-leads-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(lines.join('\r\n'));
  } catch (error) {
    console.error('[BookFinder] CSV failed:', error);
    return res.status(500).json({ error: 'Failed to export leads' });
  }
};
