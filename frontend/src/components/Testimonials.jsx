import React, { useState, useRef, useEffect, useCallback } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function TestimonialCard({ videoSrc, index, total, isActive, onToggle, onStop }) {
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load the video only when the card comes near the screen,
  // and stop it when it is scrolled out of view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsLoaded(true);
        else if (videoRef.current && !videoRef.current.paused) onStop();
      },
      { rootMargin: '200px' }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [onStop]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().catch(() => onStop());
    } else {
      videoRef.current.pause();
    }
  }, [isActive, isLoaded, onStop]);

  return (
    <button
      ref={cardRef}
      type="button"
      className={`testimonial-card ${isActive ? 'is-playing' : ''}`}
      onClick={onToggle}
      aria-pressed={isActive}
      aria-label={`${isActive ? 'Pause' : 'Play'} video ${index + 1} of ${total}`}
    >
      {isLoaded ? (
        <video
          ref={videoRef}
          src={`${videoSrc}#t=0.1`}
          preload="metadata"
          playsInline
          loop
          tabIndex={-1}
        />
      ) : (
        <span className="testimonial-poster" aria-hidden="true" />
      )}

      {!isActive && (
        <span className="play-overlay" aria-hidden="true">
          <span className="play-circle">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style={{ marginLeft: '2px' }}>
              <path d="M8 5v14l11-7z"></path>
            </svg>
          </span>
        </span>
      )}
    </button>
  );
}

export default function Testimonials() {
  const [activeIdx, setActiveIdx] = useState(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const scrollRef = useRef(null);

  const testimonials = [
    { video: '/testimonial_videos/vid1.mp4' },
    { video: '/testimonial_videos/vid2.mp4' },
    { video: '/testimonial_videos/vid3.mp4' },
    { video: '/testimonial_videos/vid4.mp4' },
    { video: '/testimonial_videos/vid5.mp4' },
    { video: '/testimonial_videos/vid6.mp4' },
    { video: '/testimonial_videos/vid7.mp4' },
    { video: '/testimonial_videos/vid8.mp4' },
    { video: '/testimonial_videos/vid9.mp4' },
    { video: '/testimonial_videos/vid10.mp4' },
    { video: '/testimonial_videos/vid11.mp4' }
  ];

  // Grey out the arrows at either end of the row
  const updateEnds = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateEnds();
    window.addEventListener('resize', updateEnds);
    return () => window.removeEventListener('resize', updateEnds);
  }, [updateEnds]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: (direction === 'left' ? -1 : 1) * el.clientWidth * 0.8,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    });
  };

  const stopPlaying = useCallback(() => setActiveIdx(null), []);

  return (
    <section className="testimonials-section">
      <div className="container testimonials-inner">
        <div className="testimonials-header">
          <h2>Loved by parents and teachers</h2>
          <p>Hear from the parents, teachers and children who learn with Mindfuels books.</p>
        </div>

        <div className="testimonials-carousel">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="carousel-btn carousel-btn-prev"
            aria-label="Previous videos"
            disabled={atStart}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <div
            ref={scrollRef}
            className={`testimonials-scroll-row ${atStart ? '' : 'fade-start'} ${atEnd ? '' : 'fade-end'}`}
            onScroll={updateEnds}
            role="region"
            aria-label="Video testimonials"
          >
            {testimonials.map((t, idx) => (
              <TestimonialCard
                key={idx}
                videoSrc={t.video}
                index={idx}
                total={testimonials.length}
                isActive={activeIdx === idx}
                onToggle={() => setActiveIdx(activeIdx === idx ? null : idx)}
                onStop={stopPlaying}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => scroll('right')}
            className="carousel-btn carousel-btn-next"
            aria-label="Next videos"
            disabled={atEnd}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .testimonials-section {
          background: #FFFDF9;
          padding: 48px 0;
          border-top: 1px solid var(--border);
        }
        .testimonials-inner {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .testimonials-header {
          text-align: center;
        }
        .testimonials-header h2 {
          font-size: 1.75rem;
          font-weight: 800;
        }
        .testimonials-header p {
          color: var(--dark-light);
          max-width: 520px;
          margin: 6px auto 0;
        }
        .testimonials-carousel {
          position: relative;
          display: flex;
          align-items: center;
        }
        .testimonials-scroll-row {
          display: flex;
          gap: 16px;
          width: 100%;
          overflow-x: auto;
          padding: 6px 2px;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }
        .testimonials-scroll-row::-webkit-scrollbar {
          display: none;
        }
        /* Soft fade on the side that has more videos to scroll to */
        .testimonials-scroll-row.fade-end {
          -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 40px), transparent);
          mask-image: linear-gradient(to right, #000 calc(100% - 40px), transparent);
        }
        .testimonials-scroll-row.fade-start {
          -webkit-mask-image: linear-gradient(to left, #000 calc(100% - 40px), transparent);
          mask-image: linear-gradient(to left, #000 calc(100% - 40px), transparent);
        }
        .testimonials-scroll-row.fade-start.fade-end {
          -webkit-mask-image: linear-gradient(to right, transparent, #000 40px, #000 calc(100% - 40px), transparent);
          mask-image: linear-gradient(to right, transparent, #000 40px, #000 calc(100% - 40px), transparent);
        }
        .testimonial-card {
          position: relative;
          flex: 0 0 220px;
          aspect-ratio: 9 / 16;
          padding: 0;
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          background: #1a1a1a;
          box-shadow: var(--shadow-sm);
          cursor: pointer;
          scroll-snap-align: start;
          -webkit-tap-highlight-color: transparent;
        }
        .testimonial-card video,
        .testimonial-poster {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .testimonial-card.is-playing {
          outline: 3px solid var(--accent-ink);
          outline-offset: -3px;
        }
        .testimonial-card:focus-visible {
          outline: 3px solid var(--primary);
          outline-offset: 2px;
        }
        .play-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, transparent 55%, rgba(0, 0, 0, 0.35));
        }
        .play-circle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          color: var(--accent-ink);
          transition: transform 0.2s ease;
        }
        .carousel-btn {
          position: absolute;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid var(--border);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          color: var(--dark);
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
        }
        .carousel-btn-prev { left: -22px; }
        .carousel-btn-next { right: -22px; }
        .carousel-btn:hover:not(:disabled) {
          background: var(--light);
          color: var(--accent-ink);
        }
        .carousel-btn:disabled {
          opacity: 0;
          pointer-events: none;
        }
        @media (hover: hover) {
          .testimonial-card:hover .play-circle {
            transform: scale(1.08);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .play-circle,
          .carousel-btn {
            transition: none;
          }
          .testimonial-card:hover .play-circle {
            transform: none;
          }
        }
        /* Phones and tablets: swipe the row, no arrows */
        @media (max-width: 768px) {
          .testimonials-section {
            padding: 32px 0;
          }
          .testimonials-inner {
            gap: 18px;
          }
          .testimonials-header h2 {
            font-size: 1.4rem;
          }
          .testimonials-header p {
            font-size: 0.92rem;
          }
          .testimonials-scroll-row {
            gap: 12px;
          }
          .testimonial-card {
            flex-basis: 150px;
            border-radius: 14px;
          }
          .play-circle {
            width: 44px;
            height: 44px;
          }
          .carousel-btn {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
