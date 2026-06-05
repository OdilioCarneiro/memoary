import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import './App.css';

import logoSvg     from './assets/logo.svg';
import anuarioCapa from './assets/anuario.svg';
import LoginPage   from './LoginPage';
import AdminPage   from './AdminPage';

/* ══════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════ */
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://memoary.onrender.com';

gsap.registerPlugin(ScrollTrigger);

const BOOK_W       = 430;   // page width px
const BOOK_H       = 672;   // page height px
const SPINE_W      = 22;    // visible spine thickness
const FORE_EDGE_W  = 7;     // stacked-pages right edge
const PERSP        = 2600;  // CSS perspective px

/* ══════════════════════════════════════════════
   ICONS  (zero emoji policy)
══════════════════════════════════════════════ */
const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2.5 4.5 7 9 11.5"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 2.5 9.5 7 5 11.5"/>
  </svg>
);
const ChevronBack = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2.5 4.5 7 9 11.5"/>
  </svg>
);

/* ══════════════════════════════════════════════
   1.  ROOT ORCHESTRATOR
══════════════════════════════════════════════ */
export default function App() {
  const [view,        setView]        = useState('book');
  const [anuarioData, setAnuarioData] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/anuario`);
      const j = await r.json();
      if (j.success) setAnuarioData(j.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (view !== 'book') return;
    let active = true;

    const loadAnuario = async () => {
      try {
        const r = await fetch(`${API_URL}/api/anuario`);
        const j = await r.json();
        if (!active) return;
        if (j.success) setAnuarioData(j.data);
      } catch (e) {
        console.error(e);
      }
    };

    loadAnuario();
    return () => { active = false; };
  }, [view]);

  const goLogin = () =>
    setView(localStorage.getItem('adminToken') ? 'admin' : 'login');

  if (view === 'login') return (
    <div style={{ minHeight:'100vh', background:'var(--surface-0)', padding:24 }}>
      <button className="btn-back" onClick={() => setView('book')} style={{ marginBottom:20 }}>
        <ChevronBack /> Voltar ao Anuário
      </button>
      <LoginPage onLoginSuccess={() => setView('admin')} />
    </div>
  );

  if (view === 'admin') return (
    <div style={{ minHeight:'100vh', background:'var(--surface-0)' }}>
      <header className="admin-bar">
        <div className="admin-bar-left">
          <button className="btn-back" onClick={() => { setView('book'); fetchData(); }}>
            <ChevronBack /> Visualizar Anuário
          </button>
          <span className="admin-bar-sep" />
          <span className="admin-bar-title">Painel de Administração</span>
        </div>
        <button className="btn-logout"
          onClick={() => { localStorage.removeItem('adminToken'); setView('login'); }}>
          Sair
        </button>
      </header>
      <AdminPage />
    </div>
  );

  return <BookViewer onLoginClick={goLogin} pages={anuarioData} />;
}

/* ══════════════════════════════════════════════
   2.  BOOK VIEWER  (hero + 3-D book)
══════════════════════════════════════════════ */
function BookViewer({ onLoginClick, pages }) {
  const containerRef  = useRef(null);
  const bookSceneRef  = useRef(null);
  const bookOuterRef  = useRef(null);
  const coverRef      = useRef(null);
  const headerRef     = useRef(null);
  const heroRef       = useRef(null);
  const scrollCueRef  = useRef(null);

  const [bookIsOpen,  setBookIsOpen]  = useState(false);
  const [spreadIdx,   setSpreadIdx]   = useState(-1);
  const [flipState,   setFlipState]   = useState(null);
  // flipState = { dir:'fwd'|'bwd', phase:'lift'|'fall', fromSpread, toSpread }

  /* ── spread helpers ── */
  const totalSpreads   = Math.max(0, Math.ceil(pages.length / 2));
  const maxSpreadIdx   = totalSpreads - 1;

  const getSpread = (idx) => {
    if (idx < 0) return { left: null, right: pages[0] ?? null };
    return { left: pages[idx * 2] ?? null, right: pages[idx * 2 + 1] ?? null };
  };

  const curSpread  = getSpread(spreadIdx);
  const isFlipping = flipState !== null;

  /* ──────────────────────────────────────────────────────
     FLIP ENGINE
     Uses a THREE-LAYER approach for maximum realism:

     Layer A  (z=1)  – static background spread (destination)
     Layer B  (z=25) – the turning leaf (rotateY 0→-180 or 0→180)
     Layer C  (z=20) – cast shadow on destination page (flat sibling)

     The leaf itself has:
       • front face (backface-hidden)  → source page
       • back  face (rotateY 180°)     → destination page
       • fold crease highlight (front) → bright stripe near hinge
       • self-shadow vignette  (front) → dark right edge as page peels
       • reverse shadow        (back)  → dark left edge on the revealed side

     The easing uses a custom 4-point cubic-bezier that mimics
     paper inertia: quick lift-off, slight deceleration mid-air,
     soft landing — no overshoot.
  ────────────────────────────────────────────────────── */

  // Primary motion value: degrees (0 → -180 forward, 0 → +180 backward)
  const flipMV = useMotionValue(0);

  // Normalised progress [0, 1] peaking at mid-flip
  const foldProgress = useTransform(flipMV, v =>
    Math.sin((Math.abs(v) / 180) * Math.PI)
  );

  // Crease highlight on front face (bright strip near hinge)
  const creaseHighlight = useTransform(foldProgress, [0, 0.5, 1], [0, 0.42, 0]);

  // Self-shadow right edge (front) and left edge (back)
  const selfShadowFront = useTransform(foldProgress, [0, 0.65, 1], [0, 0.38, 0.08]);
  const selfShadowBack  = useTransform(foldProgress, [0, 0.4,  1], [0.35, 0.12, 0]);

  // Cast shadow opacity on the underlying static page
  const castOpacity = useTransform(foldProgress, [0, 0.3, 0.7, 1], [0, 0.5, 0.5, 0]);

  // Cast shadow width (sweeps across the receiving page)
  const castWidth = useTransform(foldProgress, [0, 1], ['0%', '60%']);

  // Leaf rotateY (identity — flipMV is already degrees)
  const leafRY = flipMV;

  /* ── trigger flip forward ── */
  const flipForward = useCallback(() => {
    if (isFlipping || !bookIsOpen || spreadIdx >= maxSpreadIdx) return;
    const from = spreadIdx;
    const to   = spreadIdx + 1;
    setFlipState({ dir:'fwd', fromSpread: from, toSpread: to });
    flipMV.set(0);
    animate(flipMV, -180, {
      duration: 0.78,
      ease: [0.4, 0.0, 0.2, 1.0],       // Material Design "standard" — natural paper
      onComplete: () => {
        setSpreadIdx(to);
        flipMV.set(0);
        setFlipState(null);
      },
    });
  }, [isFlipping, bookIsOpen, spreadIdx, maxSpreadIdx, flipMV]);

  /* ── trigger flip backward ── */
  const flipBackward = useCallback(() => {
    if (isFlipping || !bookIsOpen || spreadIdx < 0) return;
    const from = spreadIdx;
    const to   = spreadIdx - 1;
    setFlipState({ dir:'bwd', fromSpread: from, toSpread: to });
    flipMV.set(0);
    animate(flipMV, 180, {
      duration: 0.78,
      ease: [0.4, 0.0, 0.2, 1.0],
      onComplete: () => {
        setSpreadIdx(to);
        flipMV.set(0);
        setFlipState(null);
      },
    });
  }, [isFlipping, bookIsOpen, spreadIdx, flipMV]);

  /* ── which pages are visible during flip ── */
  const flipVisible = useMemo(() => {
    if (!flipState) return null;
    const { dir, fromSpread, toSpread } = flipState;
    const from = getSpread(fromSpread);
    const to   = getSpread(toSpread);
    return {
      // The static background shows the DESTINATION spread
      bgLeft:  to.left,
      bgRight: to.right,
      // The leaf front shows the SOURCE page that's turning away
      leafFront: dir === 'fwd' ? from.right : from.left,
      // The leaf back reveals the DESTINATION page
      leafBack:  dir === 'fwd' ? to.left    : to.right,
      dir,
    };
  }, [flipState]); // eslint-disable-line

  /* ── GSAP scroll orchestration ── */
  useGSAP(() => {
    gsap.set(bookSceneRef.current, {
      xPercent: -50, yPercent: -50,
      left: '71%', top: '50%',
      rotationY: -20, rotationZ: -5,
      scale: 0.8,
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.viewport-hero',
        start: 'top top',
        end: '+=3000',
        scrub: 1.5,
        pin: true,
        onUpdate(self) {
          const opened = self.progress > 0.62;
          setBookIsOpen(p => p === opened ? p : opened);
          scrollCueRef.current?.classList.toggle('is-hidden', self.progress > 0.04);
          headerRef.current?.classList.toggle('is-visible', self.progress > 0.32);
          // Drop shadow transitions with open state
          if (bookOuterRef.current) {
            bookOuterRef.current.style.filter = opened
              ? 'drop-shadow(0 70px 50px rgba(20,14,5,0.42)) drop-shadow(0 18px 18px rgba(20,14,5,0.2))'
              : 'drop-shadow(0 35px 25px rgba(20,14,5,0.38)) drop-shadow(0 8px 8px rgba(20,14,5,0.18))';
          }
        },
      },
    });

    tl.to(heroRef.current,    { opacity:0, x:-70, duration:0.4, ease:'power2.in' }, 0);
    tl.to(bookSceneRef.current, {
      left:'50%', xPercent:-50,
      rotationY:0, rotationZ:0, scale:1,
      duration:1, ease:'expo.inOut',
    }, 0.08);
    tl.add(() => { coverRef.current?.classList.add('is-open'); }, 0.63);

  }, { scope: containerRef, dependencies: [] });

  /* ── drag to flip ── */
  const onDragEnd = (_, info) => {
    if (!bookIsOpen || isFlipping) return;
    if (info.offset.x < -65) flipForward();
    else if (info.offset.x > 65) flipBackward();
  };

  /* ── counter label ── */
  const counterLabel = useMemo(() => {
    if (spreadIdx < 0) return 'Capa';
    const lo = spreadIdx * 2 + 1;
    const hi = Math.min(spreadIdx * 2 + 2, pages.length);
    return `${lo}${lo !== hi ? `–${hi}` : ''} / ${pages.length}`;
  }, [spreadIdx, pages.length]);

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div ref={containerRef} className="app-container">

      {/* ── Header ── */}
      <header ref={headerRef} className="fixed-header">
        <div className="header-inner">
          <img src={logoSvg} alt="Memoary" className="logo-header" />
          <button className="btn-login" onClick={onLoginClick}>Entrar</button>
        </div>
      </header>

      {/* ── Hero viewport ── */}
      <div className="viewport-hero">

        {/* Slogan panel */}
        <div ref={heroRef} className="hero-text-panel">
          <span className="hero-eyebrow">Seu anuário digital</span>
          <h1 className="hero-headline">
            Guarde suas<br />
            <em>memórias</em><br />
            para sempre
          </h1>
          <img src={logoSvg} alt="Memoary" className="hero-logo-lock" />
        </div>

        {/* Scroll cue */}
        <div ref={scrollCueRef} className="scroll-cue">
          <div className="scroll-cue-track" />
          <span className="scroll-cue-label">Role para explorar</span>
        </div>

        {/* ── Book scene ── */}
        <div ref={bookSceneRef} className="book-scene" style={{ perspective: PERSP }}>
          <div ref={bookOuterRef} className="book-outer"
            style={{
              width: BOOK_W, height: BOOK_H,
              transformStyle: 'preserve-3d',
              position: 'relative',
              filter: 'drop-shadow(0 35px 25px rgba(20,14,5,0.38))',
            }}>

            {/* ─── 3D anatomy faces ─── */}
            <div className="book-spine" style={{ width: SPINE_W, height: BOOK_H, left: 0 }} />
            <div className="book-top"   style={{ width: BOOK_W,  height: SPINE_W, top: -SPINE_W + 2 }} />
            <div className="book-fore-edge" style={{ left: BOOK_W, width: FORE_EDGE_W }} />

            {/* ─── Static background spread ─── */}
            <StaticSpread
              left ={flipVisible ? flipVisible.bgLeft  : curSpread.left}
              right={flipVisible ? flipVisible.bgRight : curSpread.right}
              spreadIdx={flipState ? flipState.toSpread : spreadIdx}
              zIndex={2}
            />

            {/* ─── Turning leaf + cast shadow ─── */}
            {flipState && flipVisible && (
              <FlipLeaf
                dir={flipVisible.dir}
                frontPage={flipVisible.leafFront}
                backPage ={flipVisible.leafBack}
                leafRY={leafRY}
                creaseHighlight={creaseHighlight}
                selfShadowFront={selfShadowFront}
                selfShadowBack ={selfShadowBack}
                castOpacity={castOpacity}
                castWidth={castWidth}
                width={BOOK_W}
                height={BOOK_H}
              />
            )}

            {/* ─── Cover ─── */}
            <div ref={coverRef} className="book-cover"
              style={{ transformStyle:'preserve-3d' }}>
              <div className="cover-face cover-face--front">
                <img src={anuarioCapa} alt="Capa" className="cover-img" />
                <div className="cover-emboss" />
              </div>
              <div className="cover-face cover-face--back">
                <div className="endpaper">
                  <img src={logoSvg} alt="" className="endpaper-logo" />
                  <span className="endpaper-mark">Memoary</span>
                </div>
              </div>
            </div>

            {/* ─── Drag zone ─── */}
            {bookIsOpen && (
              <motion.div
                className="drag-zone"
                drag="x"
                dragConstraints={{ left:0, right:0 }}
                dragElastic={0.05}
                onDragEnd={onDragEnd}
              />
            )}

            {/* ─── Navigation ─── */}
            {bookIsOpen && (
              <nav className="book-nav" style={{ bottom: -(BOOK_H * 0.12) }}>
                <button className="nav-btn"
                  onClick={flipBackward}
                  disabled={isFlipping || spreadIdx < 0}>
                  <ChevronLeft />
                  <span>Anterior</span>
                </button>
                <span className="nav-counter">{counterLabel}</span>
                <button className="nav-btn"
                  onClick={flipForward}
                  disabled={isFlipping || spreadIdx >= maxSpreadIdx}>
                  <span>Próxima</span>
                  <ChevronRight />
                </button>
              </nav>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   3.  STATIC SPREAD  (background pages)
══════════════════════════════════════════════ */
function StaticSpread({ left, right, spreadIdx, zIndex = 1 }) {
  const isFirst = spreadIdx < 0;
  return (
    <>
      {/* Right page — always shown */}
      <div className="static-page" style={{ zIndex }}>
        <div className="page-face page-face--right">
          {right ? <PageContent page={right} /> : <EmptyPage isFirst={isFirst} />}
          <div className="page-rule" />
          {spreadIdx >= 0 &&
            <span className="page-folio page-folio--right">{spreadIdx * 2 + 2}</span>}
        </div>
      </div>
      {/* Left page — only once open */}
      {spreadIdx >= 0 && (
        <div className="static-page" style={{ zIndex }}>
          <div className="page-face page-face--left">
            {left ? <PageContent page={left} /> : <EmptyPage />}
            <div className="page-rule" />
            <span className="page-folio page-folio--left">{spreadIdx * 2 + 1}</span>
          </div>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════
   4.  FLIP LEAF  — the core animation element
   ══════════════════════════════════════════════
   Architecture (six sub-layers):

   [Cast shadow]  ← flat sibling, z=20, lies on bg pages
   [Leaf wrapper] ← rotates around left edge, z=25, preserve-3d
     [Front face] ← backface-hidden, page background + content
       [Crease highlight]   bright gradient moving right→left
       [Self-shadow right]  dark right edge as page lifts
     [Back face]  ← rotateY(180°), backface-hidden
       [Back self-shadow]   dark left edge on revealed side
══════════════════════════════════════════════ */
function FlipLeaf({
  dir,
  frontPage, backPage,
  leafRY, creaseHighlight, selfShadowFront, selfShadowBack,
  castOpacity, castWidth,
  width, height,
}) {

  const creaseBg = useTransform(creaseHighlight, v =>
    `linear-gradient(90deg,
      transparent calc(${0}px),
      rgba(255,255,255,${(v * 0.55).toFixed(3)}) calc(50% - 18px),
      rgba(245,240,228,${(v * 0.75).toFixed(3)}) 50%,
      rgba(210,204,190,${(v * 0.40).toFixed(3)}) calc(50% + 18px),
      transparent calc(50% + 40px))`
  );

  const selfShadowFrontBg = useTransform(selfShadowFront, v =>
    `linear-gradient(270deg, rgba(12,8,2,${(v * 0.65).toFixed(3)}) 0%, transparent 45%)`
  );

  const selfShadowBackBg = useTransform(selfShadowBack, v =>
    `linear-gradient(90deg, rgba(12,8,2,${(v * 0.5).toFixed(3)}) 0%, transparent 50%)`
  );

  /* Cast shadow gradient direction depends on flip dir */
  const castGradient = dir === 'fwd'
    ? 'linear-gradient(90deg, rgba(14,9,2,0.32) 0%, rgba(14,9,2,0.12) 40%, transparent 100%)'
    : 'linear-gradient(270deg, rgba(14,9,2,0.32) 0%, rgba(14,9,2,0.12) 40%, transparent 100%)';

  /* The cast shadow attaches to the OPPOSITE side of the hinge:
     fwd flip → shadow spreads right→left on the left page
     bwd flip → shadow spreads left→right on the right page */
  const castStyle = dir === 'fwd'
    ? { left: 0,       right: 'auto' }
    : { right: 0,      left: 'auto'  };

  return (
    <>
      {/* ── Cast shadow (flat, on top of bg pages) ── */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          height: '100%',
          width: castWidth,
          background: castGradient,
          opacity: castOpacity,
          zIndex: 20,
          pointerEvents: 'none',
          ...castStyle,
        }}
      />

      {/* ── Turning leaf ── */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width, height,
          transformStyle: 'preserve-3d',
          transformOrigin: 'left center',
          rotateY: leafRY,
          zIndex: 25,
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      >

        {/* ── FRONT FACE ── */}
        <div className="flip-face flip-face--front">
          {frontPage ? <PageContent page={frontPage} /> : <EmptyPage />}
          <div className="page-rule" />

          {/* Crease highlight — the bright fold line */}
          <motion.div style={{
            position: 'absolute', inset: 0,
            background: creaseBg,
            pointerEvents: 'none', zIndex: 6,
          }} />

          {/* Self-shadow right (page peeling away from surface) */}
          <motion.div style={{
            position: 'absolute', inset: 0,
            background: selfShadowFrontBg,
            pointerEvents: 'none', zIndex: 7,
          }} />

          {/* Subtle paper texture vignette on lift */}
          <motion.div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 60%, rgba(20,14,5,0.06) 100%)',
            pointerEvents: 'none', zIndex: 5,
            opacity: useTransform(creaseHighlight, [0, 0.5, 1], [0, 1, 0]),
          }} />
        </div>

        {/* ── BACK FACE ── */}
        <div className="flip-face flip-face--back">
          {backPage ? <PageContent page={backPage} /> : <EmptyPage />}
          <div className="page-rule" />

          {/* Self-shadow left on back face (page still partially occluded) */}
          <motion.div style={{
            position: 'absolute', inset: 0,
            background: selfShadowBackBg,
            pointerEvents: 'none', zIndex: 6,
          }} />
        </div>

      </motion.div>
    </>
  );
}

/* ══════════════════════════════════════════════
   5.  PAGE CONTENT
══════════════════════════════════════════════ */
function PageContent({ page }) {
  if (!page?.elementos?.length) return <EmptyPage />;
  return (
    <div className="page-content">
      {page.elementos.map((el, i) => {
        if (el.tipo !== 'imagem' || !el.url) return null;
        return (
          <div key={el.id ?? i} style={{
            position: 'absolute',
            left:   el.x       ?? 0,
            top:    el.y       ?? 0,
            width:  el.largura ?? 200,
            height: el.altura  ?? 150,
            overflow: 'hidden',
            borderRadius: 3,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.07)',
          }}>
            <img
              src={el.url}
              alt={el.legenda ?? 'Foto do anuário'}
              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
              loading="lazy"
              draggable={false}
            />
            {el.legenda && (
              <figcaption style={{
                position: 'absolute',
                bottom:0, left:0, right:0,
                background: 'rgba(253,249,244,0.92)',
                backdropFilter: 'blur(6px)',
                padding: '5px 10px',
                fontSize: 9,
                fontFamily: 'var(--f-display)',
                fontStyle: 'italic',
                letterSpacing: '0.04em',
                color: 'var(--ink-50)',
                textAlign: 'center',
              }}>
                {el.legenda}
              </figcaption>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════
   6.  EMPTY PAGE
══════════════════════════════════════════════ */
function EmptyPage({ isFirst = false }) {
  return (
    <div className="empty-page">
      <div className="empty-page-ornament" />
      {isFirst && (
        <p className="empty-page-text">
          Nenhuma página adicionada.<br />
          Acesse o painel para começar.
        </p>
      )}
      <div className="empty-page-ornament" />
    </div>
  );
}
