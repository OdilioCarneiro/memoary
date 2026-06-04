import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useTransform, animate, useSpring, useMotionValue } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import './App.css';

import logoSvg from './assets/logo.svg';
import anuarioCapa from './assets/anuario.svg';
import LoginPage from './LoginPage';
import AdminPage from './AdminPage';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://memoary.onrender.com';

gsap.registerPlugin(ScrollTrigger);

/* ==============================================
   RESPONSIVE BOOK DIMENSIONS
   ============================================== */
function useBookSize() {
  const [size, setSize] = useState(() => computeSize());

  function computeSize() {
    const vw = window.innerWidth;
    if (vw < 480) {
      const w = Math.min(vw * 0.9, 340);
      return { w, h: Math.round(w * 1.57), perspective: 1600 };
    }
    if (vw < 768) {
      const w = Math.min(vw * 0.75, 380);
      return { w, h: Math.round(w * 1.57), perspective: 1800 };
    }
    if (vw < 1100) {
      const w = Math.min(vw * 0.42, 400);
      return { w, h: Math.round(w * 1.57), perspective: 2200 };
    }
    const w = Math.min(vw * 0.32, 440);
    return { w, h: Math.round(w * 1.57), perspective: 2800 };
  }

  useEffect(() => {
    const handler = () => setSize(computeSize());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return size;
}

/* ==============================================
   1. APP — VIEW ORCHESTRATOR
   ============================================== */
export default function App() {
  const [currentView, setCurrentView] = useState('book');
  const [anuarioData, setAnuarioData] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/anuario`);
      const json = await res.json();
      if (json.success) setAnuarioData(json.data);
    } catch (e) {
      console.error('Erro ao buscar dados:', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/anuario`);
        const json = await res.json();
        if (isMounted && json.success) setAnuarioData(json.data);
      } catch (e) {
        console.error('Erro ao buscar dados:', e);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleLoginClick = () => {
    const token = localStorage.getItem('adminToken');
    setCurrentView(token ? 'admin' : 'login');
  };

  if (currentView === 'login') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '20px' }}>
        <button
          onClick={() => setCurrentView('book')}
          className="back-btn"
        >
          ← Voltar ao Anuário
        </button>
        <LoginPage onLoginSuccess={() => setCurrentView('admin')} />
      </div>
    );
  }

  if (currentView === 'admin') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <header className="admin-topbar">
          <button
            onClick={() => { setCurrentView('book'); fetchData(); }}
            className="admin-topbar-back"
          >
            ← Visualizar Anuário
          </button>
          <button
            onClick={() => { localStorage.removeItem('adminToken'); setCurrentView('login'); }}
            className="admin-topbar-logout"
          >
            Sair do Painel
          </button>
        </header>
        <AdminPage />
      </div>
    );
  }

  return <BookViewer onLoginClick={handleLoginClick} pages={anuarioData} />;
}

/* ==============================================
   2. BOOK VIEWER
   ============================================== */
function BookViewer({ onLoginClick, pages }) {
  const containerRef = useRef(null);
  const bookSceneRef = useRef(null);
  const coverRef = useRef(null);
  const headerRef = useRef(null);
  const heroTextRef = useRef(null);
  const scrollHintRef = useRef(null);

  const { w: BOOK_W, h: BOOK_H, perspective: PERSPECTIVE } = useBookSize();

  const [bookIsOpen, setBookIsOpen] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [spreadIndex, setSpreadIndex] = useState(-1);
  const [flipDir, setFlipDir] = useState(null);

  /* ---- Flip physics: THREE motion values for layered realism ---- */
  // Primary rotation 0→1
  const flipRaw = useMotionValue(0);
  // Spring-smoothed for rendering
  const flipSpring = useSpring(flipRaw, {
    stiffness: 280,
    damping: 34,
    mass: 0.65,
    restDelta: 0.0008,
  });

  // Page curl factor: max curl at midpoint
  const curlFactor = useTransform(flipSpring, [0, 0.3, 0.5, 0.7, 1], [0, 0.6, 1, 0.6, 0]);

  // rotateY: forward = right page flips left (0 → -180), backward = 0 → +180
  const rotateY = useTransform(
    flipSpring,
    [0, 1],
    flipDir === 'backward' ? [0, 180] : [0, -180]
  );

  // Paper bow: subtle X scale compression at peak
  const scaleX = useTransform(flipSpring, [0, 0.45, 0.5, 0.55, 1], [1, 0.972, 0.965, 0.972, 1]);

  // Spine shadow on the page beneath
  const spineShadow = useTransform(flipSpring, [0, 0.2, 0.5, 0.8, 1], [0, 0.5, 0.65, 0.5, 0]);

  // Paper brightness: dims slightly mid-fold
  const brightness = useTransform(flipSpring, [0, 0.25, 0.5, 0.75, 1], [1, 0.94, 0.82, 0.94, 1]);

  // Pseudo-curl via skewY: paper bends slightly during turn
  const skewY = useTransform(flipSpring, [0, 0.5, 1], [0, flipDir === 'backward' ? -1.8 : 1.8, 0]);

  const totalSpreads = Math.ceil(pages.length / 2);
  const maxSpreadIndex = totalSpreads - 1;

  function getSpreadPages(idx) {
    if (idx < 0) return [null, pages[0] || null];
    return [pages[idx * 2] || null, pages[idx * 2 + 1] || null];
  }

  const [currentLeft, currentRight] = getSpreadPages(spreadIndex);
  const nextSpreadIndex = flipDir === 'forward' ? spreadIndex + 1 : spreadIndex - 1;
  const [nextLeft, nextRight] = getSpreadPages(nextSpreadIndex);

  /* -------- Flip forward -------- */
  const flipForward = useCallback(() => {
    if (isFlipping || !bookIsOpen || spreadIndex >= maxSpreadIndex) return;
    setIsFlipping(true);
    setFlipDir('forward');
    flipRaw.set(0);
    animate(flipRaw, 1, {
      duration: 0.78,
      ease: [0.25, 0.08, 0.3, 1],
      onComplete: () => {
        setSpreadIndex(p => p + 1);
        flipRaw.set(0);
        setIsFlipping(false);
        setFlipDir(null);
      },
    });
  }, [isFlipping, bookIsOpen, spreadIndex, maxSpreadIndex, flipRaw]);

  /* -------- Flip backward -------- */
  const flipBackward = useCallback(() => {
    if (isFlipping || !bookIsOpen || spreadIndex < 0) return;
    setIsFlipping(true);
    setFlipDir('backward');
    flipRaw.set(0);
    animate(flipRaw, 1, {
      duration: 0.78,
      ease: [0.25, 0.08, 0.3, 1],
      onComplete: () => {
        setSpreadIndex(p => p - 1);
        flipRaw.set(0);
        setIsFlipping(false);
        setFlipDir(null);
      },
    });
  }, [isFlipping, bookIsOpen, spreadIndex, flipRaw]);

  /* -------- Keyboard navigation -------- */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') flipForward();
      if (e.key === 'ArrowLeft') flipBackward();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flipForward, flipBackward]);

  /* -------- GSAP ScrollTrigger -------- */
  useGSAP(() => {
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth < 1100;

    gsap.set(bookSceneRef.current, {
      xPercent: -50,
      yPercent: -50,
      left: isMobile ? '50%' : isTablet ? '65%' : '72%',
      top: isMobile ? '58%' : '50%',
      rotationY: isMobile ? 0 : -20,
      rotationZ: isMobile ? 0 : -5,
      scale: isMobile ? 0.75 : 0.78,
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.viewport-hero',
        start: 'top top',
        end: '+=2600',
        scrub: 1.2,
        pin: true,
        onUpdate(self) {
          const opened = self.progress > 0.60;
          if (opened !== bookIsOpen) setBookIsOpen(opened);
          if (scrollHintRef.current)
            scrollHintRef.current.classList.toggle('hidden', self.progress > 0.06);
          if (headerRef.current)
            headerRef.current.classList.toggle('visible', self.progress > 0.32);
        },
      },
    });

    tl.to(heroTextRef.current, {
      opacity: 0,
      x: isMobile ? 0 : -55,
      y: isMobile ? -30 : 0,
      duration: 0.45,
      ease: 'power2.in',
    }, 0);

    tl.to(bookSceneRef.current, {
      left: '50%',
      xPercent: -50,
      rotationY: 0,
      rotationZ: 0,
      scale: 1,
      duration: 1,
      ease: 'power3.inOut',
    }, 0.12);

    tl.add(() => {
      if (coverRef.current) coverRef.current.classList.add('open');
    }, 0.64);

  }, { scope: containerRef, dependencies: [BOOK_W] });

  /* -------- Swipe / drag -------- */
  const handleDragEnd = (_, info) => {
    if (!bookIsOpen || isFlipping) return;
    if (info.offset.x < -55) flipForward();
    else if (info.offset.x > 55) flipBackward();
  };

  /* ==========================================
     RENDER
     ========================================== */
  return (
    <div ref={containerRef} className="app-container">

      {/* HEADER */}
      <header ref={headerRef} className="fixed-header">
        <div className="header-content">
          <img src={logoSvg} alt="Memoary" className="logo-header" />
          <button className="login-btn" onClick={onLoginClick}>Entrar</button>
        </div>
      </header>

      {/* HERO */}
      <div className="viewport-hero">

        <div ref={heroTextRef} className="left-hero-panel">
          <div className="slogan-container">
            <p className="slogan-eyebrow">Anuário Digital</p>
            <h1 className="slogan-text">
              Mantenha suas<br />
              <em className="highlight-gold">memórias</em><br />
              eternas para
              <em className="highlight-gold"> sempre</em>
            </h1>
            <div className="logo-initial-container">
              <img src={logoSvg} alt="Memoary" className="logo-initial" />
            </div>
            <p className="slogan-sub">Role para abrir seu anuário</p>
          </div>
        </div>

        <div ref={scrollHintRef} className="scroll-hint">
          <div className="scroll-hint-inner">
            <span className="scroll-hint-label">role</span>
            <div className="scroll-mouse">
              <div className="scroll-mouse-dot" />
            </div>
          </div>
        </div>

        {/* BOOK SCENE */}
        <div
          ref={bookSceneRef}
          className="book-scene"
          style={{ perspective: PERSPECTIVE }}
        >
          <div
            className="book-3d-wrapper"
            style={{ width: BOOK_W, height: BOOK_H }}
          >
            {/* Spine */}
            <div className="book-spine" style={{ height: BOOK_H }} />

            {/* Top edge */}
            <div className="book-top" style={{ width: BOOK_W }} />

            {/* Page stack right edge */}
            <div className="page-stack-edge" style={{ height: BOOK_H * 0.96 }} />

            {/* Static spread underneath */}
            <StaticSpread
              leftPage={currentLeft}
              rightPage={currentRight}
              spreadIndex={spreadIndex}
              preloadLeft={isFlipping && flipDir === 'forward' ? nextLeft : null}
              preloadRight={isFlipping && flipDir === 'backward' ? nextRight : null}
              width={BOOK_W}
              height={BOOK_H}
              totalPages={pages.length}
            />

            {/* Flipping page */}
            {isFlipping && (
              <FlippingPage
                flipDir={flipDir}
                rotateY={rotateY}
                flipSpring={flipSpring}
                scaleX={scaleX}
                skewY={skewY}
                spineShadow={spineShadow}
                brightness={brightness}
                curlFactor={curlFactor}
                fromPage={flipDir === 'forward' ? currentRight : nextRight}
                toPage={flipDir === 'forward' ? nextLeft : currentLeft}
                width={BOOK_W}
                height={BOOK_H}
              />
            )}

            {/* Cover */}
            <div
              ref={coverRef}
              className="book-cover-3d"
              style={{ zIndex: 20, transformStyle: 'preserve-3d' }}
            >
              <div className="cover-side-front">
                <img src={anuarioCapa} alt="Capa do Anuário" className="capa-img-render" />
                <div className="cover-gloss" />
              </div>
              <div className="cover-side-back">
                <div className="endpaper">
                  <div className="endpaper-content">
                    <img src={logoSvg} alt="" className="endpaper-logo" />
                    <span className="endpaper-text">Memoary</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drag overlay */}
            {bookIsOpen && (
              <motion.div
                className="drag-overlay"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.06}
                onDragEnd={handleDragEnd}
                style={{ zIndex: 30 }}
              />
            )}

            {/* Navigation */}
            {bookIsOpen && (
              <div className="book-nav">
                <button
                  className="book-nav-btn prev"
                  onClick={flipBackward}
                  disabled={isFlipping || spreadIndex < 0}
                  aria-label="Página anterior"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="page-counter">
                  {spreadIndex < 0
                    ? 'Capa'
                    : `${spreadIndex * 2 + 1} — ${Math.min(spreadIndex * 2 + 2, pages.length)} / ${pages.length}`
                  }
                </span>
                <button
                  className="book-nav-btn next"
                  onClick={flipForward}
                  disabled={isFlipping || spreadIndex >= maxSpreadIndex}
                  aria-label="Próxima página"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

/* ==============================================
   3. STATIC SPREAD
   ============================================== */
function StaticSpread({ leftPage, rightPage, spreadIndex, preloadLeft, preloadRight, width, height }) {
  const isFirst = spreadIndex < 0;
  const showLeft = preloadLeft || leftPage;
  const showRight = preloadRight || rightPage;

  return (
    <>
      {/* Right page */}
      <div className="static-page" style={{ zIndex: 1, width, height }}>
        <div className="page-face page-right">
          {showRight
            ? <PageContent page={showRight} />
            : <EmptyPageContent side="right" isFirst={isFirst} />
          }
          <GutterShadow side="left" />
          <div className="page-header-line" />
          {spreadIndex >= 0 && (
            <span className="page-number right">{spreadIndex * 2 + 2}</span>
          )}
        </div>
      </div>

      {/* Left page */}
      {spreadIndex >= 0 && (
        <div className="static-page" style={{ zIndex: 1, width, height }}>
          <div className="page-face page-left">
            {showLeft
              ? <PageContent page={showLeft} />
              : <EmptyPageContent side="left" />
            }
            <GutterShadow side="right" />
            <div className="page-header-line" />
            <span className="page-number left">{spreadIndex * 2 + 1}</span>
          </div>
        </div>
      )}
    </>
  );
}

/* ==============================================
   4. GUTTER SHADOW — spine shadow on pages
   ============================================== */
function GutterShadow({ side }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        [side === 'left' ? 'left' : 'right']: 0,
        width: '18%',
        height: '100%',
        background: side === 'left'
          ? 'linear-gradient(to right, rgba(0,0,0,0.13) 0%, transparent 100%)'
          : 'linear-gradient(to left, rgba(0,0,0,0.09) 0%, transparent 100%)',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  );
}

/* ==============================================
   5. FLIPPING PAGE — ultra-realistic physics
   ============================================== */
function FlippingPage({
  rotateY,
  flipSpring,
  scaleX,
  skewY,
  brightness,
  fromPage,
  toPage,
  width,
  height,
}) {
  // Shadow cast onto the page beneath while flipping
  const castShadowOpacity = useTransform(flipSpring, [0, 0.15, 0.5, 0.85, 1], [0, 0.42, 0.55, 0.42, 0]);

  // Inner fold gradient (dark crease at spine during turn)
  const foldOpacity = useTransform(flipSpring, [0, 0.35, 0.5, 0.65, 1], [0, 0.48, 0.7, 0.48, 0]);

  // Subtle sheen on leading edge of paper
  const sheenOpacity = useTransform(flipSpring, [0, 0.42, 0.5, 0.58, 1], [0, 0.0, 0.75, 0.0, 0]);

  return (
    <motion.div
      className="flippable-page-container"
      style={{
        rotateY,
        scaleX,
        skewY,
        zIndex: 15,
        transformStyle: 'preserve-3d',
        transformOrigin: 'left center',
        width,
        height,
        filter: useTransform(brightness, b => `brightness(${b})`),
      }}
    >
      {/* ── FRONT face (page being turned) ── */}
      <div
        className="page-face page-right flip-face-front"
        style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          position: 'absolute',
          inset: 0,
        }}
      >
        {fromPage ? <PageContent page={fromPage} /> : <EmptyPageContent side="right" />}

        {/* Crease shadow at spine (left edge) */}
        <motion.div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, rgba(10,6,0,0.62) 0%, rgba(10,6,0,0.22) 8%, rgba(10,6,0,0.04) 22%, transparent 45%)',
            opacity: foldOpacity, pointerEvents: 'none', zIndex: 6,
          }}
        />

        {/* Paper sheen at leading edge */}
        <motion.div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to left, rgba(255,250,238,0.82) 0%, rgba(255,250,238,0.28) 8%, transparent 22%)',
            opacity: sheenOpacity, pointerEvents: 'none', zIndex: 7,
          }}
        />

        {/* Cast shadow onto page below */}
        <motion.div
          style={{
            position: 'absolute', top: 0, right: '-44%',
            width: '44%', height: '100%',
            background: 'linear-gradient(to right, rgba(12,7,0,0.38) 0%, rgba(12,7,0,0.14) 55%, transparent 100%)',
            opacity: castShadowOpacity, pointerEvents: 'none', zIndex: 8,
            borderRadius: '0 6px 6px 0',
          }}
        />

        <GutterShadow side="left" />
        <div className="page-header-line" />
      </div>

      {/* ── BACK face (destination page) ── */}
      <div
        className="page-face page-left flip-face-back"
        style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          position: 'absolute',
          inset: 0,
        }}
      >
        {toPage ? <PageContent page={toPage} /> : <EmptyPageContent side="left" />}

        {/* Crease shadow on back face */}
        <motion.div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to left, rgba(10,6,0,0.52) 0%, rgba(10,6,0,0.18) 10%, transparent 32%)',
            opacity: foldOpacity, pointerEvents: 'none', zIndex: 6,
          }}
        />

        <GutterShadow side="right" />
        <div className="page-header-line" />
      </div>
    </motion.div>
  );
}

/* ==============================================
   6. PAGE CONTENT
   ============================================== */
function PageContent({ page }) {
  if (!page) return null;
  return (
    <div className="page-content-wrapper">
      {page.elementos?.map((el, i) => {
        if (el.tipo !== 'imagem') return null;
        return (
          <div
            key={el.id || i}
            style={{
              position: 'absolute',
              left: el.x ?? 0, top: el.y ?? 0,
              width: el.largura ?? 200, height: el.altura ?? 150,
              overflow: 'hidden',
              borderRadius: 4,
              boxShadow: '0 2px 18px rgba(0,0,0,0.13)',
            }}
          >
            <img
              src={el.url}
              alt={el.legenda || ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
              draggable={false}
            />
            {el.legenda && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(254,252,248,0.93)',
                padding: '4px 8px', fontSize: '9.5px',
                color: '#5a5040', textAlign: 'center',
                backdropFilter: 'blur(8px)',
                letterSpacing: '0.04em',
              }}>
                {el.legenda}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ==============================================
   7. EMPTY PAGE CONTENT
   ============================================== */
function EmptyPageContent({ side, isFirst }) {
  if (isFirst && side === 'right') {
    return (
      <div className="empty-book-state">
        <div className="empty-ornament-ring" />
        <svg className="empty-quill" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 4C20 4 8 16 8 36L14 30C14 20 20 12 32 4Z" fill="currentColor" opacity="0.18" />
          <path d="M14 30L8 36M14 30C14 20 20 12 32 4C20 4 8 16 8 36L14 30Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M14 30L18 26" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <p className="empty-book-text">
          Nenhuma página ainda.<br />
          <span>Acesse o painel de administrador.</span>
        </p>
      </div>
    );
  }
  return <div className="empty-page-inner" />;
}