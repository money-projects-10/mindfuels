import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard.jsx';
import { getApiUrl, resilientFetch } from '../utils/api.js';

// One horizontally scrolling row of compact book cards
function BookRow({ title, books, keyPrefix, onProductClick }) {
  return (
    <div className="fade-in">
      <h2 className="tf-heading">{title}</h2>
      <div className="carousel-row" role="region" aria-label={`${title} books`}>
        {books.map(product => (
          <div key={`${keyPrefix}-${product.product_id}`} className="carousel-item">
            <ProductCard product={product} onClick={onProductClick} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Hand-picked books, one subject after another so each row shows the range of the catalogue.
// To change a pick, replace its product_id (the ID column in the product sheet).
// Teachers: class-wise practice books across subjects (Class 1 to 5).
const TEACHERS_PICKS = [
  'MAT-EX-3',   // Maths Express, Class 3
  'ENG-EX-2',   // English Grammar Express, Class 2
  'HIN-V3',     // Hindi Vyakaran, Class 3
  'LR-4',       // Logical Reasoning, Class 4
  'SCI-4',      // Explore Science, Class 4
  'AIO-CL1',    // All in One, Class 1
  'ENG-AC-5',   // Awesome Comprehension, Class 5
  'CUR-FUN-2',  // Fun With Cursive, Level 2
  'CMP-EXL-3',  // Excel in Computers, Class 3
  'STB-SK-4'    // Shakespeare: The Tempest & A Midsummer Night's Dream
];
// Parents: early-years favourites, activity and creative books (ages 2 to 8).
const PARENTS_PICKS = [
  'PHON-MF',        // My 1st Step in English (phonics)
  'MAT-MF',         // My 1st Step in Maths
  'ACT-PRE-3-5',    // Pre School Activity Book, 3-5 years
  'ART-A',          // Art and Craft A (with craft material)
  'RHY-BB',         // Big Book of Rhymes & Bal Geet
  'HIN-SS-SEN',     // Swar Sargun Hindi writing
  'CUR-BB-ABC',     // Big Book of Cursive abc
  'ACT-FLASH-COM4', // Wipe & Clean Flash Cards, pack of 4
  'SMART-2',        // Smart Minds GK, Class 2
  'EVS-1'           // My First Book of Environmental Studies
];

export default function TrustedFavorites({ onProductClick }) {
  const [products, setProducts] = useState({ teachers: [], parents: [] });
  const [loading, setLoading] = useState(true);

  // Read toggle flags from Vite environment configuration
  // Fallback to true if not defined or set to anything except 'false'
  const showTeachersRec = import.meta.env.VITE_SHOW_TEACHERS_RECOMMENDATION !== 'false';
  const showParentsChoice = import.meta.env.VITE_SHOW_PARENTS_FIRST_CHOICE !== 'false';

  const API_URL = getApiUrl();

  useEffect(() => {
    // Load only the picked books (each is small and cached by the server).
    // A pick that was removed from the catalogue is simply skipped.
    const fetchPicks = (ids) =>
      Promise.allSettled(
        ids.map(async (id) => {
          const response = await resilientFetch(`${API_URL}/api/products/${encodeURIComponent(id)}`);
          if (!response.ok) throw new Error(`Book ${id} not found`);
          return response.json();
        })
      ).then(results =>
        results
          .filter(r => r.status === 'fulfilled' && r.value && r.value.product_id)
          .map(r => r.value)
      );

    const fetchFeaturedProducts = async () => {
      try {
        const [teachers, parents] = await Promise.all([
          showTeachersRec ? fetchPicks(TEACHERS_PICKS) : [],
          showParentsChoice ? fetchPicks(PARENTS_PICKS) : []
        ]);

        // Safety net: if the picks could not be loaded, fall back to the newest books
        if (teachers.length === 0 && parents.length === 0) {
          const response = await resilientFetch(`${API_URL}/api/products?limit=20`);
          if (response.ok) {
            const list = (await response.json()).products || [];
            setProducts({ teachers: list.slice(0, 10), parents: list.slice(10, 20) });
          }
        } else {
          setProducts({ teachers, parents });
        }
      } catch (error) {
        console.error('Failed to load featured products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeaturedProducts();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // If both are toggled off, render nothing
  if (!showTeachersRec && !showParentsChoice) return null;

  const teachersRecProducts = products.teachers;
  const parentsChoiceProducts = products.parents;

  return (
    <section className="trusted-favorites-section container">
      {showTeachersRec && teachersRecProducts.length > 0 && (
        <BookRow title="Teacher's Recommendation" books={teachersRecProducts} keyPrefix="teach" onProductClick={onProductClick} />
      )}

      {showParentsChoice && parentsChoiceProducts.length > 0 && (
        <BookRow title="Parent's First Choice" books={parentsChoiceProducts} keyPrefix="parent" onProductClick={onProductClick} />
      )}

      <style>{`
        .trusted-favorites-section {
          display: flex;
          flex-direction: column;
          gap: 40px;
          padding: 48px 20px;
        }
        .tf-heading {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 16px;
        }
        .carousel-row {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding: 4px 2px 14px;
          scroll-snap-type: x mandatory;
          scrollbar-width: thin;
        }
        /* Compact cards: about six per row on a laptop, two and a peek on a phone */
        .carousel-item {
          flex: 0 0 200px;
          scroll-snap-align: start;
        }
        .carousel-row::-webkit-scrollbar {
          height: 6px;
        }
        .carousel-row::-webkit-scrollbar-thumb {
          background-color: var(--border);
          border-radius: 10px;
        }
        .carousel-row::-webkit-scrollbar-thumb:hover {
          background-color: var(--line-strong);
        }
        @media (max-width: 768px) {
          .trusted-favorites-section {
            padding: 28px 16px;
            gap: 28px;
          }
          .tf-heading {
            font-size: 1.25rem;
            margin-bottom: 12px;
          }
          .carousel-row {
            gap: 12px;
          }
          .carousel-item {
            flex-basis: 148px;
          }
        }
      `}</style>
    </section>
  );
}
