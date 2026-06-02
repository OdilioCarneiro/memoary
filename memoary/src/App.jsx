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

// REGISTRA A CONFIGURAÇÃO DO ENDEREÇO DO RENDER
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://memoary.onrender.com';

// Registra o GSAP
gsap.registerPlugin(ScrollTrigger);

// ==========================================
// 1. O ORQUESTRADOR
// ==========================================
export default function App() {
  const [currentView, setCurrentView] = useState('book');
  const [anuarioData, setAnuarioData] = useState([]); // Guarda os dados vindos do banco

  // Busca as fotos salvas no MongoDB toda vez que o site carrega
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
  }, [currentView]); // Recarrega quando alternamos de tela (ex: após adicionar foto no admin)

  const handleLoginClick = () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setCurrentView('admin');
    } else {
      setCurrentView('login');
    }
  };

  if (currentView === 'login') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--cor-fundo)', padding: '20px' }}>
        <button 
          onClick={() => setCurrentView('book')} 
          style={{ cursor: 'pointer', background: 'none', border: 'none', fontWeight: 'bold', color: 'var(--cor-texto)' }}
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
        <header style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <button 
            onClick={() => setCurrentView('book')}
            style={{ cursor: 'pointer', background: 'none', border: 'none', fontWeight: 'bold', color: 'var(--cor-texto)' }}
          >
            ← Visualizar Anuário
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('adminToken');
              setCurrentView('login');
            }}
            style={{ cursor: 'pointer', background: '#c62828', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold' }}
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
// 2. O COMPONENTE DO LIVRO 3D
// ==========================================
function BookViewer({ onLoginClick, pages }) {
  const containerRef = useRef(null);
  const bookRef = useRef(null);
  const coverRef = useRef(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [bookIsOpen, setBookIsOpen] = useState(false);

  const dragX = useMotionValue(0);
  const rotateRight = useTransform(dragX, [0, -300], [0, -180]);
  const zRight = useTransform(dragX, [0, -150, -300], [0.5, 10, 0.5]);
  const rotateLeft = useTransform(dragX, [0, 300], [-180, 0]);
  const zLeft = useTransform(dragX, [0, 150, 300], [0.5, 10, 0.5]);

  // Função para arrastar com o mouse (Mantida e funcionando)
  const handleDragEnd = (e, info) => {
    if (!bookIsOpen || pages.length === 0) return;

    if (info.offset.x < -50 && currentPage < pages.length - 1) {
      animate(dragX, -300, { duration: 0.4, ease: "easeInOut" }).then(() => {
        setCurrentPage(prev => prev + 1);
        dragX.set(0);
      });
    } else if (info.offset.x > 50 && currentPage > 0) {
      animate(dragX, 300, { duration: 0.4, ease: "easeInOut" }).then(() => {
        setCurrentPage(prev => prev - 1);
        dragX.set(0);
      });
    } else {
      animate(dragX, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  };

  // Funções extras para os botões de clique
  const virarDireita = () => {
    if (currentPage < pages.length - 1) {
      animate(dragX, -300, { duration: 0.4, ease: "easeInOut" }).then(() => {
        setCurrentPage(prev => prev + 1);
        dragX.set(0);
      });
    }
  };

  const virarEsquerda = () => {
    if (currentPage > 0) {
      animate(dragX, 300, { duration: 0.4, ease: "easeInOut" }).then(() => {
        setCurrentPage(prev => prev - 1);
        dragX.set(0);
      });
    }
  };

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

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".viewport-hero",
        start: "top top",
        end: "+=2500", 
        scrub: 1,      
        pin: true,     
        onUpdate: (self) => { setBookIsOpen(self.progress > 0.6); }
      }
    });

    tl.to(".left-hero-panel", { opacity: 0, x: -50, duration: 1, ease: "power2.out" }, 0);
    tl.to(".fixed-header", { opacity: 1, y: 0, pointerEvents: "auto", duration: 1, ease: "power2.out" }, 0.1); 
    tl.to(bookRef.current, { left: "50%", xPercent: -50, yPercent: -50, rotationY: 0, rotationZ: 0, scale: 1, duration: 1.2, ease: "power2.inOut" }, 0); 
    tl.to(coverRef.current, { rotationY: -180, duration: 1.5, ease: "power2.inOut" }, "+=0.2");

  }, { scope: containerRef });

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
          <div ref={coverRef} className="book-cover-3d" style={{ transform: 'translateZ(2px)' }}>
            <div className="cover-side-front">
              <img src={anuarioCapa} alt="Capa" className="capa-img-render" />
            </div>
            <div className="cover-side-back">
              <div className="inside-cover-blend">
                <img src={logoSvg} alt="Logo" className="watermark-logo" />
              </div>
            </div>
          </div>

          <div className="static-page right-side" style={{ transform: 'translateZ(-2px)' }}>
            <div className="page-face page-front" style={{ background: '#e3dfd3' }}>
               <div className="inside-cover-blend">
                  <p style={{ color: '#8b8984' }}>Fim do Anuário</p>
               </div>
            </div>
          </div>

          {pages.length === 0 ? (
            <div className="static-page right-side">
              <div className="page-face page-front" style={{ padding: '20px', textAlign: 'center' }}>
                <p style={{ color: '#8b8984', marginTop: '40%' }}>Nenhuma página adicionada ainda.</p>
              </div>
            </div>
          ) : (
            <>
              {currentPage > 1 && (
                <div className="static-page left-side" style={{ transform: 'rotateY(-180deg) translateZ(0px)' }}>
                  <div className="page-face page-back">
                    <RenderAdminContent page={pages[currentPage - 2]} />
                  </div>
                </div>
              )}

              {currentPage < pages.length - 1 && (
                <div className="static-page right-side" style={{ transform: 'translateZ(0px)' }}>
                  <div className="page-face page-front">
                    <RenderAdminContent page={pages[currentPage + 1]} />
                  </div>
                </div>
              )}

              {/* CORREÇÃO: Variáveis das páginas flutuantes ao voltar */}
              {currentPage > 0 && (
                <motion.div className="flippable-page-container" style={{ rotateY: rotateLeft, z: zLeft }}>
                  <div className="page-face page-front">
                    <RenderAdminContent page={pages[currentPage]} />
                  </div>
                  <div className="page-face page-back">
                    <RenderAdminContent page={pages[currentPage - 1]} />
                  </div>
                </motion.div>
              )}

              {/* CORREÇÃO: Variáveis das páginas flutuantes ao avançar */}
              {currentPage < pages.length - 1 && (
                <motion.div className="flippable-page-container" style={{ rotateY: rotateRight, z: zRight }}>
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

          {bookIsOpen && pages.length > 0 && (
            <motion.div
              className="drag-overlay"
              drag="x"
              style={{ x: dragX }}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
            />
          )}

          {/* Botões extras de navegação (aparecem embaixo do livro) */}
          {bookIsOpen && pages.length > 1 && (
            <div style={{ position: 'absolute', top: '105%', left: '50%', transform: 'translate(-50%, 0)', display: 'flex', gap: '20px', zIndex: 100 }}>
              <button 
                onClick={virarEsquerda} 
                style={{ background: 'var(--cor-destaque)', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', opacity: currentPage > 0 ? 1 : 0.5, pointerEvents: currentPage > 0 ? 'auto' : 'none' }}
              >
                ← Voltar
              </button>
              <button 
                onClick={virarDireita} 
                style={{ background: 'var(--cor-destaque)', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', opacity: currentPage < pages.length - 1 ? 1 : 0.5, pointerEvents: currentPage < pages.length - 1 ? 'auto' : 'none' }}
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
// 3. A MÁGICA DO MODO CANVA ACONTECE AQUI
// ==========================================
function RenderAdminContent({ page }) {
  if (!page) return null;
  
  return (
    // CORREÇÃO: O position absolute garante que a tela ignore o padding e use os 440x700px integrais
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
      {page.elementos?.map((element, index) => {
        
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
                overflow: 'hidden'
              }}
            >
              <img 
                src={element.url} 
                alt="Foto do anuário" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
          );
        }

        if (element.tipo === "imagem") {
          return (
            <div key={index} style={{ padding: '20px', textAlign: 'center' }}>
              <img src={element.url} alt="Foto" style={{ maxWidth: '100%', borderRadius: '8px' }} />
              {element.legenda && <p style={{ marginTop: '10px', color: '#555' }}>{element.legenda}</p>}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}