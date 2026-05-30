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

// REGISTRA O CONFIGURAÇÃO DO ENDEREÇO DO RENDER
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

              {currentPage > 0 && (
                <motion.div className="flippable-page-container" style={{ rotateY: rotateLeft, z: zLeft }}>
                  <div className="page-face page-front">
                    <RenderAdminContent page={pages[currentPage - 1]} />
                  </div>
                  <div className="page-face page-back">
                    <RenderAdminContent page={pages[currentPage - 1]} />
                  </div>
                </motion.div>
              )}

              {currentPage < pages.length && (
                <motion.div className="flippable-page-container" style={{ rotateY: rotateRight, z: zRight }}>
                  <div className="page-face page-front">
                    <RenderAdminContent page={pages[currentPage]} />
                  </div>
                  <div className="page-face page-back">
                    <RenderAdminContent page={pages[currentPage]} />
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
        </div>
      </div>
    </div>
  );
}

function RenderAdminContent({ page }) {
  if (!page) return null;
  
  if (page.tipoLayout === "full") {
    const imgElement = page.elementos.find(el => el.tipo === "imagem");
    return (
      <div className="layout-full-container">
        <img src={imgElement?.url} alt="Página Inteira" className="full-page-image" />
      </div>
    );
  }

  return (
    <div className="layout-grid-container">
      {page.elementos.map((element, index) => {
        if (element.tipo === "titulo") {
          return <h2 key={index} className={`admin-title ${element.estilo}`}>{element.texto}</h2>;
        }
        if (element.tipo === "imagem") {
          return (
            <div key={index} className="admin-img-box">
              <img src={element.url} alt="Foto" className="admin-custom-img" />
              {element.legenda && <p className="admin-caption">{element.legenda}</p>}
            </div>
          );
        }
        if (element.tipo === "texto") {
          return <p key={index} className="admin-paragraph">{element.texto}</p>;
        }
        return null;
      })}
    </div>
  );
}