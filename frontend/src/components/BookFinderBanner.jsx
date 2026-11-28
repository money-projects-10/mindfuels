import React from 'react';

// Homepage card that opens the Book Finder. Plain HTML + the existing button style, so it stays light.
export default function BookFinderBanner({ navigate }) {
  return (
    <section aria-labelledby="book-finder-banner-title" style={{ padding: '24px 16px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        padding: '22px', borderRadius: '20px', background: 'linear-gradient(135deg, #FFF4EF, #FFFFFF)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ flex: '1 1 260px' }}>
          <h2 id="book-finder-banner-title" style={{ fontSize: '1.4rem', marginBottom: '6px' }}>
            Find the right books for your child
          </h2>
          <p style={{ color: 'var(--dark-light)', margin: 0 }}>
            Answer three quick questions and get a list picked for your child's class.
          </p>
        </div>
        <button
          onClick={() => navigate('/book-finder')}
          className="btn btn-primary"
          style={{ minHeight: '48px', padding: '12px 22px', fontWeight: 700 }}
        >
          Start the Book Finder
        </button>
      </div>
    </section>
  );
}
