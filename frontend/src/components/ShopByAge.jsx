import React from 'react';

export default function ShopByAge({ navigate }) {
  const ageTiles = [
    {
      label: '2-4 YRS',
      sublabel: 'Early Foundation',
      classParam: 'Early Foundation (Pre Nursery & Nursery)',
      image: '/photos/2-4 kid.jpg'
    },
    {
      label: '4-6 YRS',
      sublabel: 'Kindergarten',
      classParam: 'Kindergarten Years (U.K.G & L.K.G)',
      image: '/photos/4-6 kid.jpg'
    },
    {
      label: '6-8 YRS',
      sublabel: 'Lower Primary',
      classParam: 'Lower Primary (Class 1 & 2)',
      image: '/photos/6-8 kid.jpg'
    },
    {
      label: '8-10 YRS',
      sublabel: 'Upper Primary',
      classParam: 'Upper Primary (Class 3 & 4)',
      image: '/photos/8-10 kid.jpg'
    },
    {
      label: '10-12 YRS',
      sublabel: 'Middle School',
      classParam: 'Middle School (Class 5 & 6)',
      image: '/photos/10-12 kid.jpg'
    }
  ];

  const handleTileClick = (param) => {
    navigate('/products', `class=${encodeURIComponent(param)}`);
  };

  return (
    <section className="shop-by-age-section" style={{ background: '#FFFDF9', padding: '60px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div className="container text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>
        
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Shop by Age</h2>
          <p style={{ color: 'var(--dark-light)', marginTop: '8px', maxWidth: '600px' }}>
            Find curriculum-aligned worksheets and activity books tailored exactly to your child's age and grade level.
          </p>
        </div>

        {/* 5 Circular Tiles (phones: 3 on top, 2 below) */}
        <div className="age-tiles">
          {ageTiles.map((tile, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => handleTileClick(tile.classParam)}
              className="age-tile-card"
              aria-label={`Shop books for ${tile.label} (${tile.sublabel})`}
            >
              {/* Circular Image Container */}
              <span className="circle-image-wrapper">
                <img
                  src={tile.image}
                  alt=""
                  width="130"
                  height="130"
                  loading="lazy"
                  decoding="async"
                />
              </span>

              <span className="age-tile-label">{tile.label}</span>
              <span className="age-tile-sublabel">{tile.sublabel}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .age-tiles {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 30px;
          width: 100%;
        }
        .age-tile-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 160px;
          padding: 4px;
          background: none;
          border: 0;
          border-radius: 16px;
          font: inherit;
          text-align: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .age-tile-card:focus-visible {
          outline: 3px solid var(--accent-ink);
          outline-offset: 4px;
        }
        .circle-image-wrapper {
          display: block;
          width: 130px;
          height: 130px;
          border-radius: 50%;
          overflow: hidden;
          border: 4px solid #ffffff;
          box-shadow: var(--shadow-md);
          margin-bottom: 14px;
          background: var(--accent-soft);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s, border-color 0.3s;
        }
        .circle-image-wrapper img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s;
        }
        .age-tile-label {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--dark);
          line-height: 1.25;
        }
        .age-tile-sublabel {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--dark-light);
          line-height: 1.3;
        }
        .age-tile-card:active .circle-image-wrapper {
          transform: scale(0.96);
        }
        @media (hover: hover) {
          .age-tile-card:hover .circle-image-wrapper {
            transform: translateY(-8px) scale(1.05);
            box-shadow: var(--shadow-lg);
            border-color: var(--primary);
          }
          .age-tile-card:hover img {
            transform: scale(1.1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .circle-image-wrapper, .circle-image-wrapper img { transition: none; }
        }
        @media (max-width: 768px) {
          .shop-by-age-section {
            padding: 28px 0 32px 0 !important;
          }
          .shop-by-age-section > .container {
            gap: 24px !important;
          }
          .shop-by-age-section h2 {
            font-size: 1.5rem !important;
          }
          .shop-by-age-section p {
            font-size: 0.85rem !important;
          }
          /* Phones: 3 tiles on the first row, 2 centred below */
          .age-tiles {
            gap: 18px 8px;
          }
          .age-tile-card {
            width: calc((100% - 16px) / 3);
            max-width: 140px;
            padding: 2px;
          }
          .circle-image-wrapper {
            width: 88px;
            height: 88px;
            border-width: 3px;
            margin-bottom: 8px;
          }
          .age-tile-label {
            font-size: 0.95rem;
          }
          .age-tile-sublabel {
            font-size: 0.72rem;
          }
        }
      `}</style>
    </section>
  );
}
