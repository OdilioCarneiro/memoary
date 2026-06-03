import { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';

// Crie esta função FORA do componente React para evitar o erro de impureza

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://memoary.onrender.com';
  
  const gerarIdUnico = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID(); // Padrão moderno e seguro
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2); // Fallback
};
export default function AdminPage() {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paginaAtiva, setPaginaAtiva] = useState(null); 
  const [elementoSelecionado, setElementoSelecionado] = useState(null); // Guarda o ID da foto clicada

  // ==========================================
  // 1. LÓGICA DE BANCO DE DADOS (MANTIDA DO SEU CÓDIGO)
  // ==========================================
  useEffect(() => {
    async function carregarPaginas() {
      try {
        const response = await fetch(`${API_URL}/api/anuario`);
        const data = await response.json();
        if (data.success) {
          setPages(data.data);
        }
      } catch (error) {
        console.error("Erro detalhado ao carregar páginas:", error);
      } finally {
        setIsLoading(false);
      }
    }
    carregarPaginas();
  }, []);

  const handleNovaPagina = async () => {
    try {
      const response = await fetch(`${API_URL}/api/anuario/nova-pagina`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setPages(prev => [...prev, data.data]);
        setPaginaAtiva(data.data);
        setElementoSelecionado(null);
      }
    } catch (error) {
      console.error("Erro ao criar nova página:", error);
      alert("Erro ao criar nova página.");
    }
  };

  const handleExcluirPagina = async (id) => {
    if (!window.confirm("Deseja realmente deletar esta página do anuário?")) return;
    try {
      const response = await fetch(`${API_URL}/api/anuario/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setPages(prev => prev.filter(p => p._id !== id));
        if (paginaAtiva?._id === id) {
          setPaginaAtiva(null);
          setElementoSelecionado(null);
        }
      }
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao tentar deletar a página.");
    }
  };

  const salvarPagina = async () => {
    if (!paginaAtiva) return;
    try {
      const response = await fetch(`${API_URL}/api/anuario/${paginaAtiva._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementos: paginaAtiva.elementos })
      });
      const data = await response.json();
      if (data.success) {
        alert("Página salva no banco de dados com sucesso! 🎉");
      } else {
        alert("Erro ao salvar no servidor.");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro de conexão ao salvar a página.");
    }
  };

  // ==========================================
  // 2. LÓGICA DO MODO CANVA (ARRASTAR, SOLTAR E EDITAR)
  // ==========================================
  
  // Adiciona um quadrado vazio no palco
  const adicionarFotoNaPagina = () => {
    const novoElemento = {
      id: gerarIdUnico(),
      tipo: 'imagem',
      url: 'https://via.placeholder.com/200x150?text=Cole+uma+URL+ao+lado', // Placeholder
      x: 100,  
      y: 100,  
      largura: 200, 
      altura: 150,
      legenda: '' 
    };

    atualizarPaginaAtivaLocal([...(paginaAtiva.elementos || []), novoElemento]);
    setElementoSelecionado(novoElemento.id);
  };

  // Atualiza propriedades específicas (x, y, largura, legenda) de um elemento
  const atualizarElemento = (id, novosDados) => {
    const elementosAtualizados = paginaAtiva.elementos.map(el => 
      el.id === id ? { ...el, ...novosDados } : el
    );
    atualizarPaginaAtivaLocal(elementosAtualizados);
  };

  // Remove uma foto específica
  const removerElemento = (id) => {
    const elementosAtualizados = paginaAtiva.elementos.filter(el => el.id !== id);
    atualizarPaginaAtivaLocal(elementosAtualizados);
    setElementoSelecionado(null);
  };

  // Sincroniza a edição da página ativa com a lista geral de páginas no estado do React
  const atualizarPaginaAtivaLocal = (novosElementos) => {
    const paginaAtualizada = { ...paginaAtiva, elementos: novosElementos };
    setPaginaAtiva(paginaAtualizada);
    setPages(prev => prev.map(p => p._id === paginaAtiva._id ? paginaAtualizada : p));
  };


  if (isLoading) return <div style={{ padding: '50px', textAlign: 'center' }}>Carregando Editor...</div>;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 75px)', fontFamily: 'Arial, sans-serif', backgroundColor: 'var(--cor-fundo)' }}>
      
      {/* 1. BARRA LATERAL ESQUERDA: LISTA DE PÁGINAS */}
      <div style={{ width: '300px', backgroundColor: '#fff', borderRight: '1px solid #ccc', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--cor-texto)', marginBottom: '5px' }}>Anuário</h2>
        <p style={{ fontSize: '12px', color: '#8b8984', marginBottom: '20px' }}>Selecione uma página</p>
        
        <button onClick={handleNovaPagina} style={{ padding: '12px', backgroundColor: '#d4af37', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}>
          + Adicionar Página
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pages.map((page, index) => (
            <div 
              key={page._id} 
              onClick={() => { setPaginaAtiva(page); setElementoSelecionado(null); }}
              style={{ 
                padding: '15px', 
                backgroundColor: paginaAtiva?._id === page._id ? '#f5ebd0' : '#f9f9f9', 
                border: paginaAtiva?._id === page._id ? '2px solid #d4af37' : '1px solid #ddd',
                borderRadius: '8px', cursor: 'pointer', position: 'relative'
              }}
            >
              <span style={{ fontWeight: 'bold', color: 'var(--cor-texto)' }}>Página {index + 1}</span>
              <span style={{ fontSize: '12px', color: '#8b8984', display: 'block' }}>{page.elementos?.length || 0} fotos</span>
              <button 
                onClick={(e) => { e.stopPropagation(); handleExcluirPagina(page._id); }} 
                style={{ position: 'absolute', right: '10px', top: '12px', background: 'none', border: 'none', color: '#c62828', cursor: 'pointer' }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. ÁREA CENTRAL: O PALCO (EXATOS 440X700PX) */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#e3dfd3', overflow: 'auto' }}>
        {paginaAtiva ? (
          <>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <button onClick={adicionarFotoNaPagina} style={{ padding: '10px 20px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                🖼️ Adicionar Foto
              </button>
              <button onClick={salvarPagina} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                💾 Salvar Página
              </button>
            </div>

            {/* A "Folha" do Livro (Tela de pintura) */}
            <div 
              style={{ 
                width: '440px', 
                height: '700px', 
                backgroundColor: '#fff', 
                boxShadow: '0 15px 35px rgba(0,0,0,0.2)', 
                position: 'relative', 
                overflow: 'hidden' 
              }}
              onClick={() => setElementoSelecionado(null)} // Clicar fora desmarca a foto
            >
              {(!paginaAtiva.elementos || paginaAtiva.elementos.length === 0) && (
                <p style={{ textAlign: 'center', color: '#ccc', marginTop: '300px' }}>Página em branco.</p>
              )}

              {/* RENDERIZAÇÃO DOS ELEMENTOS ARRASTÁVEIS */}
              {paginaAtiva.elementos?.map((el) => (
                <Rnd
                  key={el.id}
                  bounds="parent" // Impede que a foto saia do quadrado branco
                  size={{ width: el.largura, height: el.altura }}
                  position={{ x: el.x, y: el.y }}
                  
                  // Atualiza a posição ao terminar de arrastar
                  onDragStop={(e, d) => {
                    atualizarElemento(el.id, { x: d.x, y: d.y });
                  }}
                  
                  // Atualiza tamanho e posição ao terminar de redimensionar
                  onResizeStop={(e, direction, ref, delta, position) => {
                    atualizarElemento(el.id, {
                      largura: parseInt(ref.style.width, 10),
                      altura: parseInt(ref.style.height, 10),
                      ...position
                    });
                  }}
                  
                  onClick={(e) => {
                    e.stopPropagation(); // Impede que o clique desmarque a foto
                    setElementoSelecionado(el.id);
                  }}
                  
                  style={{ 
                    border: elementoSelecionado === el.id ? '2px dashed #007bff' : 'none',
                    cursor: 'move',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <img src={el.url} alt="Foto" style={{ width: '100%', flex: 1, objectFit: 'cover' }} draggable="false" />
                  
                  {/* Renderiza a legenda embaixo da foto se ela existir */}
                  {el.legenda && (
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.8)', padding: '5px', textAlign: 'center', fontSize: '12px', borderTop: '1px solid #ddd' }}>
                      {el.legenda}
                    </div>
                  )}
                </Rnd>
              ))}
            </div>
          </>
        ) : (
          <div style={{ marginTop: '300px', color: '#777' }}>
            <h2>Nenhuma página selecionada</h2>
          </div>
        )}
      </div>

      {/* 3. BARRA LATERAL DIREITA: PROPRIEDADES DA FOTO */}
      {paginaAtiva && (
        <div style={{ width: '300px', backgroundColor: '#fff', borderLeft: '1px solid #ccc', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--cor-texto)', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Propriedades</h3>
          
          {elementoSelecionado ? (
            <>
              <div className="input-group">
                <label className="admin-label">Link da Imagem (URL)</label>
                <input 
                  className="text-input"
                  type="text" 
                  placeholder="https://exemplo.com/foto.jpg"
                  value={paginaAtiva.elementos.find(el => el.id === elementoSelecionado)?.url || ''}
                  onChange={(e) => atualizarElemento(elementoSelecionado, { url: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="admin-label">Legenda da Foto</label>
                <input 
                  className="text-input"
                  type="text" 
                  placeholder="Ex: Viagem para a praia"
                  value={paginaAtiva.elementos.find(el => el.id === elementoSelecionado)?.legenda || ''}
                  onChange={(e) => atualizarElemento(elementoSelecionado, { legenda: e.target.value })}
                />
              </div>

              <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>Largura: {paginaAtiva.elementos.find(el => el.id === elementoSelecionado)?.largura}px</p>
                <button 
                  onClick={() => removerElemento(elementoSelecionado)}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Excluir esta Foto
                </button>
              </div>
            </>
          ) : (
            <p style={{ fontSize: '14px', color: '#aaa', textAlign: 'center', marginTop: '50px' }}>
              Clique em uma foto no palco para editar a URL e a legenda dela.
            </p>
          )}
        </div>
      )}
    </div>
  );
}