import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
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

const PAGE_W      = 430;
const BOOK_H      = 672;
const SPINE_W     = 2;
const FORE_EDGE_W = 7;
const SPREAD_W    = PAGE_W * 2 + SPINE_W;   // 882px — always fixed
const PERSP       = 2600;

/* ══════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════ */
const ChevronLeft  = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2.5 4.5 7 9 11.5"/></svg>;
const ChevronRight = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2.5 9.5 7 5 11.5"/></svg>;
const ChevronBack  = () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2.5 4.5 7 9 11.5"/></svg>;
const IcoClose     = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4l10 10M14 4L4 14"/></svg>;
const IcoSend      = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M13 7.5 2 2l2.5 5.5L2 13l11-5.5z"/></svg>;
const IcoHeart = ({ filled }) => <svg width="15" height="15" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 13.5S1.5 9.5 1.5 5.5A3.5 3.5 0 0 1 8 3.2 3.5 3.5 0 0 1 14.5 5.5C14.5 9.5 8 13.5 8 13.5z"/></svg>;
const IcoNavLeft   = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4 7 10l6 6"/></svg>;
const IcoNavRight  = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4l6 6-6 6"/></svg>;

function cloudinaryUrl(src, opts = {}) {
  if (!src) return src;
  if (/^https?:\/\/res\.cloudinary\.com\//.test(src)) return src;
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
  if (!cloud) return src;
  const transform = opts.transform || 'f_auto,q_auto,w_1200';
  return `https://res.cloudinary.com/${cloud}/image/fetch/${transform}/${encodeURIComponent(src)}`;
}

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
    const load = async () => {
      try {
        const r = await fetch(`${API_URL}/api/anuario`);
        const j = await r.json();
        if (!active) return;
        if (j.success) {
          let data = j.data;
          if (data.length % 2 === 1) data = [...data, { _id: 'spacer-' + Date.now(), elementos: [] }];
          setAnuarioData(data);
        }
      } catch (e) { console.error(e); }
    };
    Promise.resolve().then(() => { if (active) load(); });
    return () => { active = false; };
  }, [view]);

  const goLogin = () => setView(localStorage.getItem('adminToken') ? 'admin' : 'login');

  if (view === 'login') return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-0)', padding: 24 }}>
      <button className="btn-back" onClick={() => setView('book')} style={{ marginBottom: 20 }}>
        <ChevronBack /> Voltar ao Anuário
      </button>
      <LoginPage onLoginSuccess={() => setView('admin')} />
    </div>
  );

  if (view === 'admin') return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-0)' }}>
      <header className="admin-bar">
        <div className="admin-bar-left">
          <button className="btn-back" onClick={() => { setView('book'); fetchData(); }}>
            <ChevronBack /> Visualizar Anuário
          </button>
          <span className="admin-bar-sep" />
          <span className="admin-bar-title">Painel de Administração</span>
        </div>
        <button className="btn-logout" onClick={() => { localStorage.removeItem('adminToken'); setView('login'); }}>
          Sair
        </button>
      </header>
      <AdminPage />
    </div>
  );

  return <BookViewer onLoginClick={goLogin} pages={anuarioData} />;
}

/* ══════════════════════════════════════════════
   2.  BOOK VIEWER
   
   Architecture — two-phase design:

   PHASE 1 — INTRO (scroll-driven GSAP animation):
     A decorative "intro book" (just the cover + endpaper) animates in via
     scroll. It rotates, centers, and the cover flips open. This book has
     NO content pages — it's pure cinematic chrome.

   PHASE 2 — READER (after intro completes):
     Once the cover finishes opening, a crossfade swaps the intro book for
     the real SpreadReader. The swap is imperceptible to the user because:
     - Both elements are the same pixel size at the same screen position.
     - The intro book fades out (opacity 0, pointer-events none).
     - The SpreadReader fades in simultaneously.
     - The SpreadReader has the FIXED SPREAD_W layout from the start,
       so its left page is always correctly rendered.
══════════════════════════════════════════════ */
function BookViewer({ onLoginClick, pages }) {
  const containerRef  = useRef(null);
  const bookSceneRef  = useRef(null);
  const introBookRef  = useRef(null);
  const coverRef      = useRef(null);
  const navRef        = useRef(null);
  const headerRef     = useRef(null);
  const heroRef       = useRef(null);
  const scrollCueRef  = useRef(null);

  // Phase tracking: 'intro' | 'transitioning' | 'reader'
  const [phase,      setPhase]      = useState('intro');
  const [photoModal, setPhotoModal] = useState(null);

  // Scale to fit the full SPREAD_W in viewport
  const [bookScale, setBookScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const isMobile = window.innerWidth <= 899;
      const availW = isMobile ? window.innerWidth * 0.94 : window.innerWidth * 0.62;
      const availH = window.innerHeight * (isMobile ? 0.52 : 0.76);
      setBookScale(Math.min(availW / SPREAD_W, availH / BOOK_H, 1));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const allPhotos = useMemo(() =>
    pages.flatMap(pg =>
      (pg.elementos ?? [])
        .filter(el => el.tipo === 'imagem' && el.url)
        .map(el => ({ id: el.id ?? el.url, url: cloudinaryUrl(el.url), legenda: el.legenda ?? '' }))
    )
  , [pages]);

  const openPhoto = useCallback((el) => {
    setPhotoModal({ photo: { id: el.id ?? el.url, url: cloudinaryUrl(el.url), legenda: el.legenda ?? '' }, allPhotos });
  }, [allPhotos]);

  // Called once when the cover finishes opening → swap intro → reader
  const triggerPhaseTransition = useCallback(() => {
    setPhase(p => p === 'intro' ? 'transitioning' : p);
    // After a brief crossfade, the reader is fully active
    setTimeout(() => setPhase('reader'), 800);
  }, []);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    const onUpdate = (self) => {
      if (scrollCueRef.current) scrollCueRef.current.classList.toggle('is-hidden', self.progress > 0.04);
      if (headerRef.current)    headerRef.current.classList.toggle('is-visible',  self.progress > 0.32);
      if (introBookRef.current) {
        introBookRef.current.style.boxShadow = self.progress > 0.62
          ? '-35px 35px 65px rgba(15,10,5,0.45)'
          : '-15px 15px 35px rgba(15,10,5,0.35)';
      }
    };

    const onCoverOpen = () => {
      if (coverRef.current) coverRef.current.classList.add('is-open');
      // Delay slightly so CSS transition finishes before swap
      setTimeout(triggerPhaseTransition, 900);
    };

    mm.add('(min-width: 900px)', () => {
      gsap.set(bookSceneRef.current, { xPercent: -50, yPercent: -50, left: '72%', top: '48%', rotationY: -20, rotationZ: -5, scale: 0.78 });
      if (navRef.current)    gsap.set(navRef.current,    { y: 0 });
      if (headerRef.current) gsap.set(headerRef.current, { y: 0, opacity: 1 });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: '.viewport-hero', start: 'top top', end: '+=3000', scrub: 1.5, pin: true, onUpdate },
      });
      tl.to(heroRef.current,      { opacity: 0, x: -90, duration: 0.4, ease: 'power2.in' }, 0);
      tl.to(bookSceneRef.current, { left: '50%', xPercent: -50, top: '50%', rotationY: 0, rotationZ: 0, scale: 1, duration: 1, ease: 'expo.inOut' }, 0.08);
      if (navRef.current)    tl.to(navRef.current,    { y: -24,  duration: 1.1, ease: 'expo.inOut' }, 0.08);
      if (headerRef.current) tl.to(headerRef.current, { y: -120, opacity: 0,   duration: 1.1, ease: 'expo.inOut' }, 0.08);
      tl.add(onCoverOpen, 0.63);
    });

    mm.add('(max-width: 899px)', () => {
      gsap.set(bookSceneRef.current, { xPercent: -50, yPercent: -50, left: '50%', top: '55%', rotationY: -15, rotationZ: -3, scale: 0.85 });
      gsap.set(navRef.current,    { y: 0 });
      gsap.set(headerRef.current, { y: 0, opacity: 1 });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: '.viewport-hero', start: 'top top', end: '+=2500', scrub: 1.5, pin: true, onUpdate },
      });
      tl.to(heroRef.current,      { opacity: 0, y: -50, duration: 0.4, ease: 'power2.in' }, 0);
      tl.to(bookSceneRef.current, { left: '50%', xPercent: -50, top: '50%', rotationY: 0, rotationZ: 0, scale: 1, duration: 1, ease: 'expo.inOut' }, 0.08);
      if (navRef.current)    tl.to(navRef.current,    { y: -18,  duration: 1.1, ease: 'expo.inOut' }, 0.08);
      if (headerRef.current) tl.to(headerRef.current, { y: -120, opacity: 0,   duration: 1.1, ease: 'expo.inOut' }, 0.08);
      tl.add(onCoverOpen, 0.63);
    });
  }, { scope: containerRef, dependencies: [] });

  const isIntro       = phase === 'intro';
  const isTransition  = phase === 'transitioning';
  const isReader      = phase === 'reader';

  return (
    <div ref={containerRef} className="app-container">

      <header ref={headerRef} className="fixed-header">
        <div className="header-inner">
          <img src={logoSvg} alt="Memoary" className="logo-header" />
          <button className="btn-login" onClick={onLoginClick}>Entrar</button>
        </div>
      </header>

      <div className="viewport-hero">
        <div ref={heroRef} className="hero-text-panel">
          <span className="hero-eyebrow">Seu anuário digital</span>
          <h1 className="hero-headline">Guarde suas<br /><em>memórias</em><br />para sempre</h1>
          <img src={logoSvg} alt="Memoary" className="hero-logo-lock" />
        </div>

        <div ref={scrollCueRef} className="scroll-cue">
          <div className="scroll-cue-track" />
          <span className="scroll-cue-label">Role para explorar</span>
        </div>

        {/*
          bookSceneRef is the GSAP-animated anchor.
          Both the intro book and the spread reader live inside it,
          occupying the same SPREAD_W × BOOK_H footprint so the crossfade
          is a perfect pixel-for-pixel swap.
        */}
        <div ref={bookSceneRef} className="book-scene" style={{ perspective: PERSP }}>
          <div style={{
            transform: `scale(${bookScale})`,
            transformOrigin: 'center center',
            display: 'inline-block',
            transformStyle: 'preserve-3d',
            width: SPREAD_W,
            height: BOOK_H,
            position: 'relative',
          }}>

            {/* ══════════════════════════════════════════
                PHASE 1 — INTRO BOOK (cinematic chrome)
                Visible only during 'intro' and 'transitioning'.
                Fades out when transitioning begins.
                Contains: 3D spine, cover, endpaper. NO content pages.
            ══════════════════════════════════════════ */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transformStyle: 'preserve-3d',
                transition: 'opacity 0.7s ease',
                opacity: isReader ? 0 : 1,
                pointerEvents: isReader ? 'none' : 'auto',
                zIndex: isReader ? 0 : 10,
              }}
            >
              {/* The intro book sits in the RIGHT half of the SPREAD_W container —
                  because in the intro the "book" appears as a single closed cover.
                  We offset it to the right half so when the cover opens to reveal
                  the left page area, everything is already correctly positioned. */}
              <div
                ref={introBookRef}
                className="book-outer"
                style={{
                  position: 'absolute',
                  left: PAGE_W + SPINE_W,   // right half
                  top: 0,
                  width: PAGE_W,
                  height: BOOK_H,
                  transformStyle: 'preserve-3d',
                  boxShadow: '-10px 10px 20px rgba(20,14,5,0.2)',
                  transition: 'box-shadow 0.6s ease',
                }}
              >
                {/* 3D structural faces for the single-cover intro book */}
                <div className="book-spine"     style={{ width: SPINE_W, height: BOOK_H, left: 0 }} />
                <div className="book-top"       style={{ width: PAGE_W,  height: SPINE_W, top: -SPINE_W + 2 }} />
                <div className="book-fore-edge" style={{ left: PAGE_W, width: FORE_EDGE_W }} />

                {/* Right page visible through the cover gap */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg, #a8a39a 0%, #cdc8bf 1%, #e5e0d6 3%, var(--paper) 100%)',
                  borderRadius: '2px 5px 5px 2px', overflow: 'hidden',
                }}>
                  <div className="page-rule" />
                </div>

                {/* Cover — same CSS class, same transition as before */}
                <div
                  ref={coverRef}
                  className="book-cover"
                  style={{
                    position: 'absolute', inset: 0,
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'left center',
                    pointerEvents: isReader ? 'none' : 'auto',
                  }}
                >
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
              </div>
            </div>

            {/* ══════════════════════════════════════════
                PHASE 2 — SPREAD READER (real album)
                Hidden during 'intro', crossfades in during 'transitioning',
                fully active in 'reader'.

                Key design: this component is ALWAYS SPREAD_W wide.
                Left page  → left=0,              width=PAGE_W
                Spine divider → left=PAGE_W,       width=SPINE_W
                Right page → left=PAGE_W+SPINE_W,  width=PAGE_W

                There are NO 3D transforms on the individual page faces.
                Just plain absolute-positioned divs — guaranteed to work.
            ══════════════════════════════════════════ */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transition: 'opacity 0.7s ease 0.1s',
                opacity: isIntro ? 0 : 1,
                pointerEvents: isIntro ? 'none' : 'auto',
                zIndex: isIntro ? 0 : 10,
              }}
            >
              {(isTransition || isReader) && (
                <SpreadReader
                  pages={pages}
                  onPhotoClick={openPhoto}
                  navRef={navRef}
                />
              )}
            </div>

          </div>
        </div>
      </div>

      <AnimatePresence>
        {photoModal && (
          <PhotoModal
            photo={photoModal.photo}
            allPhotos={photoModal.allPhotos}
            onClose={() => setPhotoModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════
   3.  SPREAD READER
   
   Self-contained album viewer. No GSAP, no 3D transforms on pages.
   Pages are plain absolute divs, always correctly positioned.
   
   Layout (always SPREAD_W = 882px wide):
   ┌──────────────────────────────────────────────┐
   │  LEFT (PAGE_W=430) │ SPINE │ RIGHT (PAGE_W) │
   └──────────────────────────────────────────────┘
══════════════════════════════════════════════ */
function SpreadReader({ pages, onPhotoClick, navRef }) {
  const [spreadIdx,  setSpreadIdx]  = useState(0);
  const [flipState,  setFlipState]  = useState(null);

  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2));
  const maxIdx       = totalSpreads - 1;
  const isFlipping   = flipState !== null;

  const getSpread = useCallback((idx) => ({
    left:  pages[Math.max(0, idx) * 2]     ?? null,
    right: pages[Math.max(0, idx) * 2 + 1] ?? null,
  }), [pages]);

  const curSpread = getSpread(spreadIdx);

  /* Page-turn motion values */
  const flipMV          = useMotionValue(0);
  const foldProgress    = useTransform(flipMV, v => Math.sin((Math.abs(v) / 180) * Math.PI));
  const creaseHighlight = useTransform(foldProgress, [0, .5, 1], [0, .42, 0]);
  const selfShadowFront = useTransform(foldProgress, [0, .65, 1], [0, .38, .08]);
  const selfShadowBack  = useTransform(foldProgress, [0, .4,  1], [.35, .12, 0]);
  const castOpacity     = useTransform(foldProgress, [0, .3, .7, 1], [0, .5, .5, 0]);

  const flipForward = useCallback(() => {
    if (isFlipping || spreadIdx >= maxIdx) return;
    const from = spreadIdx, to = spreadIdx + 1;
    setFlipState({ dir: 'fwd', fromSpread: from, toSpread: to });
    flipMV.set(0);
    animate(flipMV, -180, {
      duration: 0.95, ease: [0.45, 0.0, 0.15, 1.0],
      onComplete: () => { setSpreadIdx(to); flipMV.set(0); setFlipState(null); },
    });
  }, [isFlipping, spreadIdx, maxIdx, flipMV]);

  const flipBackward = useCallback(() => {
    if (isFlipping || spreadIdx <= 0) return;
    const from = spreadIdx, to = spreadIdx - 1;
    setFlipState({ dir: 'bwd', fromSpread: from, toSpread: to });
    flipMV.set(0);
    animate(flipMV, 180, {
      duration: 0.95, ease: [0.45, 0.0, 0.15, 1.0],
      onComplete: () => { setSpreadIdx(to); flipMV.set(0); setFlipState(null); },
    });
  }, [isFlipping, spreadIdx, flipMV]);

  // During flip: background shows destination, leaf shows departing/arriving page
  const flipVisible = useMemo(() => {
    if (!flipState) return null;
    const { dir, fromSpread, toSpread } = flipState;
    const from = getSpread(fromSpread);
    const to   = getSpread(toSpread);
    return {
      bgLeft:    dir === 'fwd' ? from.left  : to.left,
      bgRight:   dir === 'fwd' ? to.right   : from.right,
      leafFront: dir === 'fwd' ? from.right : to.right,
      leafBack:  dir === 'fwd' ? to.left    : from.left,
      dir,
    };
  }, [flipState, getSpread]);

  const displayLeft  = flipVisible ? flipVisible.bgLeft  : curSpread.left;
  const displayRight = flipVisible ? flipVisible.bgRight : curSpread.right;

  const counterLabel = useMemo(() => {
    const lo = spreadIdx * 2 + 1;
    const hi = Math.min(spreadIdx * 2 + 2, pages.length);
    return `${lo}${lo !== hi ? `–${hi}` : ''} / ${pages.length}`;
  }, [spreadIdx, pages.length]);

  return (
    <div style={{
      position: 'relative', width: SPREAD_W, height: BOOK_H,
      borderRadius: 6,
      boxShadow:
        '0 2px 6px rgba(20,14,5,0.10), ' +
        '0 18px 40px -12px rgba(20,14,5,0.30), ' +
        '0 45px 90px -25px rgba(20,14,5,0.35)',
    }}>

      {/* ── SPREAD BACKGROUND: left page + spine + right page ── */}
      <SpreadBackground
        left={displayLeft}
        right={displayRight}
        spreadIdx={flipVisible ? flipState.toSpread : spreadIdx}
        onPhotoClick={!flipState ? onPhotoClick : undefined}
      />

      {/* ── FLIPPING LEAF (only during animation) ── */}
      {flipState && flipVisible && (
        <FlipLeaf
          dir={flipVisible.dir}
          frontPage={flipVisible.leafFront}
          backPage={flipVisible.leafBack}
          flipMV={flipMV}
          creaseHighlight={creaseHighlight}
          selfShadowFront={selfShadowFront}
          selfShadowBack={selfShadowBack}
          castOpacity={castOpacity}
        />
      )}

      {/* ── NAVIGATION ── */}
      <nav
        ref={navRef}
        className="book-nav"
        style={{ bottom: -(BOOK_H * 0.12), left: '50%' }}
      >
        <button className="nav-btn" onClick={flipBackward} disabled={isFlipping || spreadIdx <= 0}>
          <ChevronLeft /><span>Anterior</span>
        </button>
        <span className="nav-counter">{counterLabel}</span>
        <button className="nav-btn" onClick={flipForward} disabled={isFlipping || spreadIdx >= maxIdx}>
          <span>Próxima</span><ChevronRight />
        </button>
      </nav>
    </div>
  );
}

/* ══════════════════════════════════════════════
   4.  SPREAD BACKGROUND

   THE FIX — three plain sibling divs, never overlapping:
   • Left page:    position absolute, left=0,              width=PAGE_W
   • Spine strip:  position absolute, left=PAGE_W,         width=SPINE_W
   • Right page:   position absolute, left=PAGE_W+SPINE_W, width=PAGE_W

   No CSS classes that fight the layout (we override .page-face via inline style).
   The background gradients from App.css are preserved for aesthetics.
══════════════════════════════════════════════ */
function SpreadBackground({ left, right, spreadIdx, onPhotoClick }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>

      {/* LEFT PAGE */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, width: PAGE_W, height: '100%',
        overflow: 'hidden',
        background: 'linear-gradient(270deg, #a8a39a 0%, #cdc8bf 1%, #e5e0d6 3%, var(--paper) 100%)',
        borderRadius: '5px 0 0 5px',
        boxShadow: 'inset -12px 0 20px -5px rgba(0,0,0,0.04)',
      }}>
        {/* Gutter shadow */}
        <div style={{
          position: 'absolute', right: 0, top: 0, width: 52, height: '100%',
          background: 'linear-gradient(270deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.04) 60%, transparent 100%)',
          pointerEvents: 'none', zIndex: 2,
        }} />
        {left
          ? <PageContent page={left} onPhotoClick={onPhotoClick} />
          : <EmptyPage />
        }
        <div className="page-rule" />
        <span className="page-folio page-folio--left">{spreadIdx * 2 + 1}</span>
      </div>

      {/* CENTRAL SPINE STRIP */}
      <div style={{
        position: 'absolute',
        top: 0, left: PAGE_W, width: SPINE_W, height: '100%',
        background: 'linear-gradient(to right, #6e6555 0%, #9b9382 14%, #cdc4b0 50%, #9b9382 86%, #6e6555 100%)',
        boxShadow: 'inset 5px 0 9px rgba(15,10,4,0.30), inset -5px 0 9px rgba(15,10,4,0.30)',
        zIndex: 3, pointerEvents: 'none',
      }} />

      {/* RIGHT PAGE */}
      <div style={{
        position: 'absolute',
        top: 0, left: PAGE_W + SPINE_W, width: PAGE_W, height: '100%',
        overflow: 'hidden',
        background: 'linear-gradient(90deg, #a8a39a 0%, #cdc8bf 1%, #e5e0d6 3%, var(--paper) 100%)',
        borderRadius: '0 5px 5px 0',
        boxShadow: 'inset 12px 0 20px -5px rgba(0,0,0,0.04)',
      }}>
        {/* Gutter shadow */}
        <div style={{
          position: 'absolute', left: 0, top: 0, width: 52, height: '100%',
          background: 'linear-gradient(90deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.04) 60%, transparent 100%)',
          pointerEvents: 'none', zIndex: 2,
        }} />
        {right
          ? <PageContent page={right} onPhotoClick={onPhotoClick} />
          : <EmptyPage />
        }
        <div className="page-rule" />
        <span className="page-folio page-folio--right">{spreadIdx * 2 + 2}</span>
      </div>

    </div>
  );
}

/* ══════════════════════════════════════════════
   5.  FLIP LEAF
   
   One PAGE_W-wide div that rotates 0→-180 (fwd) or 180→0 (bwd).
   Positioned over its starting page half.
   Front face: the page being turned.
   Back face:  the page being revealed (rotateY 180deg).
══════════════════════════════════════════════ */
function FlipLeaf({ dir, frontPage, backPage, flipMV, creaseHighlight, selfShadowFront, selfShadowBack, castOpacity }) {
  const leafLeft = dir === 'fwd' ? PAGE_W + SPINE_W : 0;
  const origin   = dir === 'fwd' ? 'left center'    : 'right center';

  const creaseBg = useTransform(creaseHighlight, v =>
    `linear-gradient(90deg,
      transparent 0%,
      rgba(255,255,255,${(v*.6).toFixed(3)}) calc(50% - 18px),
      rgba(245,240,228,${(v*.85).toFixed(3)}) 50%,
      rgba(210,204,190,${(v*.45).toFixed(3)}) calc(50% + 18px),
      transparent calc(50% + 40px))`
  );
  const frontShadow = useTransform(selfShadowFront, v =>
    `linear-gradient(270deg, rgba(12,8,2,${(v*.72).toFixed(3)}) 0%, transparent 45%)`
  );
  const backShadow = useTransform(selfShadowBack, v =>
    `linear-gradient(90deg, rgba(12,8,2,${(v*.58).toFixed(3)}) 0%, transparent 50%)`
  );

  // Cast shadow on opposite static page
  const castGrad = dir === 'fwd'
    ? 'linear-gradient(90deg, rgba(14,9,2,0.34) 0%, rgba(14,9,2,0.13) 40%, transparent 100%)'
    : 'linear-gradient(270deg, rgba(14,9,2,0.34) 0%, rgba(14,9,2,0.13) 40%, transparent 100%)';
  const castLeft = dir === 'fwd' ? 0 : 'auto';
  const castRight = dir === 'fwd' ? 'auto' : 0;
  const castWidth = useTransform(flipMV, v => `${Math.abs(v) / 180 * 50}%`);

  /* Ambient "lift" shadow — a soft pool of shadow that travels with the
     turning leaf: it grows as the page rises off the spread (mid-flip)
     and fades again as the page settles onto the opposite side. This is
     a plain 2D layer (no preserve-3d), so blur/scale render reliably. */
  const liftStart = dir === 'fwd' ? PAGE_W + SPINE_W : 0;
  const liftEnd   = dir === 'fwd' ? 0 : PAGE_W + SPINE_W;
  const liftLeft = useTransform(flipMV, v => {
    const t = Math.min(Math.abs(v) / 180, 1);
    return `${liftStart + (liftEnd - liftStart) * t}px`;
  });
  const liftProgress = useTransform(flipMV, v => Math.sin((Math.abs(v) / 180) * Math.PI));
  const liftOpacity  = useTransform(liftProgress, [0, .5, 1], [0, .55, 0]);
  const liftScaleX   = useTransform(liftProgress, [0, 1], [0.65, 1.05]);

  return (
    <>
      {/* Ambient lift shadow — the page appears to rise off the spread */}
      <motion.div style={{
        position: 'absolute',
        top: '3%', left: liftLeft,
        width: PAGE_W, height: '94%',
        scaleX: liftScaleX,
        opacity: liftOpacity,
        background: 'radial-gradient(ellipse 65% 60% at center, rgba(15,10,4,0.55) 0%, rgba(15,10,4,0) 72%)',
        filter: 'blur(20px)',
        zIndex: 24, pointerEvents: 'none',
      }} />

      {/* Cast shadow on opposite page */}
      <motion.div style={{
        position: 'absolute', top: 0,
        left: castLeft, right: castRight,
        height: '100%', width: castWidth,
        background: castGrad, opacity: castOpacity,
        filter: 'blur(3px)',
        zIndex: 20, pointerEvents: 'none',
      }} />

      {/* Flipping leaf */}
      <motion.div style={{
        position: 'absolute',
        top: 0, left: leafLeft,
        width: PAGE_W, height: BOOK_H,
        transformStyle: 'preserve-3d',
        transformOrigin: origin,
        rotateY: flipMV,
        zIndex: 25, pointerEvents: 'none', willChange: 'transform',
      }}>
        {/* Front face */}
        <div className="flip-face flip-face--front">
          {frontPage ? <PageContent page={frontPage} /> : <EmptyPage />}
          <div className="page-rule" />
          <motion.div style={{ position:'absolute',inset:0,background:creaseBg,pointerEvents:'none',zIndex:6 }} />
          <motion.div style={{ position:'absolute',inset:0,background:frontShadow,pointerEvents:'none',zIndex:7 }} />
        </div>
        {/* Back face */}
        <div className="flip-face flip-face--back">
          {backPage ? <PageContent page={backPage} /> : <EmptyPage />}
          <div className="page-rule" />
          <motion.div style={{ position:'absolute',inset:0,background:backShadow,pointerEvents:'none',zIndex:6 }} />
        </div>
      </motion.div>
    </>
  );
}

/* ══════════════════════════════════════════════
   6.  PAGE CONTENT
══════════════════════════════════════════════ */
function PageContent({ page, onPhotoClick }) {
  if (!page?.elementos?.length) return <EmptyPage />;
  return (
    <div className="page-content">
      {page.elementos.map((el, i) => {
        if (el.tipo !== 'imagem' || !el.url) return null;
        return (
         <motion.div
  key={el.id ?? i}
  initial="rest"
  whileHover={onPhotoClick ? 'hover' : 'rest'}
  onClick={() => onPhotoClick?.(el)}
  style={{
    position: 'absolute',
    left: el.x ?? 0, top: el.y ?? 0,
    width: el.largura ?? 200,
    overflow: 'visible', borderRadius: 3,
    border: '1px solid rgba(0,0,0,0.06)',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08)',
    cursor: onPhotoClick ? 'pointer' : 'default',
    pointerEvents: 'auto', zIndex: 10,
    display: 'flex', flexDirection: 'column',
  }}
>
            <img
  src={cloudinaryUrl(el.url)}
  alt={el.legenda ?? 'Foto do anuário'}
  style={{ width:'100%', height: el.altura ?? 150, objectFit:'cover', display:'block', backgroundColor:'#f5f5f5', borderRadius: 3 }}
  loading="lazy" draggable={false}
/>
            {onPhotoClick && (
              <motion.div
                variants={{ rest:{ opacity:0 }, hover:{ opacity:1 } }}
                transition={{ duration:0.2 }}
                style={{ position:'absolute',inset:0,background:'rgba(10,7,3,0.35)',display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',zIndex:2 }}
              >
                <motion.svg variants={{ rest:{ scale:0.75 }, hover:{ scale:1 } }}
                  width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                </motion.svg>
              </motion.div>
            )}
            {el.legenda && (
  <figcaption style={{
    background: 'var(--paper)',
    padding: '5px 8px',
    fontSize: 16,
    fontFamily: 'var(--f-display)',
    fontStyle: 'italic',
    color: 'rgba(50,42,24,0.95)',
    textAlign: 'center',
    letterSpacing: '0.04em',
    borderTop: '1px solid rgba(176,141,62,0.15)',
  }}>
    {el.legenda}
  </figcaption>
)}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════
   7.  EMPTY PAGE
══════════════════════════════════════════════ */
function EmptyPage({ isFirst = false }) {
  return (
    <div className="empty-page">
      <div className="empty-page-ornament" />
      {isFirst && <p className="empty-page-text">Nenhuma página adicionada.<br />Acesse o painel para começar.</p>}
      <div className="empty-page-ornament" />
    </div>
  );
}

/* ══════════════════════════════════════════════
   8.  AVATAR
══════════════════════════════════════════════ */
const PALETTES = [
  ['#e8d5b7','#7a5c10'],['#d4e8d5','#1e5c22'],['#d5dde8','#1a3360'],
  ['#e8d5e5','#5c1a4e'],['#e8e4d5','#5c4e1a'],['#d5e8e8','#1a4e4e'],
  ['#ead5d5','#5c1a1a'],['#e5d5e8','#451a5c'],
];
function Avatar({ name, size = 32 }) {
  const safeName = (name && typeof name === 'string' && name.trim()) ? name : 'Visitante';
  const palette  = PALETTES[(safeName.charCodeAt(0) || 0) % PALETTES.length];
  return (
    <div style={{ width:size,height:size,borderRadius:'50%',background:palette[0],color:palette[1],flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.37,fontWeight:600,fontFamily:'var(--f-ui)',userSelect:'none' }}>
      {safeName.split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()).join('')}
    </div>
  );
}

/* ══════════════════════════════════════════════
   9.  COMMENTS HOOK
══════════════════════════════════════════════ */
function useComments(photoId) {
  const [comments,  setComments]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [posting,   setPosting]   = useState(false);
  const [likedMap,  setLikedMap]  = useState({});
  const [guestName, setGuestName] = useState(() => localStorage.getItem('mm_guest_name') || '');

  useEffect(() => {
    if (guestName) return;
    const adj = ['Alegre','Curioso','Animado','Saudoso'];
    const n = adj[Math.floor(Math.random()*adj.length)] + ' ' + Math.floor(Math.random()*900+100);
    localStorage.setItem('mm_guest_name', n);
    Promise.resolve().then(() => setGuestName(n));
  }, [guestName]);

  useEffect(() => {
    if (!photoId) return;
    let active = true;
    const run = async () => {
      try {
        const r = await fetch(`${API_URL}/api/comentarios/${encodeURIComponent(photoId)}`);
        const j = await r.json();
        if (active && j.success) setComments(j.data ?? []);
      } catch { /* graceful */ } finally { if (active) setLoading(false); }
    };
    run();
    return () => { active = false; };
  }, [photoId]);

  const post = useCallback(async (texto) => {
    if (!texto.trim() || posting) return false;
    setPosting(true);
    try {
      const r = await fetch(`${API_URL}/api/comentarios`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ photoId, autor:guestName, texto:texto.trim() }),
      });
      const j = await r.json();
      if (j.success) { setComments(p=>[...p,j.data]); return true; }
    } catch { /* graceful */ } finally { setPosting(false); }
    return false;
  }, [photoId, guestName, posting]);

  const toggleLike = useCallback(async (cid) => {
    const had = !!likedMap[cid];
    setLikedMap(m=>({...m,[cid]:!had}));
    setComments(p=>p.map(c=>c._id===cid?{...c,likes:(c.likes??0)+(had?-1:1)}:c));
    try {
      await fetch(`${API_URL}/api/comentarios/${cid}/like`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({unlike:had})});
    } catch {
      setLikedMap(m=>({...m,[cid]:had}));
      setComments(p=>p.map(c=>c._id===cid?{...c,likes:(c.likes??0)+(had?1:-1)}:c));
    }
  }, [likedMap]);

  return { comments, loading, posting, guestName, post, toggleLike, likedMap };
}

/* ══════════════════════════════════════════════
   10. TIME HELPER
══════════════════════════════════════════════ */
function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if (s<60) return 'agora';
  const m=Math.floor(s/60); if(m<60) return `${m}m`;
  const h=Math.floor(m/60); if(h<24) return `${h}h`;
  const dy=Math.floor(h/24); if(dy<7) return `${dy}d`;
  return new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
}

/* ══════════════════════════════════════════════
   11. COMMENT ROW
══════════════════════════════════════════════ */
function CommentRow({ c, liked, onLike }) {
  const [hover,setHover] = useState(false);
  return (
    <div style={{display:'flex',gap:10,padding:'13px 0',borderBottom:'1px solid var(--surface-2)'}}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <Avatar name={c.autor} size={32}/>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:13,lineHeight:1.5,color:'var(--ink)',margin:0}}>
          <strong style={{fontWeight:600,marginRight:5}}>{c.autor||'Visitante'}</strong>{c.texto}
        </p>
        <div style={{display:'flex',gap:12,marginTop:5}}>
          <span style={{fontSize:11,color:'var(--ink-25)'}}>{timeAgo(c.criadoEm)}</span>
          {c.likes>0&&<span style={{fontSize:11,color:'var(--ink-25)'}}>{c.likes} curtida{c.likes!==1?'s':''}</span>}
        </div>
      </div>
      <button onClick={()=>onLike(c._id)} style={{background:'none',border:'none',cursor:'pointer',padding:'2px 4px',color:liked?'#e05a6a':(hover?'var(--ink-50)':'transparent'),transition:'color 0.18s,transform 0.18s',transform:liked?'scale(1.18)':'scale(1)',flexShrink:0,alignSelf:'flex-start',marginTop:2}} aria-label={liked?'Descurtir':'Curtir'}>
        <IcoHeart filled={liked}/>
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════
   12. PHOTO MODAL
══════════════════════════════════════════════ */
function PhotoModal({ photo: initialPhoto, allPhotos, onClose }) {
  const [cur,setCur]               = useState(initialPhoto);
  const [imgLoaded,setImgLoaded]   = useState(false);
  const [commentText,setCommentText] = useState('');
  const inputRef=useRef(null); const listRef=useRef(null);

  const { comments, loading, posting, guestName, post, toggleLike, likedMap } = useComments(cur?.id??cur?.url);
  const curIdx  = useMemo(()=>allPhotos.findIndex(p=>(p.id??p.url)===(cur?.id??cur?.url)),[allPhotos,cur]);
  const hasPrev = curIdx>0; const hasNext = curIdx<allPhotos.length-1;

  const goTo = useCallback((idx)=>{
    if(idx<0||idx>=allPhotos.length)return;
    setImgLoaded(false);setCur(allPhotos[idx]);setCommentText('');
  },[allPhotos]);

  useEffect(()=>{
    const h=(e)=>{if(e.key==='Escape')onClose();if(e.key==='ArrowLeft')goTo(curIdx-1);if(e.key==='ArrowRight')goTo(curIdx+1);};
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[curIdx,goTo,onClose]);

  useEffect(()=>{ if(listRef.current)listRef.current.scrollTop=listRef.current.scrollHeight; },[comments.length]);
  useEffect(()=>{ document.body.style.overflow='hidden';return()=>{document.body.style.overflow='';};  },[]);

  const handlePost = async()=>{ const ok=await post(commentText);if(ok)setCommentText(''); };

  const [isMobile,setIsMobile] = useState(()=>window.innerWidth<640);
  useEffect(()=>{ const c=()=>setIsMobile(window.innerWidth<640);window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c); },[]);
  const [showComments,setShowComments] = useState(true);

  if(!cur?.url)return null;

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
      onClick={onClose}
      style={{position:'fixed',inset:0,zIndex:9000,background:'rgba(8,5,2,0.93)',display:'flex',alignItems:'center',justifyContent:'center',padding:isMobile?0:20}}>
      <motion.div initial={{opacity:0,scale:0.97,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.97,y:16}}
        transition={{duration:0.3,ease:[0.16,1,0.3,1]}} onClick={e=>e.stopPropagation()}
        style={{display:'flex',flexDirection:isMobile?'column':'row',width:isMobile?'100vw':'min(200vw,1080px)',height:isMobile?'100dvh':'min(200vh,700px)',borderRadius:isMobile?0:14,overflow:'hidden',background:'var(--white)',boxShadow:'0 48px 120px rgba(0,0,0,0.6),0 12px 32px rgba(0,0,0,0.35)'}}>

        {/* Photo */}
        <div style={{flex:isMobile?(showComments?'0 0 52%':'1 1 auto'):'1 1 58%',minWidth:0,background:'#0d0a06',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:`url(${cur.url})`,backgroundSize:'cover',backgroundPosition:'center',filter:'blur(28px) brightness(0.28) saturate(0.8)',transform:'scale(1.12)'}}/>
          <motion.img key={cur.url} src={cur.url} alt={cur.legenda||'Foto'} initial={{opacity:0}} animate={{opacity:imgLoaded?1:0}} transition={{duration:0.38}} onLoad={()=>setImgLoaded(true)}
            style={{position:'relative',zIndex:1,maxWidth:'92%',maxHeight:'88%',objectFit:'contain',borderRadius:4,userSelect:'none',pointerEvents:'none'}} draggable={false}/>
          {cur.legenda&&<div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:2,background:'linear-gradient(transparent,rgba(0,0,0,0.75))',padding:'36px 24px 18px'}}><p style={{fontFamily:'var(--f-display)',fontStyle:'italic',fontSize:20,color:'rgba(255,255,255,0.8)',letterSpacing:'0.035em',textAlign:'center',margin:0}}>{cur.legenda}</p></div>}
          {hasPrev&&<button onClick={()=>goTo(curIdx-1)} style={{position:'absolute',top:'50%',left:14,transform:'translateY(-50%)',zIndex:3,width:42,height:42,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',backdropFilter:'blur(8px)'}}><IcoNavLeft/></button>}
          {hasNext&&<button onClick={()=>goTo(curIdx+1)} style={{position:'absolute',top:'50%',right:14,transform:'translateY(-50%)',zIndex:3,width:42,height:42,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',backdropFilter:'blur(8px)'}}><IcoNavRight/></button>}
        </div>

        {/* Comments */}
        {(!isMobile||showComments)&&(
          <div style={{flex:isMobile?'1 1 auto':'1 1 42%',minWidth:0,display:'flex',flexDirection:'column',background:'var(--surface-0)',borderTop:isMobile?'1px solid var(--surface-2)':'none'}}>
            <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'1px solid var(--surface-2)',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontFamily:'var(--f-display)',fontSize:17,fontWeight:500,fontStyle:'italic',color:'var(--ink)'}}>Comentários</span>
                <span style={{fontSize:11,fontWeight:600,color:'var(--ink-50)',background:'var(--surface-2)',padding:'2px 8px',borderRadius:10}}>{comments.length}</span>
              </div>
              <button onClick={isMobile?()=>setShowComments(false):onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink-50)',padding:4}}><IcoClose/></button>
            </header>
            <div ref={listRef} className="photo-comment-list" style={{flex:1,overflowY:'auto',padding:'0 18px',display:'flex',flexDirection:'column'}}>
              {loading
                ?<div style={{margin:'auto',color:'var(--ink-25)'}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{animation:'lbSpin 1s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></div>
                :comments.length===0
                  ?<div style={{margin:'auto',textAlign:'center',color:'var(--ink-25)',maxWidth:200}}><IcoHeart filled={false}/><p style={{marginTop:12,fontSize:13,lineHeight:1.5}}>Seja o primeiro a deixar uma memória nesta foto.</p></div>
                  :comments.map(c=><CommentRow key={c._id} c={c} liked={likedMap[c._id]} onLike={toggleLike}/>)
              }
            </div>
            <div style={{padding:'14px 18px',borderTop:'1px solid var(--surface-2)',background:'var(--white)',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <Avatar name={guestName} size={30}/>
                <input ref={inputRef} value={commentText} onChange={e=>setCommentText(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&handlePost()} placeholder="Adicione um comentário…" disabled={posting}
                  style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:13,color:'var(--ink)',fontFamily:'var(--f-ui)',padding:'8px 0'}}/>
                <button onClick={handlePost} disabled={posting||!commentText.trim()}
                  style={{background:'none',border:'none',cursor:'pointer',padding:4,color:commentText.trim()?'var(--gold)':'var(--ink-10)',transition:'color 0.15s',display:'flex',alignItems:'center'}} aria-label="Publicar">
                  <IcoSend/>
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
      {!isMobile&&<motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.8}}
        style={{position:'fixed',bottom:18,left:'50%',transform:'translateX(-50%)',fontSize:10,color:'rgba(255,255,255,0.22)',letterSpacing:'0.12em',textTransform:'uppercase',pointerEvents:'none',zIndex:9001,whiteSpace:'nowrap'}}>
        esc · fechar — ← → · navegar
      </motion.p>}
      <style>{`@keyframes lbSpin{to{transform:rotate(360deg);}}`}</style>
    </motion.div>
  );
}