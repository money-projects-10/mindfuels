import React, { useState } from 'react';

export default function DelhiPublishingInfo({ navigate }) {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  // Short trust points shown as one quiet strip (no claims beyond what the business confirms)
  const trustPoints = [
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
      ),
      title: '20+ years',
      text: 'publishing for children'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"></path>
        </svg>
      ),
      title: 'Trusted by schools',
      text: 'teachers and parents'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      ),
      title: 'Free delivery',
      text: 'all over India'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      title: 'Bulk orders',
      text: 'for schools and tutors'
    }
  ];

  const faqs = [
    {
      q: "What age groups are Mindfuels children's books designed for?",
      a: "Mindfuels publishes age-appropriate educational materials starting from Early Foundation (Pre-Nursery & Nursery, 2-4 Yrs), Kindergarten (LKG & UKG, 4-6 Yrs), Lower Primary (Classes 1 & 2, 6-8 Yrs), Upper Primary (Classes 3 & 4, 8-10 Yrs), up to Middle School (Classes 5 & 6, 10-12 Yrs)."
    },
    {
      q: "How fast is delivery to Delhi, Gurgaon, Noida, and NCR regions?",
      a: "Orders placed on Mindfuels are processed and dispatched within 24 to 48 hours. Most customers in Delhi NCR receive their packages within 2 to 3 business days with complimentary free shipping and live SMS/email tracking."
    },
    {
      q: "Can preschools and educators in Delhi order books in bulk?",
      a: "Yes! We work directly with preschool chains, private schools, tuition academies, and daycare centers across Delhi NCR and India. You can connect with our support team via WhatsApp or email for institutional pricing and customized book sets."
    },
    {
      q: "Why are screen-free activity workbooks important for early child development?",
      a: "Our workbooks emphasize fine motor skills, pencil grip control, handwriting precision, cognitive logic, and spatial recognition. They provide a joyful, tangible learning experience that reduces screen dependency and enhances focus."
    }
  ];

  return (
    <section className="delhi-seo-section" style={{
      background: 'linear-gradient(180deg, #FAF8F5 0%, #FFFFFF 100%)',
      padding: '40px 20px 56px',
      borderTop: '1px solid var(--border)',
      fontFamily: 'var(--font-body)'
    }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

        {/* Slim trust strip: present, but not competing with the books */}
        <ul className="trust-strip" aria-label="Why parents choose Mindfuels">
          {trustPoints.map((item) => (
            <li key={item.title} className="trust-strip-item">
              <span className="trust-strip-icon">{item.icon}</span>
              <span className="trust-strip-text">
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Informational Callout Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #FFF3EE 0%, #FEE8DF 100%)',
          borderRadius: '16px',
          padding: '30px',
          border: '1px solid rgba(255, 90, 54, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ maxWidth: '650px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark)', marginBottom: '8px' }}>
              Are You a School Principal, Teacher, or Daycare Director?
            </h2>
            <p style={{ color: 'var(--dark-light)', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>
              We offer personalized curriculum counseling, bulk order discounts, and customized school book sets across Delhi, Noida, Gurgaon, and Pan-India.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href="https://wa.me/919899923670?text=Hi%20Mindfuels%2C%20I%20am%20interested%20in%20School%2FBulk%20Book%20Supply"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ padding: '12px 22px', fontSize: '0.9rem', fontWeight: 700, borderRadius: '50px', textDecoration: 'none' }}
            >
              Enquire for Bulk Supply
            </a>
            <button
              onClick={() => navigate('/products')}
              className="btn btn-outline"
              style={{ padding: '12px 22px', fontSize: '0.9rem', fontWeight: 700, borderRadius: '50px', background: '#fff' }}
            >
              Browse All Books
            </button>
          </div>
        </div>

        {/* Interactive FAQ Section for Parents & Search Snippets */}
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--dark)' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ color: 'var(--dark-light)', fontSize: '0.9rem', marginTop: '6px' }}>
              Everything you need to know about our books, shipping, and school partnerships.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.98rem',
                      fontWeight: 700,
                      color: isOpen ? 'var(--primary)' : 'var(--dark)',
                      fontFamily: 'var(--font-body)'
                    }}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0,
                        marginLeft: '12px'
                      }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  {isOpen && (
                    <div style={{
                      padding: '0 20px 18px 20px',
                      fontSize: '0.88rem',
                      color: 'var(--dark-light)',
                      lineHeight: '1.6',
                      borderTop: '1px solid rgba(0,0,0,0.04)'
                    }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <style>{`
        .trust-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          margin: 0;
          padding: 14px 8px;
          list-style: none;
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 16px;
        }
        .trust-strip-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 6px 12px;
          min-width: 0;
        }
        .trust-strip-item + .trust-strip-item {
          border-left: 1px solid var(--line-soft);
        }
        .trust-strip-icon {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--accent-soft);
          color: var(--accent-ink);
        }
        .trust-strip-text {
          display: flex;
          flex-direction: column;
          line-height: 1.3;
          min-width: 0;
        }
        .trust-strip-text strong {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--dark);
        }
        .trust-strip-text span {
          font-size: 0.82rem;
          color: var(--dark-light);
        }
        /* Phones: two by two, left-aligned */
        @media (max-width: 768px) {
          .trust-strip {
            grid-template-columns: repeat(2, 1fr);
            row-gap: 4px;
            padding: 8px 4px;
          }
          .trust-strip-item {
            justify-content: flex-start;
            gap: 10px;
            padding: 8px 10px;
          }
          .trust-strip-item + .trust-strip-item {
            border-left: none;
          }
          .trust-strip-icon {
            width: 32px;
            height: 32px;
          }
          .trust-strip-text strong {
            font-size: 0.86rem;
          }
          .trust-strip-text span {
            font-size: 0.78rem;
          }
        }
      `}</style>
    </section>
  );
}
