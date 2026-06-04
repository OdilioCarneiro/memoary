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
   CONSTANTES DE FÍSICA DO LIVRO
   ============================================== */
const BOOK_W = 420;
const BOOK_H = 660;
const PERSPECTIVE = 2600;

/* ==============================================
   1. APP — ORQUESTRADOR DE VIEWS
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
      <div style={{ minHeight: '100vh', background: 'var(--cor-fundo)', padding: '20px' }}>
        <button
          onClick={() => setCurrentView('book')}
          style={{
            cursor: 'pointer', background: 'none', border: 'none',
            fontWeight: '600', color: 'var(--cor-texto)', marginBottom: '20px',
            fontSize: 14, letterSpacing: '0.04em',
          }}
        >
          ← Voltar ao Anuário
        </button>
        <LoginPage onLoginSuccess={() => setCurrentView('admin')} />
      </div>
    );
  }

  if (currentView === 'admin') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cor-fundo)' }}>
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
   2. BOOK VIEWER — HERO + LIVRO ANIMADO
   ============================================== */
function BookViewer({ onLoginClick, pages }) {
  const containerRef = useRef(null);
  const bookSceneRef = useRef(null);
  const coverRef = useRef(null);
  const headerRef = useRef(null);
  const heroTextRef = useRef(null);
  const scrollHintRef = useRef(null);

  const [bookIsOpen, setBookIsOpen] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [spreadIndex, setSpreadIndex] = useState(-1);
  const [flipDir, setFlipDir] = useState(null);
  const [flipPhase, setFlipPhase] = useState('idle'); // idle | first-half | second-half

  // Raw motion value for fine-grained control
  const flipProgress = useMotionValue(0); // 0 → 1

  // Spring-smoothed version for the DOM
  const flipSpring = useSpring(flipProgress, {
    stiffness: 260,
    damping: 32,
    mass: 0.7,
    restDelta: 0.001,
  });

  // rotateY derived: 0 → -180 (forward) or 0 → 180 (backward)
  const flipRotateY = useTransform(
    flipSpring,
    [0, 1],
    flipDir === 'left' ? [0, 180] : [0, -180]
  );

  // Lighting: brightest at the edges, darker mid-fold
  const foldBrightness = useTransform(
    flipSpring,
    [0, 0.25, 0.5, 0.75, 1],
    [1, 0.92, 0.78, 0.92, 1]
  );

  // Shadow spread on adjacent page
  const shadowOpacity = useTransform(
    flipSpring,
    [0, 0.15, 0.5, 0.85, 1],
    [0, 0.45, 0.6, 0.45, 0]
  );

  // Perspective skew — simulates paper bowing
  const pageSkewY = useTransform(
    flipSpring,
    [0, 0.5, 1],
    [0, 2.5, 0]
  );

  const totalSpreads = Math.ceil(pages.length / 2);
  const maxSpreadIndex = totalSpreads - 1;

  function getSpreadPages(idx) {
    if (idx < 0) return [null, pages[0] || null];
    const left = pages[idx * 2] || null;
    const right = pages[idx * 2 + 1] || null;
    return [left, right];
  }

  const [currentLeft, currentRight] = getSpreadPages(spreadIndex);

  /* -------- virar para frente -------- */
  const flipForward = useCallback(() => {
    if (isFlipping || !bookIsOpen || spreadIndex >= maxSpreadIndex) return;
    setIsFlipping(true);
    setFlipDir('right');
    setFlipPhase('first-half');
    flipProgress.set(0);

    animate(flipProgress, 1, {
      duration: 0.82,
      ease: [0.22, 0.1, 0.36, 1],
      onUpdate: (v) => {
        if (v >= 0.5 && flipPhase === 'first-half') {
          setFlipPhase('second-half');
        }
      },
      onComplete: () => {
        setSpreadIndex(prev => prev + 1);
        flipProgress.set(0);
        setIsFlipping(false);
        setFlipDir(null);
        setFlipPhase('idle');
      }
    });
  }, [isFlipping, bookIsOpen, spreadIndex, maxSpreadIndex, flipProgress, flipPhase]);

  /* -------- virar para trás -------- */
  const flipBackward = useCallback(() => {
    if (isFlipping || !bookIsOpen || spreadIndex < 0) return;
    setIsFlipping(true);
    setFlipDir('left');
    setFlipPhase('first-half');
    flipProgress.set(0);

    animate(flipProgress, 1, {
      duration: 0.82,
      ease: [0.22, 0.1, 0.36, 1],
      onUpdate: (v) => {
        if (v >= 0.5 && flipPhase === 'first-half') {
          setFlipPhase('second-half');
        }
      },
      onComplete: () => {
        setSpreadIndex(prev => prev - 1);
        flipProgress.set(0);
        setIsFlipping(false);
        setFlipDir(null);
        setFlipPhase('idle');
      }
    });
  }, [isFlipping, bookIsOpen, spreadIndex, flipProgress, flipPhase]);

  /* -------- GSAP SCROLL TRIGGER -------- */
  useGSAP(() => {
    gsap.set(bookSceneRef.current, {
      xPercent: -50,
      yPercent: -50,
      left: '72%',
      top: '50%',
      rotationY: -22,
      rotationZ: -6,
      scale: 0.82,
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.viewport-hero',
        start: 'top top',
        end: '+=2800',
        scrub: 1.4,
        pin: true,
        onUpdate(self) {
          const opened = self.progress > 0.62;
          if (opened !== bookIsOpen) setBookIsOpen(opened);
          if (scrollHintRef.current) {
            scrollHintRef.current.classList.toggle('hidden', self.progress > 0.05);
          }
          if (headerRef.current) {
            headerRef.current.classList.toggle('visible', self.progress > 0.35);
          }
        }
      }
    });

    tl.to(heroTextRef.current, {
      opacity: 0,
      x: -60,
      duration: 0.5,
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
    }, 0.1);

    tl.add(() => {
      if (coverRef.current) coverRef.current.classList.add('open');
    }, 0.65);

  }, { scope: containerRef, dependencies: [] });

  /* -------- Drag / swipe -------- */
  const handleDragEnd = (e, info) => {
    if (!bookIsOpen || isFlipping) return;
    if (info.offset.x < -60) flipForward();
    else if (info.offset.x > 60) flipBackward();
  };

  const nextSpreadIndex = flipDir === 'right' ? spreadIndex + 1 : spreadIndex - 1;
  const [nextLeft, nextRight] = getSpreadPages(nextSpreadIndex);

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

      {/* HERO VIEWPORT */}
      <div className="viewport-hero">

        {/* TEXTO SLOGAN */}
        <div ref={heroTextRef} className="left-hero-panel">
          <div className="slogan-container">
            <h1 className="slogan-text">
              Mantenha suas <span className="highlight-gold">memórias</span><br />
              eternas para <span className="highlight-gold">sempre</span> com
            </h1>
            <div className="logo-initial-container">
              <img src={logoSvg} alt="Memoary" className="logo-initial" />
            </div>
          </div>
        </div>

        {/* SCROLL HINT */}
        <div ref={scrollHintRef} className="scroll-hint">
          <span>role para abrir</span>
          <div className="scroll-arrow" />
        </div>

        {/* CENA DO LIVRO */}
        <div ref={bookSceneRef} className="book-scene" style={{ perspective: PERSPECTIVE }}>

          <div className="book-3d-wrapper"
            style={{ width: BOOK_W, height: BOOK_H, transformStyle: 'preserve-3d', position: 'relative' }}>

            {/* LOMBADA */}
            <div className="book-spine" style={{ height: BOOK_H }} />

            {/* TOPO */}
            <div className="book-top" style={{ width: BOOK_W }} />

            {/* BORDA DE PÁGINAS */}
            <div className="page-stack-edge" />

            {/* === PÁGINAS DE FUNDO === */}
            <StaticSpread
              leftPage={currentLeft}
              rightPage={currentRight}
              spreadIndex={spreadIndex}
              nextLeft={isFlipping && flipDir === 'right' ? nextLeft : null}
              nextRight={isFlipping && flipDir === 'left' ? nextRight : null}
              width={BOOK_W}
              height={BOOK_H}
            />

            {/* === PÁGINA VIRANDO === */}
            {isFlipping && (
              <FlippingPage
                flipDir={flipDir}
                flipRotateY={flipRotateY}
                flipProgress={flipSpring}
                foldBrightness={foldBrightness}
                shadowOpacity={shadowOpacity}
                pageSkewY={pageSkewY}
                fromRight={flipDir === 'right' ? currentRight : nextRight}
                toFront={flipDir === 'right' ? nextLeft : currentLeft}
                spreadIndex={spreadIndex}
                nextSpreadIndex={nextSpreadIndex}
                width={BOOK_W}
                height={BOOK_H}
              />
            )}

            {/* === CAPA === */}
            <div ref={coverRef} className="book-cover-3d"
              style={{ zIndex: 20, transformStyle: 'preserve-3d' }}>
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

            {/* DRAG OVERLAY */}
            {bookIsOpen && (
              <motion.div
                className="drag-overlay"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.08}
                onDragEnd={handleDragEnd}
                style={{ zIndex: 30 }}
              />
            )}

            {/* NAVEGAÇÃO */}
            {bookIsOpen && (
              <div className="book-nav">
                <button
                  className="book-nav-btn"
                  onClick={flipBackward}
                  disabled={isFlipping || spreadIndex < 0}
                >
                  Anterior
                </button>
                <span className="page-counter">
                  {spreadIndex < 0
                    ? 'Capa'
                    : `${spreadIndex * 2 + 1} – ${Math.min(spreadIndex * 2 + 2, pages.length)} / ${pages.length}`
                  }
                </span>
                <button
                  className="book-nav-btn"
                  onClick={flipForward}
                  disabled={isFlipping || spreadIndex >= maxSpreadIndex}
                >
                  Próxima
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
   3. SPREAD ESTÁTICO
   ============================================== */
function StaticSpread({ leftPage, rightPage, spreadIndex, nextLeft, nextRight }) {
  const isFirstSpread = spreadIndex < 0;

  // When flipping forward, show next left page already on the left side
  // When flipping backward, show next right page on the right side
  const displayLeft = nextLeft || leftPage;
  const displayRight = nextRight || rightPage;

  return (
    <>
      {/* Página da DIREITA */}
      <div className="static-page" style={{ zIndex: 1 }}>
        <div className="page-face page-right">
          {displayRight
            ? <PageContent page={displayRight} side="right" />
            : <EmptyPageContent side="right" isFirst={isFirstSpread} />
          }
          <div className="page-header-line" />
          <span className="page-number right">
            {spreadIndex >= 0 ? spreadIndex * 2 + 2 : ''}
          </span>
        </div>
      </div>

      {/* Página da ESQUERDA */}
      {spreadIndex >= 0 && (
        <div className="static-page" style={{ zIndex: 1 }}>
          <div className="page-face page-left">
            {displayLeft
              ? <PageContent page={displayLeft} side="left" />
              : <EmptyPageContent side="left" />
            }
            <div className="page-header-line" />
            <span className="page-number left">{spreadIndex * 2 + 1}</span>
          </div>
        </div>
      )}
    </>
  );
}

/* ==============================================
   4. PÁGINA VIRANDO — FÍSICA APRIMORADA
   ============================================== */
function FlippingPage({

  flipRotateY,
  flipProgress,
  foldBrightness,
  shadowOpacity,
  pageSkewY,
  fromRight,
  toFront,
  width,
  height,
}) {
  // Curvatura de papel: escala X levemente no meio da virada (simula encurvamento)
  const scaleX = useTransform(flipProgress, [0, 0.5, 1], [1, 0.97, 1]);

  // Gradiente de sombra lateral (sombra de dobramento)
  const foldShadowOpacity = useTransform(flipProgress, [0, 0.4, 0.5, 0.6, 1], [0, 0.55, 0.7, 0.55, 0]);

  // Brilho na borda da folha (reflexo de papel)
  const edgeGlowOpacity = useTransform(flipProgress, [0, 0.45, 0.5, 0.55, 1], [0, 0.9, 1, 0.9, 0]);

  return (
    <motion.div
      className="flippable-page-container"
      style={{
        rotateY: flipRotateY,
        skewY: pageSkewY,
        scaleX,
        zIndex: 15,
        transformStyle: 'preserve-3d',
        transformOrigin: 'left center',
        width,
        height,
        filter: useTransform(foldBrightness, v => `brightness(${v})`),
      }}
    >
      {/* FRENTE da página virando */}
      <div className="page-face page-right" style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}>
        {fromRight
          ? <PageContent page={fromRight} side="right" />
          : <EmptyPageContent side="right" />
        }
        {/* Sombra de dobramento sobre a frente */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to left, rgba(20,12,0,0.0) 0%, rgba(20,12,0,0.55) 30%, rgba(20,12,0,0.0) 100%)',
            opacity: foldShadowOpacity,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
        {/* Brilho de reflexo da borda */}
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '12%',
            height: '100%',
            background: 'linear-gradient(to right, rgba(255,245,220,0.7) 0%, transparent 100%)',
            opacity: edgeGlowOpacity,
            pointerEvents: 'none',
            zIndex: 6,
          }}
        />
        <div className="page-header-line" />
      </div>

      {/* VERSO da página virando */}
      <div
        className="page-face page-left"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          position: 'absolute',
          inset: 0,
        }}
      >
        {toFront
          ? <PageContent page={toFront} side="left" />
          : <EmptyPageContent side="left" />
        }
        {/* Sombra de dobramento no verso */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(20,12,0,0.0) 0%, rgba(20,12,0,0.45) 25%, rgba(20,12,0,0.0) 100%)',
            opacity: foldShadowOpacity,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
        <div className="page-header-line" />
      </div>

      {/* Sombra projetada sobre a página adjacente */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          right: '-45%',
          width: '45%',
          height: '100%',
          background: 'linear-gradient(to right, rgba(15,8,0,0.38) 0%, rgba(15,8,0,0.15) 50%, transparent 100%)',
          opacity: shadowOpacity,
          backfaceVisibility: 'hidden',
          pointerEvents: 'none',
          zIndex: 20,
          borderRadius: '0 6px 6px 0',
        }}
      />
    </motion.div>
  );
}

/* ==============================================
   5. CONTEÚDO DE PÁGINA
   ============================================== */
function PageContent({ page }) {
  if (!page) return null;
  return (
    <div className="page-content-wrapper">
      {page.elementos?.map((el, i) => {
        if (el.tipo !== 'imagem') return null;
        return (
          <div key={el.id || i} style={{
            position: 'absolute',
            left: el.x ?? 0,
            top: el.y ?? 0,
            width: el.largura ?? 200,
            height: el.altura ?? 150,
            overflow: 'hidden',
            borderRadius: 3,
            boxShadow: '0 2px 16px rgba(0,0,0,0.14)',
          }}>
            <img
              src={el.url}
              alt={el.legenda || 'Foto do anuário'}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
              draggable={false}
            />
            {el.legenda && (
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                background: 'rgba(255,252,248,0.92)',
                padding: '5px 8px',
                fontSize: '10px',
                color: '#555',
                textAlign: 'center',
                backdropFilter: 'blur(6px)',
                letterSpacing: '0.03em',
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
   6. PÁGINA VAZIA
   ============================================== */
function EmptyPageContent({ side, isFirst }) {
  return (
    <div className="empty-book-state">
      {isFirst && side === 'right' ? (
        <div className="empty-book-inner">
          <div className="empty-book-ornament" />
          <p className="empty-book-text">
            Nenhuma página adicionada ainda.<br />
            <span>Acesse o painel de administrador para começar.</span>
          </p>
        </div>
      ) : (
        <div className="empty-page-divider" />
      )}
    </div>
  );
}