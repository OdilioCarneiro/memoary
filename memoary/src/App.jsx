import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useTransform, animate, useSpring} from 'framer-motion';
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
        <button onClick={() => setCurrentView('book')}
          style={{ cursor: 'pointer', background: 'none', border: 'none', fontWeight: 'bold', color: 'var(--cor-texto)', marginBottom: '20px' }}>
          ← Voltar ao Anuário
        </button>
        <LoginPage onLoginSuccess={() => setCurrentView('admin')} />
      </div>
    );
  }

  if (currentView === 'admin') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cor-fundo)' }}>
        <header style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', boxShadow: '0 1px 0 rgba(0,0,0,0.08)', height: 75 }}>
          <button onClick={() => { setCurrentView('book'); fetchData(); }}
            style={{ cursor: 'pointer', background: 'none', border: 'none', fontWeight: 700, color: 'var(--cor-texto)', fontSize: '14px', letterSpacing: '0.02em' }}>
            ← Visualizar Anuário
          </button>
          <button onClick={() => { localStorage.removeItem('adminToken'); setCurrentView('login'); }}
            style={{ cursor: 'pointer', background: '#c62828', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 700, fontSize: '14px' }}>
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

  const [bookIsOpen, setBookIsOpen] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [spreadIndex, setSpreadIndex] = useState(-1);
  const [flipDir, setFlipDir] = useState(null);

  // High-quality spring for the flip angle
  const flipAngle = useSpring(0, {
    stiffness: 160,
    damping: 26,
    mass: 1.1,
    restDelta: 0.01,
  });

  // Secondary spring for slight page bow/curl effect


  const totalSpreads = Math.ceil(pages.length / 2);
  const maxSpreadIndex = totalSpreads - 1;

  function getSpreadPages(idx) {
    if (idx < 0) return [null, pages[0] || null];
    const left = pages[idx * 2] || null;
    const right = pages[idx * 2 + 1] || null;
    return [left, right];
  }

  const [currentLeft, currentRight] = getSpreadPages(spreadIndex);
  const nextSpreadIndex = flipDir === 'right' ? spreadIndex + 1 : spreadIndex - 1;
  const [nextLeft, nextRight] = getSpreadPages(nextSpreadIndex ?? spreadIndex);

  // Shadow that fades in mid-flip and out at completion
  const shadowOpacity = useTransform(flipAngle, v => {
    const abs = Math.abs(v);
    // peaks at 90deg (0.45 opacity), fades to 0 at 0 and 180
    return Math.sin((abs / 180) * Math.PI) * 0.5;
  });

  // Simulated page bow: a subtle scale pulse mid-flip
  const pageScaleX = useTransform(flipAngle, v => {
    const progress = Math.abs(v) / 180;
    const bow = Math.sin(progress * Math.PI) * 0.012;
    return 1 - bow;
  });

  const flipForward = useCallback(() => {
    if (isFlipping || !bookIsOpen) return;
    if (spreadIndex >= maxSpreadIndex) return;
    setIsFlipping(true);
    setFlipDir('right');
    flipAngle.set(0);
    animate(flipAngle, -180, {
      duration: 0.82,
      ease: [0.55, 0.055, 0.345, 0.965],
      onComplete: () => {
        setSpreadIndex(prev => prev + 1);
        flipAngle.set(0);
        setIsFlipping(false);
        setFlipDir(null);
      }
    });
  }, [isFlipping, bookIsOpen, spreadIndex, maxSpreadIndex, flipAngle]);

  const flipBackward = useCallback(() => {
    if (isFlipping || !bookIsOpen) return;
    if (spreadIndex < 0) return;
    setIsFlipping(true);
    setFlipDir('left');
    flipAngle.set(0);
    animate(flipAngle, 180, {
      duration: 0.82,
      ease: [0.55, 0.055, 0.345, 0.965],
      onComplete: () => {
        setSpreadIndex(prev => prev - 1);
        flipAngle.set(0);
        setIsFlipping(false);
        setFlipDir(null);
      }
    });
  }, [isFlipping, bookIsOpen, spreadIndex, flipAngle]);

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

    tl.to(heroTextRef.current, { opacity: 0, x: -60, duration: 0.5, ease: 'power2.in' }, 0);
    tl.to(bookSceneRef.current, {
      left: '50%',
      xPercent: -50,
      rotationY: 0,
      rotationZ: 0,
      scale: 1,
      duration: 1,
      ease: 'power3.inOut'
    }, 0.1);
    tl.add(() => {
      if (coverRef.current) coverRef.current.classList.add('open');
    }, 0.65);
  }, { scope: containerRef, dependencies: [] });

  const handleDragEnd = (e, info) => {
    if (!bookIsOpen || isFlipping) return;
    if (info.offset.x < -60) flipForward();
    else if (info.offset.x > 60) flipBackward();
  };

  const flipRotateY = useTransform(flipAngle, v => v);

  return (
    <div ref={containerRef} className="app-container">

      <header ref={headerRef} className="fixed-header">
        <div className="header-content">
          <img src={logoSvg} alt="Memoary" className="logo-header" />
          <button className="login-btn" onClick={onLoginClick}>Login</button>
        </div>
      </header>

      <div className="viewport-hero">

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

        <div ref={scrollHintRef} className="scroll-hint">
          <span>role para abrir</span>
          <div className="scroll-arrow" />
        </div>

        <div ref={bookSceneRef} className="book-scene"
          style={{ perspective: PERSPECTIVE }}>

          <div className="book-3d-wrapper"
            style={{ width: BOOK_W, height: BOOK_H, transformStyle: 'preserve-3d', position: 'relative' }}>

            <div className="book-spine" style={{ height: BOOK_H }} />
            <div className="book-top" style={{ width: BOOK_W }} />
            <div className="page-stack-edge" />

            {/* Static pages behind the flip */}
            <StaticSpread
              leftPage={isFlipping && flipDir === 'right' ? nextLeft : currentLeft}
              rightPage={isFlipping && flipDir === 'left' ? nextRight : currentRight}
              spreadIndex={spreadIndex}
              width={BOOK_W}
              height={BOOK_H}
            />

            {/* Flipping page layer */}
            {isFlipping && (
              <FlippingPage
                flipDir={flipDir}
                flipRotateY={flipRotateY}
                pageScaleX={pageScaleX}
                shadowOpacity={shadowOpacity}
                fromRight={flipDir === 'right' ? currentRight : nextRight}
                toFront={flipDir === 'right' ? nextLeft : currentLeft}
                width={BOOK_W}
                height={BOOK_H}
                spreadIndex={spreadIndex}
                nextSpreadIndex={nextSpreadIndex}
              />
            )}

            {/* Book cover */}
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

            {/* Drag overlay */}
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

            {/* Navigation */}
            {bookIsOpen && (
              <div className="book-nav">
                <button
                  className="book-nav-btn"
                  onClick={flipBackward}
                  disabled={isFlipping || spreadIndex < 0}
                >
                  ← Anterior
                </button>
                <span className="page-counter">
                  {spreadIndex < 0
                    ? 'Capa'
                    : `${spreadIndex * 2 + 1}–${Math.min(spreadIndex * 2 + 2, pages.length)} / ${pages.length}`
                  }
                </span>
                <button
                  className="book-nav-btn"
                  onClick={flipForward}
                  disabled={isFlipping || spreadIndex >= maxSpreadIndex}
                >
                  Próxima →
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
function StaticSpread({ leftPage, rightPage, spreadIndex }) {
  const isFirstSpread = spreadIndex < 0;

  return (
    <>
      <div className="static-page" style={{ zIndex: 1 }}>
        <div className="page-face page-right">
          {rightPage
            ? <PageContent page={rightPage} side="right" />
            : <EmptyPageContent side="right" isFirst={isFirstSpread} />
          }
          <div className="page-header-line" />
          <span className="page-number right">
            {spreadIndex >= 0 ? spreadIndex * 2 + 2 : ''}
          </span>
        </div>
      </div>

      {spreadIndex >= 0 && (
        <div className="static-page" style={{ zIndex: 1 }}>
          <div className="page-face page-left">
            {leftPage
              ? <PageContent page={leftPage} side="left" />
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
   4. PÁGINA VIRANDO — ANIMAÇÃO REALISTA
   ============================================== */
function FlippingPage({ flipRotateY, pageScaleX, shadowOpacity, fromRight, toFront, width, height }) {
  return (
    <motion.div
      className="flippable-page-container"
      style={{
        rotateY: flipRotateY,
        scaleX: pageScaleX,
        zIndex: 15,
        transformStyle: 'preserve-3d',
        transformOrigin: 'left center',
        width,
        height,
      }}
    >
      {/* FRENTE da página */}
      <div className="page-face page-right flip-front">
        {fromRight
          ? <PageContent page={fromRight} side="right" />
          : <EmptyPageContent side="right" />
        }
        {/* Gradiente de curvatura que aparece conforme a página dobra */}
        <motion.div
          className="page-curl-gradient"
          style={{ opacity: useTransform(flipRotateY, v => Math.min(Math.abs(v) / 90, 1) * 0.6) }}
        />
        <div className="page-header-line" />
      </div>

      {/* VERSO da página */}
      <div className="page-face page-left flip-back">
        {toFront
          ? <PageContent page={toFront} side="left" />
          : <EmptyPageContent side="left" />
        }
        {/* Gradiente de sombra no verso */}
        <motion.div
          className="page-back-shadow"
          style={{ opacity: useTransform(flipRotateY, v => Math.max(0, 1 - (Math.abs(v) / 90)) * 0.45) }}
        />
        <div className="page-header-line" />
      </div>

      {/* Sombra projetada na página seguinte */}
      <motion.div
        className="flip-cast-shadow"
        style={{ opacity: shadowOpacity }}
      />

      {/* Sombra da lombada no centro */}
      <div className="flip-spine-shadow" />
    </motion.div>
  );
}

/* ==============================================
   5. CONTEÚDO DA PÁGINA
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
            boxShadow: '0 3px 16px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
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
                background: 'rgba(254,252,248,0.92)',
                padding: '5px 10px',
                fontSize: '10px',
                fontFamily: "'Playfair Display', serif",
                color: 'rgba(50,42,24,0.75)',
                textAlign: 'center',
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
   6. PÁGINA VAZIA
   ============================================== */
function EmptyPageContent({ side, isFirst }) {
  return (
    <div className="empty-book-state">
      {isFirst && side === 'right' ? (
        <div className="empty-first-page">
          <div className="empty-ornament" />
          <p className="empty-book-text">
            Nenhuma página adicionada ainda.
            <span>Acesse o painel administrativo para começar.</span>
          </p>
        </div>
      ) : (
        <div className="empty-page-rule" />
      )}
    </div>
  );
}
