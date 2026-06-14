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

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://memoary.onrender.com';

gsap.registerPlugin(ScrollTrigger);

const BOOK_W      = 430;
const BOOK_H      = 672;
const SPINE_W     = 22;
const FORE_EDGE_W = 7;
const PERSP       = 2600;

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
const IcoClose = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4 4l10 10M14 4L4 14"/>
  </svg>
);
const IcoSend = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 7.5 2 2l2.5 5.5L2 13l11-5.5z"/>
  </svg>
);
const IcoHeart = ({ filled }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 13.5S1.5 9.5 1.5 5.5A3.5 3.5 0 0 1 8 3.2 3.5 3.5 0 0 1 14.5 5.5C14.5 9.5 8 13.5 8 13.5z"/>
  </svg>
);
const IcoNavLeft = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 4 7 10l6 6"/>
  </svg>
);
const IcoNavRight = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4l6 6-6 6"/>
  </svg>
);

function cloudinaryUrl(src, opts = {}) {
  if (!src) return src;
  if (/^https?:\/\/res\.cloudinary\.com\//.test(src)) return src;
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
  if (!cloud) return src;
  const transform = opts.transform || 'f_auto,q_auto,w_1200';
  return `https://res.cloudinary.com/${cloud}/image/fetch/${transform}/${encodeURIComponent(src)}`;
}

/* ══════════════════════════════════════════════
   1. ROOT
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
           console.log(j.data);
          if (data.length % 2 === 1) {
            data = [...data, { _id: 'spacer-' + Date.now(), elementos: [], tipoLayout: 'grid' }];
          }
          setAnuarioData(data);
        }
      } catch (e) { console.error(e); }
    };
    Promise.resolve().then(() => { if (active) load(); });
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
   2. BOOK VIEWER
══════════════════════════════════════════════ */
function BookViewer({ onLoginClick, pages }) {
  const containerRef  = useRef(null);
  const bookSceneRef  = useRef(null);
  const bookOuterRef  = useRef(null);
  const coverRef      = useRef(null);
  const navRef        = useRef(null);
  const headerRef     = useRef(null);
  const heroRef       = useRef(null);
  const scrollCueRef  = useRef(null);

  const [bookIsOpen, setBookIsOpen] = useState(false);
  const [spreadIdx,  setSpreadIdx]  = useState(-1);
  const [flipState,  setFlipState]  = useState(null);
  const [photoModal, setPhotoModal] = useState(null);
  useEffect(() => {
  setSpreadIdx(-1);
  setFlipState(null);
}, [pages]);

  const [bookScale, setBookScale] = useState(1);
  useEffect(() => {
    const updateScale = () => {
      const isMobile = window.innerWidth <= 899;
      const availW = isMobile
        ? window.innerWidth * 0.88
        : window.innerWidth * 0.54;
      const availH = window.innerHeight * (isMobile ? 0.58 : 0.78);
      const scaleW = availW / BOOK_W;
      const scaleH = availH / BOOK_H;
      setBookScale(Math.min(scaleW, scaleH, 1));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const leftPages = pages.filter(p => p.lado === 'esquerda');
const rightPages = pages.filter(p => p.lado === 'direita');

const totalSpreads = Math.max(leftPages.length, rightPages.length);
const maxSpreadIdx = totalSpreads - 1;
  

const spreads = useMemo(() => {
  const leftPages = pages.filter(p => p.lado === 'esquerda');
  const rightPages = pages.filter(p => p.lado === 'direita');

  const max = Math.max(leftPages.length, rightPages.length);

  return Array.from({ length: max }, (_, i) => ({
    left: leftPages[i] ?? null,
    right: rightPages[i] ?? null
  }));
}, [pages]);

const getSpread = useCallback((idx) => {
  const leftPages = pages.filter(p => p.lado === 'esquerda');
  const rightPages = pages.filter(p => p.lado === 'direita');

  if (idx < 0) {
    return {
      left: null,
      right: rightPages[0] ?? null
    };
  }

  return {
    left: leftPages[idx] ?? null,
    right: rightPages[idx] ?? null
  };
}, [pages]);
  const curSpread  = getSpread(spreadIdx);
  const isFlipping = flipState !== null;

  const allPhotos = useMemo(() =>
    pages.flatMap(pg =>
      (pg.elementos ?? [])
        .filter(el => el.tipo === 'imagem' && el.url)
        .map(el => ({
          id: el.id ?? el.url,
          url: cloudinaryUrl(el.url),
          originalUrl: el.url,
          legenda: el.legenda ?? '',
        }))
    )
  , [pages]);

  const openPhoto = useCallback((el) => {
    setPhotoModal({
      photo: { id: el.id ?? el.url, url: cloudinaryUrl(el.url), legenda: el.legenda ?? '' },
      allPhotos,
    });
  }, [allPhotos]);

  const flipMV          = useMotionValue(0);
  const foldProgress    = useTransform(flipMV, v => Math.sin((Math.abs(v)/180)*Math.PI));
  const creaseHighlight = useTransform(foldProgress, [0,.5,1], [0,.42,0]);
  const selfShadowFront = useTransform(foldProgress, [0,.65,1], [0,.38,.08]);
  const selfShadowBack  = useTransform(foldProgress, [0,.4,1],  [.35,.12,0]);
  const castOpacity     = useTransform(foldProgress, [0,.3,.7,1], [0,.5,.5,0]);
  const castWidth       = useTransform(foldProgress, [0,1], ['0%','60%']);
  const leafRY          = flipMV;

  const flipForward = useCallback(() => {
    if (isFlipping || !bookIsOpen || spreadIdx >= maxSpreadIdx) return;
    const from = spreadIdx, to = spreadIdx + 1;
    setFlipState({ dir:'fwd', fromSpread:from, toSpread:to });
    flipMV.set(0);
    animate(flipMV, -180, {
      duration: 0.78,
      ease: [0.4, 0.0, 0.2, 1.0],
      onComplete: () => { setSpreadIdx(to); flipMV.set(0); setFlipState(null); },
    });
  }, [isFlipping, bookIsOpen, spreadIdx, maxSpreadIdx, flipMV]);

  const flipBackward = useCallback(() => {
    if (isFlipping || !bookIsOpen || spreadIdx < 0) return;
    const from = spreadIdx, to = spreadIdx - 1;
    setFlipState({ dir:'bwd', fromSpread:from, toSpread:to });
    flipMV.set(0);
    animate(flipMV, 180, {
      duration: 0.78,
      ease: [0.4, 0.0, 0.2, 1.0],
      onComplete: () => { setSpreadIdx(to); flipMV.set(0); setFlipState(null); },
    });
  }, [isFlipping, bookIsOpen, spreadIdx, flipMV]);

  const flipVisible = useMemo(() => {
    if (!flipState) return null;
    const { dir, fromSpread, toSpread } = flipState;
    const from = getSpread(fromSpread);
    const to   = getSpread(toSpread);
    return {
      bgLeft:    to.left,
      bgRight:   to.right,
      leafFront: dir === 'fwd' ? from.right : from.left,
      leafBack:  dir === 'fwd' ? to.left    : to.right,
      dir,
    };
  }, [flipState, getSpread]);

  useGSAP(() => {
    let mm = gsap.matchMedia();

    const onUpdateShared = (self) => {
      const opened = self.progress > 0.62;
      setBookIsOpen(p => p === opened ? p : opened);
      scrollCueRef.current?.classList.toggle('is-hidden', self.progress > 0.04);
      headerRef.current?.classList.toggle('is-visible', self.progress > 0.32);
      if (bookOuterRef.current) {
        bookOuterRef.current.style.boxShadow = opened
          ? '-35px 35px 65px rgba(15, 10, 5, 0.45)'
          : '-15px 15px 35px rgba(15, 10, 5, 0.35)';
      }
    };

    mm.add("(min-width: 900px)", () => {
      gsap.set(bookSceneRef.current, { xPercent:-50, yPercent:-50, left:'72%', top:'48%', rotationY:-20, rotationZ:-5, scale:0.78 });
      if (navRef.current)    gsap.set(navRef.current,    { y:0 });
      if (headerRef.current) gsap.set(headerRef.current, { y:0, opacity:1 });
      const tl = gsap.timeline({
        scrollTrigger: { trigger:'.viewport-hero', start:'top top', end:'+=3000', scrub:1.5, pin:true, onUpdate:onUpdateShared },
      });
      tl.to(heroRef.current,      { opacity:0, x:-90, duration:0.4, ease:'power2.in' }, 0);
      tl.to(bookSceneRef.current, { left:'60%', xPercent:-50, top:'50%', rotationY:0, rotationZ:0, scale:1, duration:1, ease:'expo.inOut' }, 0.08);
      if (navRef.current)    tl.to(navRef.current,    { y:-24,  duration:1.1, ease:'expo.inOut' }, 0.08);
      if (headerRef.current) tl.to(headerRef.current, { y:-120, opacity:0, duration:1.1, ease:'expo.inOut' }, 0.08);
      tl.add(() => { coverRef.current?.classList.add('is-open'); }, 0.63);
    });

    mm.add("(max-width: 899px)", () => {
      gsap.set(bookSceneRef.current, { xPercent:-50, yPercent:-50, left:'50%', top:'55%', rotationY:-15, rotationZ:-3, scale:0.85 });
      gsap.set(navRef.current,    { y:0 });
      gsap.set(headerRef.current, { y:0, opacity:1 });
      const tl = gsap.timeline({
        scrollTrigger: { trigger:'.viewport-hero', start:'top top', end:'+=2500', scrub:1.5, pin:true, onUpdate:onUpdateShared },
      });
      tl.to(heroRef.current,      { opacity:0, y:-50, duration:0.4, ease:'power2.in' }, 0);
      tl.to(bookSceneRef.current, { left:'50%', xPercent:-50, top:'50%', rotationY:0, rotationZ:0, scale:1, duration:1, ease:'expo.inOut' }, 0.08);
      if (navRef.current)    tl.to(navRef.current,    { y:-18,  duration:1.1, ease:'expo.inOut' }, 0.08);
      if (headerRef.current) tl.to(headerRef.current, { y:-120, opacity:0, duration:1.1, ease:'expo.inOut' }, 0.08);
      tl.add(() => { coverRef.current?.classList.add('is-open'); }, 0.63);
    });
  }, { scope: containerRef, dependencies: [] });

  const counterLabel = useMemo(() => {
    if (spreadIdx < 0) return 'Capa';
    const lo = spreadIdx * 2 + 1;
    const hi = Math.min(spreadIdx * 2 + 2, pages.length);
    return `${lo}${lo !== hi ? `–${hi}` : ''} / ${pages.length}`;
  }, [spreadIdx, pages.length]);

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
          <h1 className="hero-headline">
            Guarde suas<br /><em>memórias</em><br />para sempre
          </h1>
          <img src={logoSvg} alt="Memoary" className="hero-logo-lock" />
        </div>

        <div ref={scrollCueRef} className="scroll-cue">
          <div className="scroll-cue-track" />
          <span className="scroll-cue-label">Role para explorar</span>
        </div>

        <div ref={bookSceneRef} className="book-scene" style={{ perspective: PERSP }}>
          <div style={{
            transform: `scale(${bookScale})`,
            transformOrigin: 'center center',
            display: 'inline-block',
            transformStyle: 'preserve-3d',
          }}>
            <div ref={bookOuterRef} className="book-outer"
              style={{
                width: BOOK_W, height: BOOK_H,
                transformStyle: 'preserve-3d', position: 'relative',
                boxShadow: '-10px 10px 20px rgba(20,14,5,0.2)',
                transition: 'box-shadow 0.6s ease',
              }}>

              <div className="book-spine"     style={{ width:SPINE_W, height:BOOK_H, left:0 }} />
              <div className="book-top"       style={{ width:BOOK_W,  height:SPINE_W, top:-SPINE_W+2 }} />
              <div className="book-fore-edge" style={{ left:BOOK_W, width:FORE_EDGE_W }} />

              <StaticSpread
                left={flipVisible ? flipVisible.bgLeft  : curSpread.left}
                right={flipVisible ? flipVisible.bgRight : curSpread.right}
                spreadIdx={flipState ? flipState.toSpread : spreadIdx}
                zIndex={2}
                onPhotoClick={!flipState ? openPhoto : undefined}
              />

              {flipState && flipVisible && (
                <FlipLeaf
                  dir={flipVisible.dir}
                  frontPage={flipVisible.leafFront}
                  backPage={flipVisible.leafBack}
                  leafRY={leafRY}
                  creaseHighlight={creaseHighlight}
                  selfShadowFront={selfShadowFront}
                  selfShadowBack={selfShadowBack}
                  castOpacity={castOpacity}
                  castWidth={castWidth}
                  width={BOOK_W}
                  height={BOOK_H}
                />
              )}

              <div ref={coverRef} className="book-cover"
                style={{ transformStyle:'preserve-3d', pointerEvents: bookIsOpen ? 'none' : 'auto' }}>
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

              {bookIsOpen && (
                <nav ref={navRef} className="book-nav" style={{ bottom: -(BOOK_H * 0.12) }}>
                  <button className="nav-btn" onClick={flipBackward}
                    disabled={isFlipping || spreadIdx < 0}>
                    <ChevronLeft /><span>Anterior</span>
                  </button>
                  <span className="nav-counter">{counterLabel}</span>
                  <button className="nav-btn" onClick={flipForward}
                    disabled={isFlipping || spreadIdx >= maxSpreadIdx}>
                    <span>Próxima</span><ChevronRight />
                  </button>
                </nav>
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
   3. STATIC SPREAD
══════════════════════════════════════════════ */
function StaticSpread({ left, right, spreadIdx, zIndex=1, onPhotoClick }) {
  const isFirst = spreadIdx < 0;
  return (
    <>
      {spreadIdx >= 0 && (
        <div className="static-page" style={{ zIndex }}>
          <div className="page-face page-face--left">
            {left ? <PageContent page={left} onPhotoClick={onPhotoClick} /> : <EmptyPage />}
            <div className="page-rule" />
            <span className="page-folio page-folio--left">{spreadIdx*2+1}</span>
          </div>
        </div>
      )}
      <div className="static-page" style={{ zIndex }}>
        <div className="page-face page-face--right">
          {right ? <PageContent page={right} onPhotoClick={onPhotoClick} /> : <EmptyPage isFirst={isFirst} />}
          <div className="page-rule" />
          {spreadIdx >= 0 && <span className="page-folio page-folio--right">{spreadIdx*2+2}</span>}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════
   4. FLIP LEAF
══════════════════════════════════════════════ */
function FlipLeaf({
  dir, frontPage, backPage,
  leafRY, creaseHighlight, selfShadowFront, selfShadowBack,
  castOpacity, castWidth, width, height,
}) {
  const creaseBg = useTransform(creaseHighlight, v =>
    `linear-gradient(90deg,
      transparent 0%,
      rgba(255,255,255,${(v*.55).toFixed(3)}) calc(50% - 18px),
      rgba(245,240,228,${(v*.75).toFixed(3)}) 50%,
      rgba(210,204,190,${(v*.4).toFixed(3)}) calc(50% + 18px),
      transparent calc(50% + 40px))`
  );
  const selfFrontBg = useTransform(selfShadowFront, v =>
    `linear-gradient(270deg, rgba(12,8,2,${(v*.65).toFixed(3)}) 0%, transparent 45%)`
  );
  const selfBackBg = useTransform(selfShadowBack, v =>
    `linear-gradient(90deg, rgba(12,8,2,${(v*.5).toFixed(3)}) 0%, transparent 50%)`
  );
  const castGrad = dir === 'fwd'
    ? 'linear-gradient(90deg, rgba(14,9,2,0.32) 0%, rgba(14,9,2,0.12) 40%, transparent 100%)'
    : 'linear-gradient(270deg, rgba(14,9,2,0.32) 0%, rgba(14,9,2,0.12) 40%, transparent 100%)';
  const castPos = dir === 'fwd' ? { left:0, right:'auto' } : { right:0, left:'auto' };

  return (
    <>
      <motion.div style={{
        position:'absolute', top:0, height:'100%',
        width:castWidth, background:castGrad,
        opacity:castOpacity, zIndex:20, pointerEvents:'none', ...castPos,
      }} />
      <motion.div style={{
        position:'absolute', top:0, left:0, width, height,
        transformStyle:'preserve-3d', transformOrigin:'left center',
        rotateY:leafRY, zIndex:25, pointerEvents:'none', willChange:'transform',
      }}>
        <div className="flip-face flip-face--front">
          {frontPage ? <PageContent page={frontPage} /> : <EmptyPage />}
          <div className="page-rule" />
          <motion.div style={{ position:'absolute',inset:0,background:creaseBg,pointerEvents:'none',zIndex:6 }} />
          <motion.div style={{ position:'absolute',inset:0,background:selfFrontBg,pointerEvents:'none',zIndex:7 }} />
          <motion.div style={{
            position:'absolute',inset:0,pointerEvents:'none',zIndex:5,
            background:'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 60%, rgba(20,14,5,0.06) 100%)',
            opacity:useTransform(creaseHighlight,[0,.5,1],[0,1,0]),
          }} />
        </div>
        <div className="flip-face flip-face--back">
          {backPage ? <PageContent page={backPage} /> : <EmptyPage />}
          <div className="page-rule" />
          <motion.div style={{ position:'absolute',inset:0,background:selfBackBg,pointerEvents:'none',zIndex:6 }} />
        </div>
      </motion.div>
    </>
  );
}

/* ══════════════════════════════════════════════
   5. PAGE CONTENT
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
              position:'absolute', left: el.x ?? 0, top: el.y ?? 0,
              width: el.largura ?? 200, height: el.altura ?? 150,
              overflow:'hidden', borderRadius:3,
              border:'1px solid rgba(0,0,0,0.06)',
              boxShadow:'0 4px 15px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08)',
              cursor: onPhotoClick ? 'pointer' : 'default',
              pointerEvents:'auto', zIndex:10,
            }}
          >
            <img
              src={cloudinaryUrl(el.url)}
              alt={el.legenda ?? 'Foto do anuário'}
              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', backgroundColor:'#f5f5f5' }}
              loading="lazy" draggable={false}
            />
            {onPhotoClick && (
              <motion.div
                variants={{ rest:{ opacity:0 }, hover:{ opacity:1 } }}
                transition={{ duration:0.2 }}
                style={{ position:'absolute', inset:0, background:'rgba(10,7,3,0.35)', display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', zIndex:2 }}
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
                position:'absolute', bottom:0, left:0, right:0,
                background:'rgba(253,249,244,0.96)', backdropFilter:'blur(8px)',
                padding:'6px 10px', fontSize:15,
                fontFamily:'var(--f-display)', fontStyle:'italic',
                letterSpacing:'0.04em', color:'#222', fontWeight:500,
                textAlign:'center', zIndex:3,
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
   6. EMPTY PAGE
══════════════════════════════════════════════ */
function EmptyPage({ isFirst = false }) {
  return (
    <div className="empty-page">
      <div className="empty-page-ornament" />
      {isFirst && (
        <p className="empty-page-text">
          Nenhuma página adicionada.<br />Acesse o painel para começar.
        </p>
      )}
      <div className="empty-page-ornament" />
    </div>
  );
}

/* ══════════════════════════════════════════════
   7. AVATAR
══════════════════════════════════════════════ */
const PALETTES = [
  ['#e8d5b7','#7a5c10'],['#d4e8d5','#1e5c22'],['#d5dde8','#1a3360'],
  ['#e8d5e5','#5c1a4e'],['#e8e4d5','#5c4e1a'],['#d5e8e8','#1a4e4e'],
  ['#ead5d5','#5c1a1a'],['#e5d5e8','#451a5c'],
];
function Avatar({ name, size = 32 }) {
  const safeName = (name && typeof name === 'string' && name.trim() !== '') ? name : 'Visitante';
  const charCode = safeName.charCodeAt(0) || 0;
  const idx = isNaN(charCode) ? 0 : (charCode % PALETTES.length);
  const palette = PALETTES[idx] || PALETTES[0];
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', background:palette[0], color:palette[1],
      flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.37, fontWeight:600, fontFamily:'var(--f-ui)', userSelect:'none',
    }}>
      {safeName.split(' ').slice(0,2).map(w => w[0]?.toUpperCase()).join('')}
    </div>
  );
}

/* ══════════════════════════════════════════════
   8. COMMENTS HOOK
══════════════════════════════════════════════ */
function useComments(photoId) {
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [posting,  setPosting]  = useState(false);
  const [likedMap, setLikedMap] = useState({});
  const [guestName, setGuestName] = useState(() => localStorage.getItem('mm_guest_name') || '');

  useEffect(() => {
    if (guestName) return;
    const k = 'mm_guest_name';
    const adj = ['Alegre','Curioso','Animado','Saudoso'];
    const n = adj[Math.floor(Math.random()*adj.length)] + ' ' + Math.floor(Math.random()*900+100);
    localStorage.setItem(k, n);
    Promise.resolve().then(() => setGuestName(n));
  }, [guestName]);

  useEffect(() => {
    if (!photoId) return;
    let active = true;
    const loadComments = async () => {
      try {
        const r = await fetch(`${API_URL}/api/comentarios/${encodeURIComponent(photoId)}`);
        const j = await r.json();
        if (!active) return;
        if (j.success) setComments(j.data ?? []);
      } catch { /* graceful */ }
      finally { if (active) setLoading(false); }
    };
    Promise.resolve().then(() => { if (!active) return; setLoading(true); loadComments(); });
    return () => { active = false; };
  }, [photoId]);

  const post = useCallback(async (texto) => {
    if (!texto.trim() || posting) return false;
    setPosting(true);
    try {
      const r = await fetch(`${API_URL}/api/comentarios`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ photoId, autor:guestName, texto:texto.trim() }),
      });
      const j = await r.json();
      if (j.success) { setComments(p => [...p, j.data]); return true; }
    } catch { /* ignore */ }
    finally { setPosting(false); }
    return false;
  }, [photoId, guestName, posting]);

  const toggleLike = useCallback(async (cid) => {
    const had = !!likedMap[cid];
    setLikedMap(m => ({ ...m, [cid]:!had }));
    setComments(p => p.map(c => c._id===cid ? { ...c, likes:(c.likes??0)+(had?-1:1) } : c));
    try {
      await fetch(`${API_URL}/api/comentarios/${cid}/like`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ unlike:had }),
      });
    } catch {
      setLikedMap(m => ({ ...m, [cid]:had }));
      setComments(p => p.map(c => c._id===cid ? { ...c, likes:(c.likes??0)+(had?1:-1) } : c));
    }
  }, [likedMap]);

  return { comments, loading, posting, guestName, post, toggleLike, likedMap };
}

/* ══════════════════════════════════════════════
   9. TIME HELPER
══════════════════════════════════════════════ */
function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'agora';
  const m = Math.floor(s/60); if (m < 60) return `${m}m`;
  const h = Math.floor(m/60); if (h < 24) return `${h}h`;
  const dy = Math.floor(h/24); if (dy < 7) return `${dy}d`;
  return new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
}

/* ══════════════════════════════════════════════
   10. COMMENT ROW
══════════════════════════════════════════════ */
function CommentRow({ c, liked, onLike }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ display:'flex', gap:10, padding:'13px 0', borderBottom:'1px solid var(--surface-2)' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Avatar name={c.autor} size={32} />
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, lineHeight:1.5, color:'var(--ink)', margin:0 }}>
          <strong style={{ fontWeight:600, marginRight:5 }}>{c.autor || 'Visitante'}</strong>
          {c.texto}
        </p>
        <div style={{ display:'flex', gap:12, marginTop:5 }}>
          <span style={{ fontSize:11, color:'var(--ink-25)' }}>{timeAgo(c.criadoEm)}</span>
          {c.likes > 0 && <span style={{ fontSize:11, color:'var(--ink-25)' }}>{c.likes} curtida{c.likes!==1?'s':''}</span>}
        </div>
      </div>
      <button onClick={() => onLike(c._id)} style={{
        background:'none', border:'none', cursor:'pointer', padding:'2px 4px',
        color: liked ? '#e05a6a' : (hover ? 'var(--ink-50)' : 'transparent'),
        transition:'color 0.18s, transform 0.18s',
        transform: liked ? 'scale(1.18)' : 'scale(1)',
        flexShrink:0, alignSelf:'flex-start', marginTop:2,
      }} aria-label={liked?'Descurtir':'Curtir'}>
        <IcoHeart filled={liked} />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════
   11. PHOTO MODAL
══════════════════════════════════════════════ */
function PhotoModal({ photo: initialPhoto, allPhotos, onClose }) {
  const [cur,         setCur]         = useState(initialPhoto);
  const [imgLoaded,   setImgLoaded]   = useState(false);
  const [commentText, setCommentText] = useState('');
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const { comments, loading, posting, guestName, post, toggleLike, likedMap }
    = useComments(cur?.id ?? cur?.url);

  const curIdx = useMemo(() =>
    allPhotos.findIndex(p => (p.id??p.url) === (cur?.id??cur?.url))
  , [allPhotos, cur]);

  const hasPrev = curIdx > 0;
  const hasNext = curIdx < allPhotos.length - 1;

  const goTo = useCallback((idx) => {
    if (idx < 0 || idx >= allPhotos.length) return;
    setImgLoaded(false); setCur(allPhotos[idx]); setCommentText('');
  }, [allPhotos]);

  useEffect(() => {
    const h = (e) => {
      if (e.key==='Escape')     onClose();
      if (e.key==='ArrowLeft')  goTo(curIdx-1);
      if (e.key==='ArrowRight') goTo(curIdx+1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [curIdx, goTo, onClose]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [comments.length]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handlePost = async () => {
    const ok = await post(commentText);
    if (ok) setCommentText('');
  };

  const [isMobileModal, setIsMobileModal] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const check = () => setIsMobileModal(window.innerWidth < 640);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [showCommentsMobile, setShowCommentsMobile] = useState(true);
  if (!cur || !cur.url) return null;

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      transition={{ duration:0.2 }} onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(8,5,2,0.93)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding: isMobileModal ? 0 : 20 }}
    >
      <motion.div
        initial={{ opacity:0, scale:0.97, y:16 }} animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.97, y:16 }} transition={{ duration:0.3, ease:[0.16,1,0.3,1] }}
        onClick={e => e.stopPropagation()}
        style={{ display:'flex', flexDirection: isMobileModal ? 'column' : 'row',
          width: isMobileModal ? '100vw' : 'min(200vw, 1080px)',
          height: isMobileModal ? '100dvh' : 'min(200vh, 700px)',
          borderRadius: isMobileModal ? 0 : 14, overflow:'hidden',
          background:'var(--white)',
          boxShadow:'0 48px 120px rgba(0,0,0,0.6), 0 12px 32px rgba(0,0,0,0.35)' }}
      >
        <div style={{ flex: isMobileModal ? (showCommentsMobile ? '0 0 52%' : '1 1 auto') : '1 1 58%',
          minWidth:0, minHeight: isMobileModal ? 0 : undefined,
          background:'#0d0a06', position:'relative',
          display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:`url(${cur.url})`,
            backgroundSize:'cover', backgroundPosition:'center',
            filter:'blur(28px) brightness(0.28) saturate(0.8)', transform:'scale(1.12)' }} />
          <motion.img key={cur.url} src={cur.url} alt={cur.legenda||'Foto'}
            initial={{ opacity:0 }} animate={{ opacity: imgLoaded ? 1 : 0 }}
            transition={{ duration:0.38 }} onLoad={() => setImgLoaded(true)}
            style={{ position:'relative', zIndex:1, maxWidth:'92%', maxHeight:'88%',
              objectFit:'contain', borderRadius:4, userSelect:'none', pointerEvents:'none' }}
            draggable={false} />
          {cur.legenda && (
            <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:2,
              background:'linear-gradient(transparent, rgba(0,0,0,0.75))', padding:'36px 24px 18px' }}>
              <p style={{ fontFamily:'var(--f-display)', fontStyle:'italic', fontSize:13,
                color:'rgba(255,255,255,0.8)', letterSpacing:'0.035em', textAlign:'center', margin:0 }}>
                {cur.legenda}
              </p>
            </div>
          )}
          {hasPrev && (
            <button onClick={() => goTo(curIdx-1)} style={{
              position:'absolute', top:'50%', left:14, transform:'translateY(-50%)',
              zIndex:3, width:42, height:42, borderRadius:'50%',
              background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)',
              color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', backdropFilter:'blur(8px)' }}>
              <IcoNavLeft />
            </button>
          )}
          {hasNext && (
            <button onClick={() => goTo(curIdx+1)} style={{
              position:'absolute', top:'50%', right:14, transform:'translateY(-50%)',
              zIndex:3, width:42, height:42, borderRadius:'50%',
              background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)',
              color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', backdropFilter:'blur(8px)' }}>
              <IcoNavRight />
            </button>
          )}
        </div>

        {(!isMobileModal || showCommentsMobile) && (
          <div style={{ flex: isMobileModal ? '1 1 auto' : '1 1 42%', minWidth:0,
            display:'flex', flexDirection:'column', background:'var(--surface-0)',
            borderTop: isMobileModal ? '1px solid var(--surface-2)' : 'none' }}>
            <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'14px 18px', borderBottom:'1px solid var(--surface-2)', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontFamily:'var(--f-display)', fontSize:17, fontWeight:500, fontStyle:'italic', color:'var(--ink)' }}>Comentários</span>
                <span style={{ fontSize:11, fontWeight:600, color:'var(--ink-50)', background:'var(--surface-2)', padding:'2px 8px', borderRadius:10 }}>{comments.length}</span>
              </div>
              <button onClick={isMobileModal ? () => setShowCommentsMobile(false) : onClose}
                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-50)', padding:4 }}>
                <IcoClose />
              </button>
            </header>
            <div ref={listRef} className="photo-comment-list"
              style={{ flex:1, overflowY:'auto', padding:'0 18px', display:'flex', flexDirection:'column' }}>
              {loading ? (
                <div style={{ margin:'auto', color:'var(--ink-25)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation:'lbSpin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                </div>
              ) : comments.length === 0 ? (
                <div style={{ margin:'auto', textAlign:'center', color:'var(--ink-25)', maxWidth:200 }}>
                  <IcoHeart filled={false} />
                  <p style={{ marginTop:12, fontSize:13, lineHeight:1.5 }}>Seja o primeiro a deixar uma memória nesta foto.</p>
                </div>
              ) : (
                comments.map(c => <CommentRow key={c._id} c={c} liked={likedMap[c._id]} onLike={toggleLike} />)
              )}
            </div>
            <div style={{ padding:'14px 18px', borderTop:'1px solid var(--surface-2)', background:'var(--white)', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Avatar name={guestName} size={30} />
                <input ref={inputRef} value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && handlePost()}
                  placeholder="Adicione um comentário…" disabled={posting}
                  style={{ flex:1, border:'none', background:'transparent', outline:'none',
                    fontSize:13, color:'var(--ink)', fontFamily:'var(--f-ui)', padding:'8px 0' }} />
                <button onClick={handlePost} disabled={posting || !commentText.trim()}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:4,
                    color: commentText.trim() ? 'var(--gold)' : 'var(--ink-10)',
                    transition:'color 0.15s', display:'flex', alignItems:'center' }}
                  aria-label="Publicar"><IcoSend /></button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
      {!isMobileModal && (
        <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.8 }}
          style={{ position:'fixed', bottom:18, left:'50%', transform:'translateX(-50%)',
            fontSize:10, color:'rgba(255,255,255,0.22)', letterSpacing:'0.12em',
            textTransform:'uppercase', pointerEvents:'none', zIndex:9001, whiteSpace:'nowrap' }}>
          esc · fechar — ← → · navegar
        </motion.p>
      )}
      <style>{`@keyframes lbSpin { to { transform:rotate(360deg); } }`}</style>
    </motion.div>
  );
}