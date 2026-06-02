import { useState, useEffect } from 'react';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://memoary.onrender.comm'
export default function AdminPage() {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paginaAtiva, setPaginaAtiva] = useState(null); // Guarda a página que está sendo editada "estilo Canva"

  // O useEffect isola a busca de dados de forma segura e limpa para o React
  useEffect(() => {
    async function carregarPaginas() {
      try {
        const response = await fetch(`${API_URL}/api/anuario`);
        const data = await response.json();
        if (data.success) {
          setPages(data.data);
        }
      } catch (error) {
        // Usando a variável 'error' aqui para o linter não reclamar de código morto
        console.error("Erro detalhado ao carregar páginas do anuário:", error);
      } finally {
        setIsLoading(false);
      }
    }

    carregarPaginas();
  }, []); // Array vazio garante que a busca aconteça apenas uma vez ao montar a tela

  const handleNovaPagina = async () => {
    try {
      const response = await fetch(`${API_URL}/api/anuario/nova-pagina`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setPages(prev => [...prev, data.data]);
        setPaginaAtiva(data.data); // Já abre a página nova no editor automaticamente
      }
    } catch (error) {
      console.error("Erro ao criar nova página:", error);
      alert("Erro ao criar nova página.");
    }
  };

  const handleExcluirPagina = async (id) => {
    if (!window.confirm("Deseja deletar esta página do anuário?")) return;
    // Aqui adicionaremos a rota DELETE em breve para sumir do banco
    setPages(prev => prev.filter(p => p._id !== id));
    if (paginaAtiva?._id === id) setPaginaAtiva(null);
  };

  // Simula a adição de uma foto na página atual com posições iniciais (Modo Canva)
  const adicionarFotoNaPagina = () => {
    const url = window.prompt("Cole aqui o link de uma imagem (Temporário até usarmos o upload do Cloudinary):");
    if (!url) return;

    const novoElemento = {
      id: Date.now().toString(),
      tipo: 'imagem',
      url: url,
      x: 50,  // Posição X inicial em pixels
      y: 50,  // Posição Y inicial em pixels
      largura: 200, // Largura inicial em pixels
      altura: 150  // Altura inicial em pixels
    };

    const paginaAtualizada = {
      ...paginaAtiva,
      elementos: [...(paginaAtiva.elementos || []), novoElemento]
    };

    setPaginaAtiva(paginaAtualizada);
    setPages(prev => prev.map(p => p._id === paginaAtiva._id ? paginaAtualizada : p));
  };

  if (isLoading) return <div style={{ padding: '50px', textAlign: 'center' }}>Carregando Editor...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', backgroundColor: '#f0f2f5' }}>
      
      {/* BARRA LATERAL: Lista de Páginas do Livro */}
      <div style={{ width: '300px', backgroundColor: '#fff', borderRight: '1px solid #e0e0e0', padding: '20px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '5px', color: '#333' }}>Páginas do Anuário</h2>
        <p style={{ fontSize: '12px', color: '#777', marginBottom: '20px' }}>Clique em uma página para editá-la.</p>
        
        <button onClick={handleNovaPagina} style={{ width: '100%', padding: '12px', backgroundColor: '#d4af37', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}>
          + Adicionar Página em Branco
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {pages.map((page, index) => (
            <div 
              key={page._id} 
              onClick={() => setPaginaAtiva(page)}
              style={{ 
                padding: '15px', 
                backgroundColor: paginaAtiva?._id === page._id ? '#f5ebd0' : '#f9f9f9', 
                border: paginaAtiva?._id === page._id ? '2px solid #d4af37' : '1px solid #ddd',
                borderRadius: '8px', 
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <span style={{ fontWeight: 'bold', color: '#555' }}>Página {index + 1}</span>
              <span style={{ fontSize: '12px', color: '#999', display: 'block' }}>{page.elementos?.length || 0} elementos</span>
              <button 
                onClick={(e) => { e.stopPropagation(); handleExcluirPagina(page._id); }} 
                style={{ position: 'absolute', right: '10px', top: '12px', background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '16px' }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ÁREA PRINCIPAL: O Editor Estilo Canva */}
      <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
        {paginaAtiva ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={adicionarFotoNaPagina} style={{ padding: '10px 15px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                🖼️ Inserir Foto nesta Página
              </button>
              <button onClick={() => alert('Salvando alterações...')} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                💾 Salvar Alterações no Livro
              </button>
            </div>

            {/* A "Folha" do Livro (Tela de pintura do Canva) */}
            <div style={{ 
              width: '500px', 
              height: '600px', 
              backgroundColor: '#fff', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)', 
              borderRadius: '4px',
              position: 'relative', 
              border: '1px solid #ccc',
              overflow: 'hidden'
            }}>
              {paginaAtiva.elementos?.map((el) => (
                <div
                  key={el.id}
                  style={{
                    position: 'absolute',
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.largura}px`,
                    height: `${el.altura}px`,
                    border: '2px dashed #d4af37', 
                    cursor: 'move',
                    overflow: 'hidden'
                  }}
                >
                  <img src={el.url} alt="Elemento" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
              
              {(!paginaAtiva.elementos || paginaAtiva.elementos.length === 0) && (
                <p style={{ color: '#aaa', marginTop: '280px' }}>Esta página está em branco. Adicione uma foto!</p>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#777' }}>
            <h2>Nenhuma página selecionada</h2>
            <p>Selecione uma página na barra lateral ou crie uma nova para começar a personalizar.</p>
          </div>
        )}
      </div>

    </div>
  );
}