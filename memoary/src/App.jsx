import { useState, useRef, useEffect } from 'react';
import { PageFlip } from 'page-flip'; // 🚀 O novo framework especialista em livros 3D
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
// 2. O COMPONENTE DO LIVRO 3D (COM PAGE-FLIP)
// ==========================================
function BookViewer({ onLoginClick, pages }) {
  const containerRef = useRef(null);
  const bookContainerRef = useRef(null);
  const pageFlipRef = useRef(null);
  
  const [bookIsOpen, setBookIsOpen] = useState(false);

  // Inicializa o framework de folhear páginas super realista
  useEffect(() => {
    // Só inicia se a animação do GSAP já permitiu a abertura e se há contêiner
    if (!bookIsOpen || !bookContainerRef.current) return;

    // Se já existir uma instância rodando (por causa do React StrictMode), destrói primeiro
    if (pageFlipRef.current) {
      pageFlipRef.current.destroy();
    }

    // Configurações do livro 3D
    const flip = new PageFlip(bookContainerRef.current, {
      width: 440,          // Mantém as dimensões exatas do seu modo Canva
      height: 700,
      size: 'fixed',
      minWidth: 320,
      minHeight: 480,
      maxWidth: 440,
      maxHeight: 700,
      drawShadow: true,    // A mágica: sombras realistas na curva da página
      showCover: true,     // Permite capas rígidas
      flippingTime: 800,   // Velocidade da física ao soltar a página
      usePortrait: false,  // Força exibição dupla (lado a lado)
      maxShadowOpacity: 0.4,
    });

    const pagesElements = document.querySelectorAll('.my-page');
    if (pagesElements.length > 0) {
      flip.loadFromHTML(pagesElements);
      pageFlipRef.current = flip;
    }

    return () => {
      if (pageFlipRef.current) pageFlipRef.current.destroy();
    };
  }, [bookIsOpen, pages]);

  // Animação de entrada via Scroll (GSAP mantido)
  useGSAP(() => {
    gsap.set(".fixed-header", { opacity: 0, y: -20 });
    // Esconde o contêiner do livro no início
    gsap.set(".book-wrapper-gsap", { opacity: 0, scale: 0.8, xPercent: -50, left: "75%" });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".viewport-hero",
        start: "top top",
        end: "+=2000", 
        scrub: 1,      
        pin: true,     
        onUpdate: (self) => { setBookIsOpen(self.progress > 0.5); }
      }
    });

    tl.to(".left-hero-panel", { opacity: 0, x: -50, duration: 1, ease: "power2.out" }, 0);
    tl.to(".fixed-header", { opacity: 1, y: 0, pointerEvents: "auto", duration: 1, ease: "power2.out" }, 0.1); 
    tl.to(".book-wrapper-gsap", { left: "50%", opacity: 1, scale: 1, duration: 1.2, ease: "power2.inOut" }, 0); 

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

        {/* Esse div serve apenas para o GSAP mover o livro do lado direito pro centro */}
        <div className="book-wrapper-gsap" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
          
          {/* Aqui começa o livro realista */}
          <div 
            ref={bookContainerRef} 
            className="stPageFlip" 
            style={{ display: bookIsOpen ? 'block' : 'none' }} // Só renderiza quando o scroll chegar na metade
          >
            
            {/* 1. Capa do Anuário (Capa Rígida) */}
            <div className="my-page" data-density="hard">
              <img src={anuarioCapa} alt="Capa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {/* 2. Verso da Capa (Capa Rígida Interna) */}
            <div className="my-page" data-density="hard" style={{ backgroundColor: '#faf8f5' }}>
              <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoSvg} alt="Logo Watermark" style={{ width: '150px', opacity: 0.1 }} />
              </div>
            </div>

            {/* 3. Páginas Dinâmicas do Banco de Dados (Modo Canva) */}
            {pages.length === 0 ? (
              // Fallback caso não tenha páginas
              <div className="my-page" style={{ backgroundColor: '#fff' }}>
                <div style={{ padding: '20px', textAlign: 'center', marginTop: '50%' }}>
                  <p style={{ color: '#8b8984' }}>Nenhuma página adicionada ainda.</p>
                </div>
              </div>
            ) : (
              pages.map((page, index) => (
                <div className="my-page" key={page._id || index} style={{ backgroundColor: '#fff' }}>
                  <RenderAdminContent page={page} />
                </div>
              ))
            )}

            {/* 4. Verso da Contracapa (Página Rígida) */}
            <div className="my-page" data-density="hard" style={{ backgroundColor: '#e3dfd3' }}>
              <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#8b8984', fontWeight: 'bold' }}>Fim do Anuário</p>
              </div>
            </div>

            {/* 5. Contracapa Traseira (Fechando o Livro) */}
            <div className="my-page" data-density="hard" style={{ backgroundColor: '#2b2a29' }}>
               {/* Fundo escuro como encadernamento traseiro */}
            </div>

          </div>
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