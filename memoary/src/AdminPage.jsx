import { useState, useEffect } from 'react';
import './AdminPage.css';

// Lê a URL do Render ou usa o localhost
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://SEU-BACKEND.onrender.com'; // Lembre-se de colocar sua URL real aqui!

export default function AdminPage() {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // O useEffect isola a busca de dados e impede renders em cascata
  useEffect(() => {
    async function carregarPaginas() {
      try {
        const response = await fetch(`${API_URL}/api/anuario`);
        const data = await response.json();
        if (data.success) {
          setPages(data.data);
        }
      } catch (error) {
        console.error("Erro ao carregar páginas:", error);
      } finally {
        setIsLoading(false);
      }
    }

    carregarPaginas();
  }, []); // Array vazio garante que rode apenas UMA vez ao abrir a página

  const handleExcluirPagina = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta página para sempre?")) return;
    // ... resto do seu código
    
    // Aqui no futuro chamaremos a rota DELETE do seu back-end
    alert(`No futuro, isso excluirá a página de ID: ${id}`);
  };

  // ... O resto do código continua igualzinho para baixo!

  const handleNovaPagina = () => {
    // Aqui no futuro abriremos o "Modo Canva" limpo
    alert("Isso vai criar uma nova página em branco!");
  };

  if (isLoading) {
    return <div className="admin-container"><h2 className="admin-title dark">Carregando sua mesa de trabalho...</h2></div>;
  }

  return (
    <div className="admin-container" style={{ display: 'block', padding: '40px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 className="admin-title dark">Mesa de Trabalho</h2>
          <p className="admin-subtitle">Gerencie as páginas do seu anuário visualmente.</p>
        </div>
        <button onClick={handleNovaPagina} style={{ padding: '10px 20px', background: '#d4af37', border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: '5px', cursor: 'pointer' }}>
          + Nova Página
        </button>
      </div>

      {/* Grade visual das páginas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        
        {pages.map((page, index) => {
          // Procura a imagem dentro dos elementos da página
          const imgElement = page.elementos?.find(el => el.tipo === 'imagem');

          return (
            <div key={page._id} style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-10px', left: '-10px', background: '#333', color: '#fff', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {index + 1}
              </div>
              
              <div style={{ height: '200px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', overflow: 'hidden' }}>
                {imgElement ? (
                  <img src={imgElement.url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <p style={{ color: '#aaa' }}>Página Vazia</p>
                )}
              </div>

              <button 
                onClick={() => alert('Em breve: Abrir modo edição Canva')}
                style={{ width: '100%', padding: '8px', marginBottom: '8px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                ✏️ Editar Página
              </button>
              
              <button 
                onClick={() => handleExcluirPagina(page._id)}
                style={{ width: '100%', padding: '8px', background: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                🗑️ Excluir
              </button>
            </div>
          );
        })}

      </div>
    </div>
  );
}