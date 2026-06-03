import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
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

// ==========================================
// 1. O ORQUESTRADOR PRINCIPAL
// ==========================================
export default function App() {
  const [currentView, setCurrentView] = useState('book');
  const [anuarioData, setAnuarioData] = useState([]); 

  useEffect(() => {
    async function carregarDadosDoBanco() {
      try {
        const response = await fetch(`${API_URL}/api/anuario`);
        const resultado = await response.json();
        if (resultado.success) {
          setAnuarioData(resultado.data);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do servidor:", error);
      }
    }
    carregarDadosDoBanco();
  }, [currentView]); 

  const handleLoginClick = () => {
    const token = localStorage.getItem('adminToken');
    setCurrentView(token ? 'admin' : 'login');
  };

  if (currentView === 'login') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--cor-fundo)', padding: '20px' }}>
        <button 
          onClick={() => setCurrentView('book')} 
          style={{ cursor: 'pointer', background: 'none', border: 'none', fontWeight: 'bold', color: 'var(--cor-texto)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          ← Voltar ao Anuário
        </button>
        <LoginPage onLoginSuccess={() => setCurrentView('admin')} />
      </div>
    );
  }

  if (currentView === 'admin') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--cor-fundo)' }}>
        <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', background: '#fff', boxShadow: '0 2px 15px rgba(0,0,0,0.05)' }}>
          <button 
            onClick={() => setCurrentView('book')}
            style={{ cursor: 'pointer', background: 'none', border: 'none', fontWeight: 'bold', color: 'var(--cor-texto)', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            ← Visualizar Anuário
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('adminToken');
              setCurrentView('login');
            }}
            style={{ cursor: 'pointer', background: '#c62828', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', transition: '0.2s' }}
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

// ==========================================
// 2. LIVRO 3D (ANIMAÇÕES REALISTAS E SEM BUGS)
// ==========================================
function BookViewer({ onLoginClick, pages }) {
  const containerRef = useRef(null);
  const bookRef = useRef(null);
  const coverRef = useRef(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [bookIsOpen, setBookIsOpen] = useState(false);

  // FÍSICA DO FRAMER MOTION PARA AS PÁGINAS
  const dragX = useMotionValue(0);
  const rotateRight = useTransform(dragX, [0, -300], [0, -180]);
  const zRight = useTransform(dragX, [0, -150, -300], [0.5, 10, 0.5]);
  const rotateLeft = useTransform(dragX, [0, 300], [-180, 0]);
  const zLeft = useTransform(dragX, [0, 150, 300], [0.5, 10, 0.5]);

  const animacaoDeTroca = { duration: 0.5, ease: [0.25, 1, 0.5, 1] }; // Curva bezier suave (Design Padrão)

  const handleDragEnd = (e, info) => {
    if (!bookIsOpen || pages.length === 0) return;

    if (info.offset.x < -80 && currentPage < pages.length - 1) {
      animate(dragX, -300, animacaoDeTroca).then(() => {
        setCurrentPage(prev => prev + 1);
        dragX.set(0);
      });
    } else if (info.offset.x > 80 && currentPage > 0) {
      animate(dragX, 300, animacaoDeTroca).then(() => {
        setCurrentPage(prev => prev - 1);
        dragX.set(0);
      });
    } else {
      animate(dragX, 0, { type: "spring", stiffness: 250, damping: 25 });
    }
  };

  const virarDireita = () => {
    if (currentPage < pages.length - 1) {
      animate(dragX, -300, animacaoDeTroca).then(() => {
        setCurrentPage(prev => prev + 1);
        dragX.set(0);
      });
    }
  };

  const virarEsquerda = () => {
    if (currentPage > 0) {
      animate(dragX, 300, animacaoDeTroca).then(() => {
        setCurrentPage(prev => prev - 1);
        dragX.set(0);
      });
    }
  };

  // ANIMAÇÃO DE ENTRADA DO GSAP (FIXADA E OTIMIZADA)
  useGSAP(() => {
    gsap.set(bookRef.current, {
      xPercent: -50,
      yPercent: -50,
      rotationY: -25,
      rotationZ: -8,
      scale: 0.85,
      left: "75%",
      top: "50%"
    });

    gsap.set(".fixed-header", { opacity: 0, y: -20 });

    let stateBookIsCurrentlyOpen = false;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".viewport-hero",
        start: "top top",
        end: "+=2000", // Mais curto para a animação não ser tão demorada no scroll
        scrub: 1,      
        pin: true,     
        onUpdate: (self) => { 
          const shouldBeOpen = self.progress > 0.6;
          if (shouldBeOpen !== stateBookIsCurrentlyOpen) {
            stateBookIsCurrentlyOpen = shouldBeOpen;
            setBookIsOpen(shouldBeOpen);
          }
        }
      }
    });

    tl.to(".left-hero-panel", { opacity: 0, x: -50, duration: 1, ease: "power2.out" }, 0);
    tl.to(".fixed-header", { opacity: 1, y: 0, pointerEvents: "auto", duration: 1, ease: "power2.out" }, 0.1); 
    tl.to(bookRef.current, { left: "50%", xPercent: -50, yPercent: -50, rotationY: 0, rotationZ: 0, scale: 1, duration: 1.2, ease: "power2.inOut" }, 0); 
    tl.to(coverRef.current, { rotationY: -180, duration: 1.5, ease: "power2.inOut" }, "+=0.2");

  }, { scope: containerRef, dependencies: [] });

  return (
    <div ref={containerRef} className="app-container">
      <header className="fixed-header">
        <div className="header-content">
          <img src={logoSvg} alt="Memoary Logo" className="logo-header" />
          <button className="login-btn" onClick={onLoginClick}>login</button>
        </div>
      </header>

      <div className="viewport-hero">
        <div className="left-hero-panel">
          <div className="slogan-container">
            <h1 className="slogan-text">
              Mantenha suas <span className="highlight-gold">memórias</span><br />
              eternas para <span className="highlight-gold">sempre</span> com
            </h1>
            <div className="logo-initial-container">
              <img src={logoSvg} alt="Memoary Logo" className="logo-initial" />
            </div>
          </div>
        </div>

        <div ref={bookRef} className="book-3d-container">
          {/* CAPA DO LIVRO */}
          <div ref={coverRef} className="book-cover-3d" style={{ transform: 'translateZ(2px)', zIndex: 10 }}>
            <div className="cover-side-front">
              <img src={anuarioCapa} alt="Capa" className="capa-img-render" />
            </div>
            <div className="cover-side-back">
              <div className="inside-cover-blend">
                <img src={logoSvg} alt="Logo" className="watermark-logo" />
              </div>
            </div>
          </div>

          {/* ÚLTIMA PÁGINA (ESTÁTICA NO FUNDO) */}
          <div className="static-page right-side" style={{ transform: 'translateZ(-2px)', zIndex: 1 }}>
            <div className="page-face page-front" style={{ background: '#e3dfd3' }}>
               <div className="inside-cover-blend">
                  <p style={{ color: '#8b8984', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>Fim do Anuário</p>
               </div>
            </div>
          </div>

          {pages.length === 0 ? (
            <div className="static-page right-side" style={{ zIndex: 2 }}>
              <div className="page-face page-front" style={{ padding: '20px', textAlign: 'center' }}>
                <p style={{ color: '#8b8984', marginTop: '50%' }}>O livro de memórias está vazio.</p>
              </div>
            </div>
          ) : (
            <>
              {/* PÁGINA ESTÁTICA ESQUERDA (Fundo) */}
              {currentPage > 1 && (
                <div className="static-page left-side" style={{ transform: 'rotateY(-180deg) translateZ(0px)', zIndex: 2 }}>
                  <div className="page-face page-back">
                    <RenderAdminContent page={pages[currentPage - 2]} />
                  </div>
                </div>
              )}

              {/* PÁGINA ESTÁTICA DIREITA (Fundo) */}
              {currentPage < pages.length - 1 && (
                <div className="static-page right-side" style={{ transform: 'translateZ(0px)', zIndex: 2 }}>
                  <div className="page-face page-front">
                    <RenderAdminContent page={pages[currentPage + 1]} />
                  </div>
                </div>
              )}

              {/* PÁGINA ANIMADA (Voltando) */}
              {currentPage > 0 && (
                <motion.div className="flippable-page-container" style={{ rotateY: rotateLeft, z: zLeft, zIndex: 3 }}>
                  <div className="page-face page-front">
                    <RenderAdminContent page={pages[currentPage]} />
                  </div>
                  <div className="page-face page-back">
                    <RenderAdminContent page={pages[currentPage - 1]} />
                  </div>
                </motion.div>
              )}

              {/* PÁGINA ANIMADA (Avançando) */}
              {currentPage < pages.length - 1 && (
                <motion.div className="flippable-page-container" style={{ rotateY: rotateRight, z: zRight, zIndex: 4 }}>
                  <div className="page-face page-front">
                    <RenderAdminContent page={pages[currentPage]} />
                  </div>
                  <div className="page-face page-back">
                    <RenderAdminContent page={pages[currentPage + 1]} />
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* OVERLAY DE ARRASTO */}
          {bookIsOpen && pages.length > 0 && (
            <motion.div
              className="drag-overlay"
              drag="x"
              style={{ x: dragX }}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
            />
          )}

          {/* CONTROLES DO LIVRO */}
          {bookIsOpen && pages.length > 1 && (
            <div style={{ position: 'absolute', top: '105%', left: '50%', transform: 'translate(-50%, 0)', display: 'flex', gap: '15px', zIndex: 100 }}>
              <button 
                onClick={virarEsquerda} 
                style={{ background: 'var(--cor-texto)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', opacity: currentPage > 0 ? 1 : 0.4, pointerEvents: currentPage > 0 ? 'auto' : 'none', transition: '0.3s' }}
              >
                ← Voltar
              </button>
              <button 
                onClick={virarDireita} 
                style={{ background: 'var(--cor-destaque)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', opacity: currentPage < pages.length - 1 ? 1 : 0.4, pointerEvents: currentPage < pages.length - 1 ? 'auto' : 'none', transition: '0.3s' }}
              >
                Avançar →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. RENDERIZADOR DO MODO CANVA (O SEGREDO DA BELEZA)
// ==========================================
function RenderAdminContent({ page }) {
  if (!page) return null;
  
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      {page.elementos?.map((element, index) => {
        
        // Elementos posicionados via Canva
        if (element.tipo === "imagem" && element.x !== undefined) {
          return (
            <div
              key={element.id || index}
              style={{
                position: 'absolute',
                left: `${element.x}px`,
                top: `${element.y}px`,
                width: `${element.largura}px`,
                height: `${element.altura}px`,
                // Adicionamos estética de álbum: sombra suave, fundo branco (tipo polaroid) e bordas arredondadas sutis
                backgroundColor: '#fff',
                padding: '4px', // Cria uma bordinha branca de foto revelada
                boxShadow: '0 4px 10px rgba(0,0,0,0.08)', 
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <img 
                src={element.url} 
                alt="Foto colada" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px' }} 
              />
              
              {/* Legenda estilizada para parecer escrita à mão ou impressa na borda da foto */}
              {element.legenda && (
                <div style={{ 
                  paddingTop: '6px', 
                  textAlign: 'center', 
                  fontSize: '11px', 
                  color: 'var(--cor-texto)', 
                  fontWeight: '600',
                  fontStyle: 'italic',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {element.legenda}
                </div>
              )}
            </div>
          );
        }

        // Fallback para páginas criadas antes do modo Canva (Centralizadas)
        if (element.tipo === "imagem") {
          return (
            <div key={index} style={{ padding: '40px 20px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ padding: '8px', background: '#fff', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                <img src={element.url} alt="Foto" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '2px' }} />
                {element.legenda && <p style={{ marginTop: '12px', color: 'var(--cor-texto)', fontStyle: 'italic', fontSize: '13px' }}>{element.legenda}</p>}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}