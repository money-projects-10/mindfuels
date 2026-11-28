import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import ProductCard from '../components/ProductCard.jsx';
import { useCart } from '../context/CartContext.jsx';
import { updatePageSEO } from '../utils/seo.js';
import { trackEvent } from '../utils/analytics.js';
import { getApiUrl } from '../utils/api.js';

// Options mirror backend/config/bookFinder.js. Keep the keys in sync.
const WHO = [
  { key: 'parent', label: 'A parent', hint: 'Buying for my child', icon: '👨‍👩‍👧' },
  { key: 'teacher', label: 'A teacher', hint: 'For my class', icon: '🧑‍🏫' },
  { key: 'school', label: 'A school', hint: 'For several classes', icon: '🏫' }
];

const CLASSES = [
  { key: 'early', label: 'Playgroup & Nursery', ages: '2–4 years' },
  { key: 'kg', label: 'LKG & UKG', ages: '4–6 years' },
  { key: 'primary1', label: 'Class 1 & 2', ages: '6–8 years' },
  { key: 'primary2', label: 'Class 3 & 4', ages: '8–10 years' },
  { key: 'middle', label: 'Class 5 & 6', ages: '10–12 years' }
];

const FOCUS = [
  { key: 'reading', label: 'Reading and phonics', icon: '🔤' },
  { key: 'writing', label: 'Writing and cursive', icon: '✏️' },
  { key: 'maths', label: 'Maths and mental maths', icon: '🔢' },
  { key: 'activities', label: 'General knowledge and activities', icon: '🎨' },
  { key: 'moral', label: 'Moral stories', icon: '📖' },
  { key: 'rhymes', label: 'Rhymes and poems', icon: '🎵' }
];

const SHOW_ALL = 'all';
const SITE = 'https://mindfuelspublisher.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const readSelection = () => {
  const p = new URLSearchParams(window.location.search);
  const split = (s) => (s || '').split(',').filter(Boolean);
  return { type: p.get('type') || '', classes: split(p.get('class')), focus: split(p.get('focus')) };
};

const buildSearch = ({ type, classes, focus }) => {
  const p = new URLSearchParams();
  if (type) p.set('type', type);
  if (classes.length) p.set('class', classes.join(','));
  if (focus.length) p.set('focus', focus.join(','));
  return p.toString();
};

// Shared look for the big tap-friendly option cards (44px+ targets, visible focus ring)
const cardStyle = (selected) => ({
  display: 'flex', alignItems: 'center', gap: '14px', width: '100%', textAlign: 'left',
  padding: '16px', minHeight: '64px', borderRadius: '16px', cursor: 'pointer',
  background: selected ? 'rgba(255, 90, 54, 0.08)' : '#fff',
  border: selected ? '2px solid #FF5A36' : '2px solid var(--border)',
  color: 'var(--dark)', fontWeight: 600, fontSize: '1rem', transition: 'border-color 0.2s, background 0.2s'
});

const primaryBtn = { padding: '14px 22px', minHeight: '48px', borderRadius: '12px', fontWeight: 700, width: '100%' };

// ---- Entry: decides between the questions and the results -----------------

export default function BookFinder({ navigate, onProductClick }) {
  const isResults = window.location.pathname === '/book-finder/results';

  useEffect(() => {
    if (isResults) {
      updatePageSEO({
        title: 'Your Book List | Mindfuels Book Finder',
        description: 'Books picked for your child: phonics, maths, writing and activity books from Mindfuels Delhi.',
        canonicalUrl: `${SITE}/book-finder`
      });
    } else {
      updatePageSEO({
        title: 'Book Finder: Find the Right Workbooks for Your Child | Mindfuels',
        description: 'Answer three quick questions and get the right preschool, LKG, UKG and primary workbooks for your child from Mindfuels Delhi.',
        canonicalUrl: `${SITE}/book-finder`
      });
    }
  }, [isResults]);

  return isResults
    ? <Results navigate={navigate} onProductClick={onProductClick} />
    : <Wizard navigate={navigate} />;
}

// ---- Questions ------------------------------------------------------------

const EMPTY_SEL = { type: '', classes: [], focus: [] };

// inPanel: used by the chat-style Book Finder button. Steps are kept in memory (no page change);
// only the final "See my books" opens the results page. onDone closes the panel.
export function BookFinderWizard({ navigate, inPanel = false, onDone }) {
  const [sel, setSel] = useState(() => (inPanel ? EMPTY_SEL : readSelection()));
  const { type, classes, focus } = sel;
  const step = !type ? 1 : classes.length === 0 ? 2 : 3;

  // Browser back/forward changes the URL without remounting this page, so re-read it
  useEffect(() => {
    if (inPanel) return undefined;
    const onPop = () => setSel(readSelection());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [inPanel]);

  useEffect(() => {
    if (step === 1) trackEvent('book_finder_started');
  }, [step]);

  const go = (next) => {
    setSel(next);
    if (!inPanel) navigate('/book-finder', buildSearch(next));
  };

  const back = () => {
    if (step === 3) go({ type, classes: [], focus: [] });
    else go({ type: '', classes: [], focus: [] });
  };

  const toggle = (list, key) => (list.includes(key) ? list.filter(k => k !== key) : [...list, key]);

  const finish = (chosenFocus) => {
    const trimmed = chosenFocus.filter(k => k !== SHOW_ALL);
    trackEvent('book_finder_completed', { user_type: type, class: classes.join(','), focus: trimmed.join(',') || 'all' });
    navigate('/book-finder/results', buildSearch({ type, classes, focus: trimmed }));
    if (onDone) onDone();
  };

  const isSchool = type === 'school';

  return (
    <section className="fade-in" style={inPanel
      ? { padding: '4px 0 0' }
      : { maxWidth: '640px', margin: '0 auto', padding: '28px 16px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
        {step > 1 ? (
          <button onClick={back} className="btn btn-secondary" style={{ minHeight: '44px', padding: '8px 16px' }}>← Back</button>
        ) : <span />}
        <span style={{ color: 'var(--dark-light)', fontSize: '0.9rem', fontWeight: 600 }}>Step {step} of 3</span>
      </div>

      <div aria-hidden="true" style={{ height: '6px', background: 'var(--border)', borderRadius: '99px', marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{ width: `${(step / 3) * 100}%`, height: '100%', background: '#FF5A36', transition: 'width 0.3s ease' }} />
      </div>

      {step === 1 && (
        <>
          <h1 style={{ fontSize: '1.7rem', marginBottom: '8px' }}>Who are the books for?</h1>
          <p style={{ color: 'var(--dark-light)', marginBottom: '20px' }}>Pick one. We'll show the right books for you.</p>
          <div role="radiogroup" aria-label="Who are the books for" style={{ display: 'grid', gap: '12px' }}>
            {WHO.map(w => (
              <button key={w.key} role="radio" aria-checked={type === w.key}
                onClick={() => go({ type: w.key, classes: [], focus: [] })} style={cardStyle(type === w.key)}>
                <span style={{ fontSize: '1.8rem' }} aria-hidden="true">{w.icon}</span>
                <span>{w.label}<span style={{ display: 'block', fontWeight: 400, color: 'var(--dark-light)', fontSize: '0.88rem' }}>{w.hint}</span></span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 style={{ fontSize: '1.7rem', marginBottom: '8px' }}>
            {isSchool ? 'Which classes do you need?' : "What is the child's class?"}
          </h1>
          <p style={{ color: 'var(--dark-light)', marginBottom: '20px' }}>
            {isSchool ? 'Pick every class you teach.' : 'Pick the class closest to your child.'}
          </p>
          <div role={isSchool ? 'group' : 'radiogroup'} aria-label="Class" style={{ display: 'grid', gap: '12px' }}>
            {CLASSES.map(c => {
              const on = classes.includes(c.key);
              return (
                <button key={c.key} role={isSchool ? 'checkbox' : 'radio'} aria-checked={on}
                  onClick={() => isSchool
                    ? setSel({ ...sel, classes: toggle(classes, c.key) })
                    : go({ type, classes: [c.key], focus: [] })}
                  style={cardStyle(on)}>
                  <span style={{ flex: 1 }}>{c.label}<span style={{ display: 'block', fontWeight: 400, color: 'var(--dark-light)', fontSize: '0.88rem' }}>{c.ages}</span></span>
                  {isSchool && <span aria-hidden="true" style={{ fontSize: '1.2rem', color: '#FF5A36' }}>{on ? '✓' : ''}</span>}
                </button>
              );
            })}
          </div>
          {isSchool && (
            <button onClick={() => go({ type, classes, focus: [] })} disabled={classes.length === 0}
              className="btn btn-primary" style={{ ...primaryBtn, marginTop: '20px' }}>
              Next
            </button>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <h1 style={{ fontSize: '1.7rem', marginBottom: '8px' }}>What would you like to work on?</h1>
          <p style={{ color: 'var(--dark-light)', marginBottom: '20px' }}>Pick one or more, or see everything for this class.</p>
          <div role="group" aria-label="Focus areas" style={{ display: 'grid', gap: '12px' }}>
            {FOCUS.map(f => {
              const on = focus.includes(f.key);
              return (
                <button key={f.key} role="checkbox" aria-checked={on}
                  onClick={() => setSel({ ...sel, focus: toggle(focus.filter(k => k !== SHOW_ALL), f.key) })}
                  style={cardStyle(on)}>
                  <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>{f.icon}</span>
                  <span style={{ flex: 1 }}>{f.label}</span>
                  <span aria-hidden="true" style={{ fontSize: '1.2rem', color: '#FF5A36' }}>{on ? '✓' : ''}</span>
                </button>
              );
            })}
            <button role="checkbox" aria-checked={focus.includes(SHOW_ALL)}
              onClick={() => setSel({ ...sel, focus: focus.includes(SHOW_ALL) ? [] : [SHOW_ALL] })}
              style={cardStyle(focus.includes(SHOW_ALL))}>
              <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>🎁</span>
              <span style={{ flex: 1 }}>Show me everything for this class</span>
              <span aria-hidden="true" style={{ fontSize: '1.2rem', color: '#FF5A36' }}>{focus.includes(SHOW_ALL) ? '✓' : ''}</span>
            </button>
          </div>
          <button onClick={() => finish(focus.includes(SHOW_ALL) ? [] : focus)}
            disabled={focus.length === 0}
            className="btn btn-primary" style={{ ...primaryBtn, marginTop: '20px' }}>
            See my books
          </button>
        </>
      )}
    </section>
  );
}

// ---- Results --------------------------------------------------------------

function Results({ navigate, onProductClick }) {
  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth0();

  const [search, setSearch] = useState(window.location.search);
  const params = new URLSearchParams(search);
  const type = params.get('type') || 'parent';
  const classKeys = (params.get('class') || '').split(',').filter(Boolean);
  const focusKeys = (params.get('focus') || '').split(',').filter(Boolean);
  const utm = {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || ''
  };

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [addedNote, setAddedNote] = useState('');

  // Form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [honey, setHoney] = useState('');
  const [school, setSchool] = useState({ school_name: '', school_city: '', school_phone: '', school_students: '' });
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const onPop = () => setSearch(window.location.search);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Pre-fill email for logged-in users
  useEffect(() => {
    if (isAuthenticated && user?.email && !email) setEmail(user.email);
    if (isAuthenticated && user?.name && !name) setName(user.name);
  }, [isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const q = new URLSearchParams({ class: classKeys.join(',') });
    if (focusKeys.length) q.set('focus', focusKeys.join(','));
    fetch(`${getApiUrl()}/api/book-finder/recommendations?${q.toString()}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Could not load books.');
        if (!cancelled) setData(json);
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const classLabel = data?.classes?.map(c => c.label).join(', ') || 'your child';

  const addAll = async () => {
    if (!data?.products?.length) return;
    let added = 0;
    for (const product of data.products) {
      if (Number(product.stock_qty) <= 0) continue;
      const ok = await addToCart(product, 1);
      if (ok !== false) added += 1;
    }
    trackEvent('book_finder_add_to_cart', { count: added, class: classKeys.join(',') });
    setAddedNote(added ? `${added} book${added === 1 ? '' : 's'} added to your cart.` : 'These books are out of stock right now.');
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!EMAIL_RE.test(email.trim())) return setFormError('Please enter a valid email address.');
    if (!consent) return setFormError('Please tick the box so we can send your list.');
    if (type === 'school') {
      if (school.school_name.trim().length < 2) return setFormError('Please enter the school name.');
      if (school.school_city.trim().length < 2) return setFormError('Please enter the city.');
      if (school.school_phone.replace(/\D/g, '').length < 10) return setFormError('Please enter a valid phone number.');
      const n = parseInt(school.school_students, 10);
      if (!(n >= 1 && n <= 100000)) return setFormError('Please enter roughly how many students.');
    }

    setSending(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/book-finder/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(), name: name.trim(), user_type: type,
          classes: classKeys, focus: focusKeys, consent: true,
          website: honey, // honeypot: stays empty for people
          ...(type === 'school' ? school : {}),
          ...utm
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not send your request.');
      setSent(true);
      trackEvent('book_finder_email_sent', { user_type: type, class: classKeys.join(',') });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSending(false);
    }
  };

  const inputStyle = { width: '100%', minHeight: '46px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '1rem', background: '#fff' };
  const labelStyle = { display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' };

  return (
    <section className="fade-in" style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px 60px' }}>
      <button onClick={() => navigate('/book-finder')} className="btn btn-secondary" style={{ minHeight: '44px', padding: '8px 16px', marginBottom: '16px' }}>
        ← Start again
      </button>

      {loading && <p role="status" style={{ color: 'var(--dark-light)' }}>Finding the right books…</p>}

      {!loading && error && (
        <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: '16px', textAlign: 'center' }}>
          <p style={{ marginBottom: '16px' }}>{error}</p>
          <button onClick={() => navigate('/products')} className="btn btn-primary">Browse all books</button>
        </div>
      )}

      {!loading && data && (
        <>
          <h1 style={{ fontSize: '1.7rem', marginBottom: '6px' }}>Recommended books for {classLabel}</h1>
          <p style={{ color: 'var(--dark-light)', marginBottom: '20px' }}>{data.explanation}</p>

          {data.products.length === 0 ? (
            <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: '16px', textAlign: 'center' }}>
              <p style={{ marginBottom: '16px' }}>We don't have books listed for this choice yet.</p>
              <button onClick={() => navigate('/products')} className="btn btn-primary">Browse all books</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                <button onClick={addAll} className="btn btn-primary" style={{ minHeight: '46px', padding: '12px 20px' }}>
                  Add all to cart
                </button>
                {addedNote && <span role="status" style={{ color: 'var(--success)', fontWeight: 600 }}>{addedNote}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '16px' }}>
                {data.products.map((product, idx) => (
                  <ProductCard key={product.product_id} product={product} onClick={onProductClick} priority={idx < 4} />
                ))}
              </div>
            </>
          )}

          <div className="glass-panel" style={{ marginTop: '36px', padding: '22px', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '620px' }}>
            {sent ? (
              <p role="status" style={{ fontWeight: 600, color: 'var(--success)' }}>
                Done! We've sent your list to {email}. Check your inbox (and spam folder).
              </p>
            ) : (
              <form onSubmit={submit} noValidate>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
                  {type === 'school' ? 'Send this list to our team' : 'Email me this list'}
                </h2>
                <p style={{ color: 'var(--dark-light)', fontSize: '0.92rem', marginBottom: '16px' }}>
                  {type === 'school' ? 'We will reply with school pricing.' : 'Keep it handy for the next book shopping trip.'}
                </p>

                {/* Honeypot: hidden from people and screen readers; bots fill it in */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                  <label>Leave this empty<input type="text" name="website" tabIndex={-1} autoComplete="off" value={honey} onChange={e => setHoney(e.target.value)} /></label>
                </div>

                <div style={{ display: 'grid', gap: '14px' }}>
                  <div>
                    <label htmlFor="bf-email" style={labelStyle}>Email (required)</label>
                    <input id="bf-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
                  </div>
                  <div>
                    <label htmlFor="bf-name" style={labelStyle}>{type === 'parent' ? "Your name or your child's name (optional)" : 'Your name (optional)'}</label>
                    <input id="bf-name" type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
                  </div>

                  {type === 'school' && (
                    <>
                      <div>
                        <label htmlFor="bf-school" style={labelStyle}>School name (required)</label>
                        <input id="bf-school" type="text" value={school.school_name} onChange={e => setSchool({ ...school, school_name: e.target.value })} style={inputStyle} required />
                      </div>
                      <div>
                        <label htmlFor="bf-city" style={labelStyle}>City (required)</label>
                        <input id="bf-city" type="text" value={school.school_city} onChange={e => setSchool({ ...school, school_city: e.target.value })} style={inputStyle} required />
                      </div>
                      <div>
                        <label htmlFor="bf-phone" style={labelStyle}>Contact number (required)</label>
                        <input id="bf-phone" type="tel" autoComplete="tel" value={school.school_phone} onChange={e => setSchool({ ...school, school_phone: e.target.value })} style={inputStyle} required />
                      </div>
                      <div>
                        <label htmlFor="bf-students" style={labelStyle}>Roughly how many students? (required)</label>
                        <input id="bf-students" type="number" min="1" max="100000" inputMode="numeric" value={school.school_students} onChange={e => setSchool({ ...school, school_students: e.target.value })} style={inputStyle} required />
                      </div>
                    </>
                  )}

                  <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.92rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ width: '20px', height: '20px', marginTop: '2px', flexShrink: 0 }} />
                    <span>Send me this list and occasional offers from Mindfuels.</span>
                  </label>

                  {formError && <p role="alert" style={{ color: 'var(--error)', fontWeight: 600 }}>{formError}</p>}

                  <button type="submit" disabled={sending} className="btn btn-primary" style={{ minHeight: '48px', padding: '12px 20px' }}>
                    {sending ? 'Sending…' : type === 'school' ? 'Send to our team' : 'Email me this list'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </section>
  );
}
