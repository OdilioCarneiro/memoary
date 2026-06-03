import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useTransform, animate, useSpring } from 'framer-motion';
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
// Dimensões do livro (px) — proporção A5 ligeiramente paisagem
const BOOK_W = 420;
const BOOK_H = 660;
// Perspectiva da cena 3D
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
        <header style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', boxShadow: '0 1px 0 rgba(0,0,0,0.08)' }}>
          <button onClick={() => { setCurrentView('book'); fetchData(); }}
            style={{ cursor: 'pointer', background: 'none', border: 'none', fontWeight: 'bold', color: 'var(--cor-texto)', fontSize: '14px' }}>
            ← Visualizar Anuário
          </button>
          <button onClick={() => { localStorage.removeItem('adminToken'); setCurrentView('login'); }}
            style={{ cursor: 'pointer', background: '#c62828', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px' }}>
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
  // currentSpread: índice da página da esquerda do spread atual
  // -1 = capa + página 0
  //  0 = páginas 0+1 (spread 1)
  //  etc.
  const [spreadIndex, setSpreadIndex] = useState(-1);
  const [flipDir, setFlipDir] = useState(null); // 'right' | 'left'

  // Spring suave para o ângulo da página virando
  const flipAngle = useSpring(0, { stiffness: 200, damping: 28, mass: 0.8 });

  // Sombra projetada muda com o ângulo da virada
  const shadowOpacity = useTransform(flipAngle, [-180, -90, 0, 90, 180], [0, 0.5, 0, 0.5, 0]);

  const totalSpreads = Math.ceil(pages.length / 2);
  const maxSpreadIndex = totalSpreads - 1;

  /* -------- helpers de conteúdo de spread -------- */
  // Dado um spreadIndex, retorna [leftPage, rightPage] (podem ser null)
  function getSpreadPages(idx) {
    if (idx < 0) return [null, pages[0] || null];
    const left = pages[idx * 2] || null;
    const right = pages[idx * 2 + 1] || null;
    return [left, right];
  }

  const [currentLeft, currentRight] = getSpreadPages(spreadIndex);

  /* -------- virar página para frente -------- */
  const flipForward = useCallback(() => {
    if (isFlipping || !bookIsOpen) return;
    if (spreadIndex >= maxSpreadIndex) return;
    setIsFlipping(true);
    setFlipDir('right');
    flipAngle.set(0);
    animate(flipAngle, -180, {
      duration: 0.75,
      ease: [0.645, 0.045, 0.355, 1.0],
      onComplete: () => {
        setSpreadIndex(prev => prev + 1);
        flipAngle.set(0);
        setIsFlipping(false);
        setFlipDir(null);
      }
    });
  }, [isFlipping, bookIsOpen, spreadIndex, maxSpreadIndex, flipAngle]);

  /* -------- virar página para trás -------- */
  const flipBackward = useCallback(() => {
    if (isFlipping || !bookIsOpen) return;
    if (spreadIndex < 0) return;
    setIsFlipping(true);
    setFlipDir('left');
    flipAngle.set(0);
    animate(flipAngle, 180, {
      duration: 0.75,
      ease: [0.645, 0.045, 0.355, 1.0],
      onComplete: () => {
        setSpreadIndex(prev => prev - 1);
        flipAngle.set(0);
        setIsFlipping(false);
        setFlipDir(null);
      }
    });
  }, [isFlipping, bookIsOpen, spreadIndex, flipAngle]);

  /* -------- GSAP SCROLL TRIGGER -------- */
  useGSAP(() => {
    // Estado inicial do livro (antes do scroll)
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
          // Esconde o scroll hint quando o usuário começa a rolar
          if (scrollHintRef.current) {
            scrollHintRef.current.classList.toggle('hidden', self.progress > 0.05);
          }
          // Header visível depois que o texto some
          if (headerRef.current) {
            headerRef.current.classList.toggle('visible', self.progress > 0.35);
          }
        }
      }
    });

    // Texto sai pela esquerda
    tl.to(heroTextRef.current, { opacity: 0, x: -60, duration: 0.5, ease: 'power2.in' }, 0);

    // Livro se centraliza e endireita
    tl.to(bookSceneRef.current, {
      left: '50%',
      xPercent: -50,
      rotationY: 0,
      rotationZ: 0,
      scale: 1,
      duration: 1,
      ease: 'power3.inOut'
    }, 0.1);

    // Capa abre — CSS transition cuida disso via classe
    tl.add(() => {
      if (coverRef.current) coverRef.current.classList.add('open');
    }, 0.65);

  }, { scope: containerRef, dependencies: [] });

  /* -------- Drag para virar (swipe) -------- */
  const handleDragEnd = (e, info) => {
    if (!bookIsOpen || isFlipping) return;
    if (info.offset.x < -60) flipForward();
    else if (info.offset.x > 60) flipBackward();
  };

  /* -------- Rotação 3D durante o flip -------- */
  // A página que está virando rotaciona em torno do eixo left
  const flipRotateY = useTransform(flipAngle, v => v);

  /* -------- Conteúdo das páginas durante a animação -------- */
  // nextSpread: o que aparecerá depois da virada
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
          <button className="login-btn" onClick={onLoginClick}>login</button>
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
        <div ref={bookSceneRef} className="book-scene"
          style={{ perspective: PERSPECTIVE }}>

          <div className="book-3d-wrapper"
            style={{ width: BOOK_W, height: BOOK_H, transformStyle: 'preserve-3d', position: 'relative' }}>

            {/* LOMBADA */}
            <div className="book-spine" style={{ height: BOOK_H }} />

            {/* TOPO */}
            <div className="book-top" style={{ width: BOOK_W }} />

            {/* BORDA DE PÁGINAS (direita) */}
            <div className="page-stack-edge" />

            {/* === PÁGINAS DE FUNDO (spread atual, estáticas) === */}
            <StaticSpread
              leftPage={currentLeft}
              rightPage={currentRight}
              spreadIndex={spreadIndex}
              width={BOOK_W}
              height={BOOK_H}
            />

            {/* === PÁGINA VIRANDO === */}
            {isFlipping && (
              <FlippingPage
                flipDir={flipDir}
                flipRotateY={flipRotateY}
                shadowOpacity={shadowOpacity}
                fromLeft={flipDir === 'left' ? nextRight : currentRight}
                fromRight={flipDir === 'right' ? currentRight : nextLeft}
                toFront={flipDir === 'right' ? nextLeft : currentLeft}
                toBack={flipDir === 'left' ? currentLeft : nextRight}
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

            {/* ÁREA DE ARRASTE (só quando aberto) */}
            {bookIsOpen && (
              <motion.div
                className="drag-overlay"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                style={{ zIndex: 30 }}
              />
            )}

            {/* BOTÕES DE NAVEGAÇÃO */}
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
   3. SPREAD ESTÁTICO (páginas de fundo)
   ============================================== */
function StaticSpread({ leftPage, rightPage, spreadIndex}) {
  const isFirstSpread = spreadIndex < 0;

  return (
    <>
      {/* Página da DIREITA (sempre visível como fundo) */}
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

      {/* Página da ESQUERDA (visível quando livro aberto) */}
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
   4. PÁGINA VIRANDO (animação 3D)
   ============================================== */
function FlippingPage({flipRotateY, shadowOpacity, fromRight, toFront, width, height }) {
  // A página que vira parte da direita (indo para frente) ou da esquerda (voltando)
  // Frente da página que vira: conteúdo atual do lado que está virando
  // Verso: conteúdo que vai aparecer do outro lado

  return (
    <motion.div
      className="flippable-page-container"
      style={{
        rotateY: flipRotateY,
        zIndex: 15,
        transformStyle: 'preserve-3d',
        transformOrigin: 'left center',
        width,
        height,
      }}
    >
      {/* FRENTE da página virando */}
      <div className="page-face page-right" style={{ backfaceVisibility: 'hidden' }}>
        {fromRight
          ? <PageContent page={fromRight} side="right" />
          : <EmptyPageContent side="right" />
        }
        {/* Curvatura simulada */}
        <div className="page-curl-overlay" />
        <div className="page-header-line" />
      </div>

      {/* VERSO da página virando */}
      <div className="page-face page-left" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
        {toFront
          ? <PageContent page={toFront} side="left" />
          : <EmptyPageContent side="left" />
        }
        <div className="page-header-line" />
      </div>

      {/* Sombra projetada */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          right: '-40%',
          width: '40%',
          height: '100%',
          background: 'linear-gradient(to right, rgba(20,10,0,0.3), transparent)',
          opacity: shadowOpacity,
          backfaceVisibility: 'hidden',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
}

/* ==============================================
   5. RENDER DO CONTEÚDO DA PÁGINA ADMIN
   ============================================== */
function PageContent({ page}) {
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
            borderRadius: 4,
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
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
                background: 'rgba(255,255,255,0.88)',
                padding: '5px 8px',
                fontSize: '10px',
                color: '#555',
                textAlign: 'center',
                backdropFilter: 'blur(4px)',
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
   6. PÁGINA VAZIA (placeholder elegante)
   ============================================== */
function EmptyPageContent({ side, isFirst }) {
  return (
    <div className="empty-book-state">
      {isFirst && side === 'right' ? (
        <>
          <div className="empty-book-icon">📖</div>
          <p className="empty-book-text">
            Nenhuma página adicionada ainda.<br />
            <span style={{ fontSize: '0.85em', opacity: 0.7 }}>Acesse o painel de administrador para começar.</span>
          </p>
        </>
      ) : (
        <div style={{
          width: '60%',
          height: 1,
          background: 'linear-gradient(to right, transparent, rgba(200,170,105,0.3), transparent)'
        }} />
      )}
    </div>
  );
}
