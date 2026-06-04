import { useState, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import './AdminPage.css';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://memoary.onrender.com';

const gerarId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

/* =====================================================
   CONSTANTES DE LAYOUT (PROPORÇÃO A5 PREMIUM)
   ===================================================== */
const CANVAS_W = 420;
const CANVAS_H = 660;

/* =====================================================
   COMPONENTES DE ÍCONES VETORIAIS (PADRÃO APPLE)
   ===================================================== */
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 1v12M1 7h12"/></svg>
);
const IconImage = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
);
const IconSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const IconBook = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5v-15z"/></svg>
);

export default function AdminPage() {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activePage, setActivePage] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ---------- Carregar Páginas ---------- */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/anuario`);
        const json = await res.json();
        if (json.success) setPages(json.data);
      } catch (e) {
        console.error('Erro ao carregar:', e);
        showToast('Erro ao carregar páginas', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [showToast]);

  /* ---------- Nova Página ---------- */
  const handleNovaPagina = async () => {
    try {
      const res = await fetch(`${API_URL}/api/anuario/nova-pagina`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setPages(p => [...p, json.data]);
        setActivePage(json.data);
        setSelectedId(null);
        showToast('Página criada com sucesso');
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao criar página', 'error');
    }
  };

  /* ---------- Excluir Página ---------- */
  const handleExcluirPagina = async (id) => {
    if (!window.confirm('Deseja excluir esta página permanentemente?')) return;
    try {
      const res = await fetch(`${API_URL}/api/anuario/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setPages(p => p.filter(x => x._id !== id));
        if (activePage?._id === id) { 
          setActivePage(null); 
          setSelectedId(null); 
        }
        showToast('Página excluída');
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao excluir página', 'error');
    }
  };

  /* ---------- Salvar Página ---------- */
  const salvarPagina = async () => {
    if (!activePage || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/anuario/${activePage._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementos: activePage.elementos }),
      });
      const json = await res.json();
      if (json.success) showToast('Alterações salvas no banco de dados');
      else showToast('Erro ao salvar no servidor', 'error');
    } catch (e) {
      console.error(e);
      showToast('Erro de conexão com o servidor', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------- Manipuladores de Estado do Canvas ---------- */
  const updateActiveLocal = useCallback((newElements) => {
    setActivePage(prev => {
      if (!prev) return null;
      const updated = { ...prev, elementos: newElements };
      setPages(p => p.map(x => x._id === updated._id ? updated : x));
      return updated;
    });
  }, []);

  const addPhoto = () => {
    if (!activePage) return;
    const el = {
      id: gerarId(), tipo: 'imagem',
      url: '', x: 70, y: 80,
      largura: 280, altura: 210, legenda: ''
    };
    updateActiveLocal([...(activePage.elementos || []), el]);
    setSelectedId(el.id);
  };

  const updateEl = (id, data) => {
    if (!activePage) return;
    updateActiveLocal(activePage.elementos.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const removeEl = (id) => {
    if (!activePage) return;
    updateActiveLocal(activePage.elementos.filter(e => e.id !== id));
    setSelectedId(null);
  };

  const selectedEl = activePage?.elementos?.find(e => e.id === selectedId) || null;

  /* =====================================================
     RND LOADING COMPONENT
     ===================================================== */
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#86868b' }}>
          <div className="spinner" style={{ marginBottom: 16 }}></div>
          <p style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>Carregando ecossistema de design...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f5f5f7', overflow: 'hidden', color: '#1d1d1f' }}>
      
      {/* ===== NOTIFICAÇÃO ESTILO ECOSSISTEMA APPLE (TOAST) ===== */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(29, 29, 31, 0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          color: '#ffffff', padding: '10px 24px', borderRadius: '24px', zIndex: 9999,
          fontWeight: 500, fontSize: 13, boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8
        }}>
          {toast.type === 'error' && <span style={{ color: '#ff453a' }}>●</span>}
          {toast.type === 'success' && <span style={{ color: '#32d74b' }}>●</span>}
          {toast.msg}
        </div>
      )}

      {/* ===== BARRA LATERAL ESQUERDA: NAVEGAÇÃO DE PÁGINAS ===== */}
      <aside style={{ width: 280, background: '#ffffff', borderRight: '1px solid #e8e8ed', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '24px 24px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>Estrutura do Livro</h2>
          <p style={{ fontSize: 12, color: '#86868b' }}>{pages.length} {pages.length === 1 ? 'página catalogada' : 'páginas catalogadas'}</p>
        </div>

        <div style={{ padding: '0 24px 16px' }}>
          <button onClick={handleNovaPagina} className="apple-btn-primary">
            <IconPlus /> Adicionar Página
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }} className="custom-scrollbar">
          {pages.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#86868b', fontSize: 13, marginTop: 40, fontStyle: 'italic' }}>Nenhuma página gerada</p>
          ) : (
            pages.map((page, idx) => {
              const isActive = activePage?._id === page._id;
              return (
                <div key={page._id}
                  onClick={() => { setActivePage(page); setSelectedId(null); }}
                  className={`sidebar-page-item ${isActive ? 'active' : ''}`}
                  style={{
                    padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', position: 'relative',
                    transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 12,
                    background: isActive ? '#f5f5f7' : 'transparent',
                    border: '1px solid ' + (isActive ? '#e8e8ed' : 'transparent')
                  }}
                >
                  {/* Mini-thumbnail geométrica */}
                  <div style={{ width: 44, height: 58, background: '#f5f5f7', borderRadius: '4px', overflow: 'hidden', position: 'relative', border: '1px solid #e8e8ed', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', flexShrink: 0 }}>
                    {page.elementos?.filter(e => e.tipo === 'imagem' && e.url).slice(0, 3).map((el, eIdx) => (
                      <img key={el.id} src={el.url} alt=""
                        style={{
                          position: 'absolute',
                          left: `${(el.x / CANVAS_W) * 100}%`,
                          top: `${(el.y / CANVAS_H) * 100}%`,
                          width: `${(el.largura / CANVAS_W) * 100}%`,
                          height: `${(el.altura / CANVAS_H) * 100}%`,
                          objectFit: 'cover',
                          opacity: 1 - (eIdx * 0.2)
                        }}
                      />
                    ))}
                  </div>

                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: isActive ? 600 : 500, fontSize: 13, color: '#1d1d1f', display: 'block' }}>Página {idx + 1}</span>
                      <span style={{ fontSize: 11, color: '#86868b', display: 'block', textTransform: 'lowercase', marginTop: 1 }}>
                        {page.elementos?.length || 0} {page.elementos?.length === 1 ? 'elemento' : 'elementos'}
                      </span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleExcluirPagina(page._id); }}
                      className="btn-icon-delete"
                      title="Remover página permanentemente"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* ===== ÁREA CENTRAL: MESA DE TRABALHO E CANVAS ===== */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f5f7', overflow: 'hidden' }}>
        {activePage ? (
          <>
            {/* Top Sub-Bar (Sub-menu contextual) */}
            <div style={{ height: 52, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid #e8e8ed', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, zIndex: 10 }}>
              <button onClick={addPhoto} className="apple-btn-secondary">
                <IconImage /> Inserir Mídia
              </button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: '#86868b', fontWeight: 400 }}>
                {activePage.elementos?.length || 0} Camada{activePage.elementos?.length !== 1 ? 's' : ''} ativa
              </span>
              <button onClick={salvarPagina} disabled={isSaving} className="apple-btn-action" style={{ background: isSaving ? '#e8e8ed' : '#1d1d1f', color: isSaving ? '#86868b' : '#ffffff' }}>
                <IconSave /> {isSaving ? 'Sincronizando...' : 'Salvar no Banco'}
              </button>
            </div>

            {/* Espaço Scrolleável do Livro */}
            <div style={{ flex: 1, overflow: 'auto', padding: '48px 24px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="custom-scrollbar">
              
              {/* O Palco de Renderização (Design Tridimensional) */}
              <div
                onClick={() => setSelectedId(null)}
                style={{
                  width: CANVAS_W, height: CANVAS_H,
                  background: '#ffffff',
                  boxShadow: '0 30px 70px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                  position: 'relative', overflow: 'hidden',
                  borderRadius: '4px 12px 12px 4px',
                  backgroundImage: 'linear-gradient(to right, #eaeaea 0%, #fcfcfc 2%, #ffffff 6%, #ffffff 100%)',
                  cursor: 'default', flexShrink: 0,
                }}
              >
                {/* Canaleta Sutil de Profundidade da Lombada */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 24, background: 'linear-gradient(to right, rgba(0,0,0,0.04), rgba(0,0,0,0.01) 60%, transparent)', pointerEvents: 'none', zIndex: 3 }} />
                
                {/* Margem de Segurança Tipo Editor de Diagramação */}
                <div style={{ position: 'absolute', inset: '28px', border: '1px dashed #e8e8ed', borderRadius: 2, pointerEvents: 'none', zIndex: 2 }} />

                {(!activePage.elementos || activePage.elementos.length === 0) && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, pointerEvents: 'none', padding: 40 }}>
                    <div style={{ color: '#86868b', opacity: 0.6 }}><IconImage /></div>
                    <p style={{ fontSize: 13, color: '#86868b', textAlign: 'center', lineHeight: 1.6, fontWeight: 400, maxWidth: 220 }}>
                      Página vazia. Selecione "Inserir Mídia" para iniciar a composição estrutural.
                    </p>
                  </div>
                )}

                {/* ELEMENTOS DINÂMICOS ARRASTÁVEIS */}
                {activePage.elementos?.map(el => {
                  const isSelected = selectedId === el.id;
                  return (
                    <Rnd
                      key={el.id}
                      bounds="parent"
                      size={{ width: el.largura, height: el.altura }}
                      position={{ x: el.x, y: el.y }}
                      onDragStop={(_, d) => updateEl(el.id, { x: d.x, y: d.y })}
                      onResizeStop={(_, __, ref, ___, pos) => updateEl(el.id, {
                        largura: ref.offsetWidth,
                        altura: ref.offsetHeight,
                        ...pos,
                      })}
                      onClick={e => { e.stopPropagation(); setSelectedId(el.id); }}
                      style={{
                        border: isSelected ? '2px solid #0066cc' : '1px solid rgba(0,0,0,0.06)',
                        cursor: 'move',
                        boxShadow: isSelected ? '0 8px 24px rgba(0,102,204,0.2)' : '0 4px 12px rgba(0,0,0,0.04)',
                        borderRadius: 4, transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                        background: '#ffffff', overflow: 'hidden'
                      }}
                    >
                      {el.url ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <img src={el.url} alt="Elemento visual" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} draggable={false} />
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, padding: 12 }}>
                          <div style={{ color: '#86868b', opacity: 0.5 }}><IconImage /></div>
                          <span style={{ fontSize: 11, color: '#86868b', textAlign: 'center', fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.4 }}>Vincule uma URL de imagem nas propriedades ao lado.</span>
                        </div>
                      )}
                      {el.legenda && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '6px 8px', fontSize: 10, color: '#1d1d1f', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.05)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {el.legenda}
                        </div>
                      )}
                    </Rnd>
                  );
                })}
              </div>

              <p style={{ marginTop: 24, fontSize: 11, color: '#86868b', letterSpacing: '0.04em', fontWeight: 500, textTransform: 'uppercase' }}>
                Dimensão real: {CANVAS_W} × {CANVAS_H} px — Formato Editorial A5
              </p>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#86868b' }}>
            <IconBook />
            <p style={{ fontSize: 14, fontWeight: 400, textAlign: 'center', color: '#86868b' }}>
              Selecione uma página no painel esquerdo ou crie um layout do zero.
            </p>
          </div>
        )}
      </main>

      {/* ===== BARRA LATERAL DIREITA: INSPECTOR DE PROPRIEDADES ===== */}
      <aside style={{ width: 300, background: '#ffffff', borderLeft: '1px solid #e8e8ed', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #e8e8ed' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
            {selectedEl ? 'Inspetor de Elemento' : 'Configurações Globais'}
          </h3>
        </div>

        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }} className="custom-scrollbar">
          {selectedEl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Preview Geométrico no Inspetor */}
              {selectedEl.url && (
                <div style={{ width: '100%', height: 130, borderRadius: '6px', overflow: 'hidden', background: '#f5f5f7', border: '1px solid #e8e8ed', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                  <img src={selectedEl.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              <div className="input-field-group">
                <label className="apple-label">Origem do Arquivo (URL)</label>
                <input type="text" placeholder="https://exemplo.com/imagem.jpg" value={selectedEl.url} onChange={e => updateEl(selectedEl.id, { url: e.target.value })} className="apple-input" />
              </div>

              <div className="input-field-group">
                <label className="apple-label">Legenda Descritiva</label>
                <input type="text" placeholder="Insira o texto da legenda..." value={selectedEl.legenda || ''} onChange={e => updateEl(selectedEl.id, { legenda: e.target.value })} className="apple-input" />
              </div>

              <div className="input-field-group">
                <label className="apple-label">Geometria e Coordenadas (px)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
                  {[
                    { label: 'Eixo X', key: 'x' },
                    { label: 'Eixo Y', key: 'y' },
                    { label: 'Largura', key: 'largura' },
                    { label: 'Altura', key: 'altura' },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 11, color: '#86868b', fontWeight: 400 }}>{label}</span>
                      <input type="number" value={Math.round(selectedEl[key])} onChange={e => updateEl(selectedEl.id, { [key]: Number(e.target.value) })} className="apple-input" style={{ textAlign: 'left', padding: '6px 10px' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Controles de Posicionamento Rápido */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => updateEl(selectedEl.id, { x: 0, y: 0, largura: CANVAS_W, altura: CANVAS_H })} className="apple-btn-secondary" style={{ flex: 1, fontSize: 12, padding: '8px' }}>
                  Preencher Total
                </button>
                <button onClick={() => updateEl(selectedEl.id, { x: Math.max(0, Math.floor((CANVAS_W - selectedEl.largura) / 2)), y: Math.max(0, Math.floor((CANVAS_H - selectedEl.altura) / 2)) })} className="apple-btn-secondary" style={{ flex: 1, fontSize: 12, padding: '8px' }}>
                  Centralizar
                </button>
              </div>

              <div style={{ height: '1px', background: '#e8e8ed', marginTop: 8 }} />

              <button onClick={() => removeEl(selectedEl.id)} className="apple-btn-danger">
                <IconTrash /> Remover Elemento
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#86868b', marginTop: 60, fontSize: 13, lineHeight: 1.6, padding: '0 12px' }}>
              Selecione qualquer elemento posicionado no palco central para inspecionar e alterar suas diretrizes de estilo.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}