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

  // Controle fino de progresso (0 a 1)
  const flipProgress = useMotionValue(0);

  const flipSpring = useSpring(flipProgress, {
    stiffness: 240,
    damping: 30,
    mass: 0.6,
    restDelta: 0.001,
  });

  // Rotação unificada baseada na espinha central do livro (left center do bloco da direita)
  const flipRotateY = useTransform(
    flipSpring,
    [0, 1],
    flipDir === 'left' ? [-180, 0] : [0, -180]
  );

  const foldBrightness = useTransform(
    flipSpring,
    [0, 0.25, 0.5, 0.75, 1],
    [1, 0.88, 0.75, 0.88, 1]
  );

  const shadowOpacity = useTransform(
    flipSpring,
    [0, 0.2, 0.5, 0.8, 1],
    [0, 0.4, 0.55, 0.4, 0]
  );

  const pageSkewY = useTransform(
    flipSpring,
    [0, 0.5, 1],
    [0, 2.2, 0]
  );

  const totalSpreads = Math.ceil(pages.length / 2);
  const maxSpreadIndex = totalSpreads - 1;

  // Mapeamento correto de páginas baseado no índice de spreads
  function getSpreadPages(idx) {
    if (idx < 0) return [null, pages[0] || null];
    const left = pages[idx * 2] || null;
    const right = pages[idx * 2 + 1] || null;
    return [left, right];
  }

  const [currentLeft, currentRight] = getSpreadPages(spreadIndex);
  
  const nextSpreadIndex = flipDir === 'right' ? spreadIndex + 1 : spreadIndex - 1;
  const [nextLeft, nextRight] = getSpreadPages(nextSpreadIndex);

  /* -------- Virar para frente (Avançar) -------- */
  const flipForward = useCallback(() => {
    if (isFlipping || !bookIsOpen || spreadIndex >= maxSpreadIndex) return;
    setIsFlipping(true);
    setFlipDir('right');
    flipProgress.set(0);

    animate(flipSpring, 1, {
      duration: 0.78,
      ease: [0.25, 1, 0.5, 1],
      onComplete: () => {
        setSpreadIndex(prev => prev + 1);
        flipProgress.set(0);
        setIsFlipping(false);
        setFlipDir(null);
      }
    });
  }, [isFlipping, bookIsOpen, spreadIndex, maxSpreadIndex, flipProgress, flipSpring]);

  /* -------- Virar para trás (Voltar) -------- */
  const flipBackward = useCallback(() => {
    if (isFlipping || !bookIsOpen || spreadIndex < 0) return;
    setIsFlipping(true);
    setFlipDir('left');
    flipProgress.set(0);

    animate(flipSpring, 1, {
      duration: 0.78,
      ease: [0.25, 1, 0.5, 1],
      onComplete: () => {
        setSpreadIndex(prev => prev - 1);
        flipProgress.set(0);
        setIsFlipping(false);
        setFlipDir(null);
      }
    });
  }, [isFlipping, bookIsOpen, spreadIndex, flipProgress, flipSpring]);

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

  // Determina quais páginas ficam visíveis estaticamente ao fundo durante a virada
  const staticLeft = flipDir === 'left' ? nextLeft : currentLeft;
  const staticRight = flipDir === 'right' ? nextRight : currentRight;

  // Define o conteúdo das duas faces da folha voadora em tempo de execução
  const flippingFrontFace = flipDir === 'right' ? currentRight : nextRight;
  const flippingBackFace = flipDir === 'right' ? nextLeft : currentLeft;

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
            <div className="book-spine" style={{ height: BOOK_H, left: 0, position: 'absolute', zIndex: 5 }} />

            {/* === PÁGINAS DE FUNDO === */}
            <StaticSpread
              leftPage={staticLeft}
              rightPage={staticRight}
              spreadIndex={spreadIndex}
              width={BOOK_W}
              height={BOOK_H}
            />

            {/* === PÁGINA VIRANDO === */}
            {isFlipping && (
              <FlippingPage
                flipRotateY={flipRotateY}
                flipProgress={flipSpring}
                foldBrightness={foldBrightness}
                shadowOpacity={shadowOpacity}
                pageSkewY={pageSkewY}
                frontPage={flippingFrontFace}
                backPage={flippingBackFace}
                width={BOOK_W}
                height={BOOK_H}
              />
            )}

            {/* === CAPA === */}
            <div ref={coverRef} className="book-cover-3d"
              style={{ zIndex: 20, transformStyle: 'preserve-3d', position: 'absolute', left: 0, width: BOOK_W, height: BOOK_H }}>
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
                style={{ zIndex: 30, position: 'absolute', left: -BOOK_W, width: BOOK_W * 2, height: BOOK_H }}
              />
            )}

            {/* NAVEGAÇÃO */}
            {bookIsOpen && (
              <div className="book-nav" style={{ position: 'absolute', bottom: -60, left: -BOOK_W / 2, width: BOOK_W * 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
   3. SPREAD ESTÁTICO (Corrigido posicionamento absoluto)
   ============================================== */
function StaticSpread({ leftPage, rightPage, spreadIndex, width, height }) {
  return (
    <>
      {/* Página da ESQUERDA (Fica à esquerda do ponto zero da lombada) */}
      <div className="static-page" style={{ position: 'absolute', right: '100%', top: 0, width, height, zIndex: 1 }}>
        <div className="page-face page-left" style={{ width: '100%', height: '100%', position: 'relative' }}>
          {leftPage ? (
            <PageContent page={leftPage} />
          ) : (
            <EmptyPageContent side="left" />
          )}
          <div className="page-header-line" />
          <span className="page-number left">
            {spreadIndex >= 0 ? spreadIndex * 2 + 1 : ''}
          </span>
        </div>
      </div>

      {/* Página da DIREITA (Fica à direita do ponto zero da lombada) */}
      <div className="static-page" style={{ position: 'absolute', left: 0, top: 0, width, height, zIndex: 1 }}>
        <div className="page-face page-right" style={{ width: '100%', height: '100%', position: 'relative' }}>
          {rightPage ? (
            <PageContent page={rightPage} />
          ) : (
            <EmptyPageContent side="right" isFirst={spreadIndex < 0} />
          )}
          <div className="page-header-line" />
          <span className="page-number right">
            {spreadIndex >= 0 ? spreadIndex * 2 + 2 : (rightPage ? 1 : '')}
          </span>
        </div>
      </div>
    </>
  );
}

/* ==============================================
   4. PÁGINA VIRANDO — ROTAÇÃO E BACKFACE CORRIGIDAS
   ============================================== */
function FlippingPage({
  flipRotateY,
  flipProgress,
  foldBrightness,
  shadowOpacity,
  pageSkewY,
  frontPage,
  backPage,
  width,
  height,
}) {
  // Simulação física de encurvamento de papel
  const scaleX = useTransform(flipProgress, [0, 0.5, 1], [1, 0.95, 1]);
  const foldShadowOpacity = useTransform(flipProgress, [0, 0.4, 0.5, 0.6, 1], [0, 0.45, 0.6, 0.45, 0]);
  const edgeGlowOpacity = useTransform(flipProgress, [0, 0.45, 0.5, 0.55, 1], [0, 0.8, 1, 0.8, 0]);

  return (
    <motion.div
      className="flippable-page-container"
      style={{
        position: 'absolute',
        left: 0, 
        top: 0,
        width,
        height,
        transformOrigin: 'left center', // Ancorado fixo na lombada central
        rotateY: flipRotateY,
        skewY: pageSkewY,
        scaleX,
        zIndex: 15,
        transformStyle: 'preserve-3d',
        filter: useTransform(foldBrightness, v => `brightness(${v})`),
      }}
    >
      {/* FACE DA FRENTE (Visível no lado direito, rotateY entre -90 e 90) */}
      <div 
        className="page-face page-right" 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          backfaceVisibility: 'hidden', 
          WebkitBackfaceVisibility: 'hidden',
          zIndex: 2,
          transformStyle: 'preserve-3d'
        }}
      >
        {frontPage ? <PageContent page={frontPage} /> : <EmptyPageContent side="right" />}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to left, rgba(20,12,0,0) 0%, rgba(20,12,0,0.4) 30%, rgba(20,12,0,0) 100%)',
            opacity: foldShadowOpacity,
            pointerEvents: 'none',
          }}
        />
        <motion.div
          style={{
            position: 'absolute',
            top: 0, left: 0, width: '12%', height: '100%',
            background: 'linear-gradient(to right, rgba(255,245,220,0.4) 0%, transparent 100%)',
            opacity: edgeGlowOpacity,
            pointerEvents: 'none',
          }}
        />
        <div className="page-header-line" />
      </div>

      {/* FACE DO VERSO (Visível no lado esquerdo, rotacionada em 180° por padrão interna ao container) */}
      <div
        className="page-face page-left"
        style={{
          position: 'absolute',
          inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          zIndex: 1,
          transformStyle: 'preserve-3d'
        }}
      >
        {backPage ? <PageContent page={backPage} /> : <EmptyPageContent side="left" />}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(20,12,0,0) 0%, rgba(20,12,0,0.35) 25%, rgba(20,12,0,0) 100%)',
            opacity: foldShadowOpacity,
            pointerEvents: 'none',
          }}
        />
        <div className="page-header-line" />
      </div>

      {/* SOMBRA PROJETADA NA PÁGINA ADJACENTE */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0, right: '-40%', width: '40%', height: '100%',
          background: 'linear-gradient(to right, rgba(15,8,0,0.3) 0%, transparent 100%)',
          opacity: shadowOpacity,
          backfaceVisibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
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
    <div className="page-content-wrapper" style={{ width: '100%', height: '100%', position: 'absolute' }}>
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
    <div className="empty-book-state" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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