import pool from '../config/db.js';
import { CLASS_BANDS, FOCUS_AREAS, MAX_RESULTS, findBand, findFocus } from '../config/bookFinder.js';

/**
 * The one place where recommendations are decided. Tries, in order:
 *   1. "exact"   — matches the chosen class AND a chosen focus area
 *   2. "class"   — matches the chosen class only (no focus picked, or nothing matched the focus)
 *   3. "closest" — nothing for this class, so show books from any class with the focus (or newest books)
 * Products in stock come first. Never returns an empty list when the catalogue has books.
 */
export async function recommendProducts({ bandKeys, focusKeys }) {
  const bands = bandKeys.map(findBand).filter(Boolean);
  const focuses = focusKeys.map(findFocus).filter(Boolean);

  const classTags = bands.map(b => b.tag3);
  const focusTags = focuses.flatMap(f => f.tag1);

  const classSql = classTags.length
    ? `(${classTags.map(() => "REPLACE(IFNULL(p.tag3, ''), '  ', ' ') LIKE ?").join(' OR ')})`
    : null;
  const focusSql = focusTags.length
    ? `(${focusTags.map(() => "REPLACE(IFNULL(p.tag1, ''), '  ', ' ') LIKE ?").join(' OR ')})`
    : null;

  const order = `ORDER BY (p.stock_qty > 0) DESC, p.title ASC LIMIT ${MAX_RESULTS}`;
  const run = async (conditions, params) => {
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(`SELECT p.* FROM products p ${where} ${order}`, params);
    return rows;
  };

  const classParams = classTags.map(t => `%${t.replace(/\s+/g, ' ')}%`);
  const focusParams = focusTags.map(t => `%${t}%`);

  // 1. Class + focus
  if (classSql && focusSql) {
    const rows = await run([classSql, focusSql], [...classParams, ...focusParams]);
    if (rows.length > 0) return { products: rows, level: 'exact', bands, focuses };
  }

  // 2. Class only (also used when no focus was picked)
  if (classSql) {
    const rows = await run([classSql], classParams);
    if (rows.length > 0) return { products: rows, level: 'class', bands, focuses };
  }

  // 3. Closest: focus across all classes, or newest books if there is no focus either
  if (focusSql) {
    const rows = await run([focusSql], focusParams);
    if (rows.length > 0) return { products: rows, level: 'closest', bands, focuses };
  }
  const rows = await run([], []);
  return { products: rows, level: 'closest', bands, focuses };
}

/** Human-readable explanation shown above the results. */
export function explainResults({ level, bands, focuses }) {
  const classText = bands.length
    ? bands.map(b => b.label).join(', ')
    : 'your child';
  const focusText = focuses.length
    ? focuses.map(f => f.label.toLowerCase()).join(', ')
    : null;

  if (level === 'exact') {
    return `Picked for ${classText}, focusing on ${focusText}.`;
  }
  if (level === 'class') {
    return focusText
      ? `We don't have books for ${focusText} in ${classText} yet, so here is everything we have for this class.`
      : `Everything we publish for ${classText}.`;
  }
  return `We don't have a match for ${classText} yet. These are our closest books.`;
}

export { CLASS_BANDS, FOCUS_AREAS };
