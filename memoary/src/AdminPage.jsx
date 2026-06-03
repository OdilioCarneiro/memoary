import { useState, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://memoary.onrender.com';

const gerarId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

/* =====================================================
   CONSTANTES DE LAYOUT
   ===================================================== */
const CANVAS_W = 420;
const CANVAS_H = 660;

/* =====================================================
   ADMIN PAGE
   ===================================================== */
export default function AdminPage() {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activePage, setActivePage] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null); // { msg, type: 'success'|'error' }

  /* ---------- toast helper ---------- */
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ---------- carregar páginas ---------- */
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

  /* ---------- nova página ---------- */
  const handleNovaPagina = async () => {
    try {
      const res = await fetch(`${API_URL}/api/anuario/nova-pagina`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setPages(p => [...p, json.data]);
        setActivePage(json.data);
        setSelectedId(null);
        showToast('Página criada!');
      }
    } catch (e) {
      showToast('Erro ao criar página', 'error',{e});
    }
  };

  /* ---------- excluir página ---------- */
  const handleExcluirPagina = async (id) => {
    if (!window.confirm('Deletar esta página permanentemente?')) return;
    try {
      const res = await fetch(`${API_URL}/api/anuario/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setPages(p => p.filter(x => x._id !== id));
        if (activePage?._id === id) { setActivePage(null); setSelectedId(null); }
        showToast('Página excluída');
      }
    } catch (e) {
      showToast('Erro ao excluir', 'error' ,{e});
    }
  };

  /* ---------- salvar página ---------- */
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
      if (json.success) showToast('Página salva com sucesso! 🎉');
      else showToast('Erro ao salvar no servidor', 'error');
    } catch (e) {
      showToast('Erro de conexão', 'error',{e});
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------- helpers de estado local ---------- */
  const updateActiveLocal = useCallback((newElements) => {
    const updated = { ...activePage, elementos: newElements };
    setActivePage(updated);
    setPages(p => p.map(x => x._id === updated._id ? updated : x));
  }, [activePage]);

  const addPhoto = () => {
    const el = {
      id: gerarId(), tipo: 'imagem',
      url: '', x: 60, y: 60,
      largura: 280, altura: 200, legenda: ''
    };
    updateActiveLocal([...(activePage.elementos || []), el]);
    setSelectedId(el.id);
  };

  const updateEl = (id, data) => {
    updateActiveLocal(activePage.elementos.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const removeEl = (id) => {
    updateActiveLocal(activePage.elementos.filter(e => e.id !== id));
    setSelectedId(null);
  };

  const selectedEl = activePage?.elementos?.find(e => e.id === selectedId) || null;

  /* =====================================================
     RENDER
     ===================================================== */
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 75px)', fontFamily: 'Teachers, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#8b8984' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📖</div>
          <p>Carregando editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 75px)', fontFamily: "'Teachers', sans-serif", background: 'var(--cor-fundo)', position: 'relative' }}>

      {/* ===== TOAST ===== */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#c62828' : '#2e7d32',
          color: '#fff', padding: '12px 28px', borderRadius: 30, zIndex: 9999,
          fontWeight: 600, fontSize: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          animation: 'slideDown 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ===== SIDEBAR ESQUERDA: LISTA DE PÁGINAS ===== */}
      <aside style={{
        width: 260, background: '#fff', borderRight: '1px solid #ede9e0',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #ede9e0' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cor-texto)', marginBottom: 4 }}>Páginas do Anuário</h2>
          <p style={{ fontSize: 12, color: '#9b9790' }}>{pages.length} {pages.length === 1 ? 'página' : 'páginas'}</p>
        </div>

        <div style={{ padding: '16px 16px 8px' }}>
          <button onClick={handleNovaPagina}
            style={{
              width: '100%', padding: '11px', background: 'var(--cor-destaque)',
              color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700,
              cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
              transition: 'all 0.2s', letterSpacing: '0.02em',
            }}
            onMouseEnter={e => e.target.style.background = '#a88a45'}
            onMouseLeave={e => e.target.style.background = 'var(--cor-destaque)'}
          >
            + Nova Página
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pages.length === 0 && (
            <p style={{ textAlign: 'center', color: '#c0bbb4', fontSize: 13, marginTop: 40 }}>Nenhuma página ainda</p>
          )}
          {pages.map((page, idx) => {
            const isActive = activePage?._id === page._id;
            return (
              <div key={page._id}
                onClick={() => { setActivePage(page); setSelectedId(null); }}
                style={{
                  padding: '13px 14px', background: isActive ? '#fdf5e4' : '#f9f8f5',
                  border: `1.5px solid ${isActive ? 'var(--cor-destaque)' : '#ede9e0'}`,
                  borderRadius: 8, cursor: 'pointer', position: 'relative',
                  transition: 'all 0.18s',
                }}
              >
                {/* Miniatura da página */}
                <div style={{
                  width: '100%', height: 80, background: '#f0ece0',
                  borderRadius: 4, marginBottom: 10, overflow: 'hidden',
                  position: 'relative', border: '1px solid #e5e0d5',
                }}>
                  {page.elementos?.filter(e => e.tipo === 'imagem' && e.url).slice(0, 4).map(el => (
                    <img key={el.id} src={el.url} alt=""
                      style={{
                        position: 'absolute',
                        left: `${(el.x / CANVAS_W) * 100}%`,
                        top: `${(el.y / CANVAS_H) * 100}%`,
                        width: `${(el.largura / CANVAS_W) * 100}%`,
                        height: `${(el.altura / CANVAS_H) * 100}%`,
                        objectFit: 'cover',
                      }}
                    />
                  ))}
                  {(!page.elementos || page.elementos.length === 0) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#c0bbb4', fontSize: 22 }}>
                      +
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--cor-texto)' }}>Página {idx + 1}</span>
                    <span style={{ display: 'block', fontSize: 11, color: '#9b9790', marginTop: 1 }}>
                      {page.elementos?.length || 0} foto{page.elementos?.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleExcluirPagina(page._id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#c62828', opacity: 0.6, padding: 4, borderRadius: 4 }}
                    title="Excluir página"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ===== CANVAS CENTRAL ===== */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#e8e4da', overflow: 'auto' }}>
        {activePage ? (
          <>
            {/* Toolbar */}
            <div style={{
              width: '100%', padding: '14px 24px', background: '#fff',
              borderBottom: '1px solid #ede9e0', display: 'flex', gap: 10, alignItems: 'center',
              position: 'sticky', top: 0, zIndex: 10,
            }}>
              <button onClick={addPhoto}
                style={toolbarBtn('#322A18', '#fff')}>
                🖼️ Adicionar Foto
              </button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: '#9b9790' }}>
                {activePage.elementos?.length || 0} elemento{activePage.elementos?.length !== 1 ? 's' : ''}
              </span>
              <button onClick={salvarPagina} disabled={isSaving}
                style={toolbarBtn('#2e7d32', '#fff', isSaving)}>
                {isSaving ? 'Salvando...' : '💾 Salvar'}
              </button>
            </div>

            {/* Área de scroll do canvas */}
            <div style={{ padding: '40px 20px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%' }}>
              {/* O Palco — exatamente as dimensões do livro */}
              <div
                onClick={() => setSelectedId(null)}
                style={{
                  width: CANVAS_W, height: CANVAS_H,
                  background: '#fefcf8',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.08)',
                  position: 'relative', overflow: 'hidden',
                  borderRadius: '3px 8px 8px 3px',
                  backgroundImage: `
                    linear-gradient(to right, #c8c3b5 0%, #e8e4d8 2%, #f8f6f2 4%, #fefcf8 100%)
                  `,
                  cursor: 'default',
                  flexShrink: 0,
                }}
              >
                {/* Linha de guia da lombada */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 28,
                  background: 'linear-gradient(to right, rgba(0,0,0,0.08), transparent)',
                  pointerEvents: 'none', zIndex: 1,
                }} />

                {/* Linha de guia do topo/rodapé */}
                <div style={{
                  position: 'absolute', inset: '24px', border: '1px dashed rgba(200,170,105,0.25)',
                  borderRadius: 2, pointerEvents: 'none', zIndex: 1,
                }} />

                {(!activePage.elementos || activePage.elementos.length === 0) && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 12, pointerEvents: 'none',
                  }}>
                    <span style={{ fontSize: 40, opacity: 0.15 }}>📷</span>
                    <p style={{ fontSize: 13, color: '#b0ab9e', textAlign: 'center', lineHeight: 1.5 }}>
                      Clique em "Adicionar Foto"<br />para começar a montar a página
                    </p>
                  </div>
                )}

                {/* ELEMENTOS ARRASTÁVEIS */}
                {activePage.elementos?.map(el => (
                  <Rnd
                    key={el.id}
                    bounds="parent"
                    size={{ width: el.largura, height: el.altura }}
                    position={{ x: el.x, y: el.y }}
                    onDragStop={(_, d) => updateEl(el.id, { x: d.x, y: d.y })}
                    onResizeStop={(_, __, ref, ___, pos) => updateEl(el.id, {
                      largura: parseInt(ref.style.width),
                      altura: parseInt(ref.style.height),
                      ...pos,
                    })}
                    onClick={e => { e.stopPropagation(); setSelectedId(el.id); }}
                    style={{
                      border: selectedId === el.id
                        ? '2px solid var(--cor-destaque)'
                        : '2px solid transparent',
                      cursor: 'move',
                      boxShadow: selectedId === el.id
                        ? '0 0 0 3px rgba(200,170,105,0.25)'
                        : 'none',
                      borderRadius: 4,
                      transition: 'box-shadow 0.15s',
                    }}
                  >
                    {el.url ? (
                      <img src={el.url} alt="Foto"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 2, pointerEvents: 'none' }}
                        draggable={false}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%', background: '#f0ece0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: 6, borderRadius: 2,
                      }}>
                        <span style={{ fontSize: 24, opacity: 0.4 }}>🖼️</span>
                        <span style={{ fontSize: 10, color: '#b0ab9e', textAlign: 'center', padding: '0 8px', lineHeight: 1.4 }}>
                          Cole a URL da imagem no painel ao lado
                        </span>
                      </div>
                    )}
                    {el.legenda && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(255,255,255,0.88)', padding: '4px 6px',
                        fontSize: 10, color: '#555', textAlign: 'center',
                        backdropFilter: 'blur(4px)',
                      }}>
                        {el.legenda}
                      </div>
                    )}
                  </Rnd>
                ))}
              </div>

              <p style={{ marginTop: 16, fontSize: 11, color: '#b0ab9e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {CANVAS_W} × {CANVAS_H} px — Proporção A5
              </p>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#b0ab9e' }}>
            <span style={{ fontSize: 48, opacity: 0.3 }}>📖</span>
            <p style={{ fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
              Selecione uma página na barra lateral<br />
              ou crie uma nova para começar
            </p>
          </div>
        )}
      </main>

      {/* ===== PAINEL DE PROPRIEDADES ===== */}
      <aside style={{
        width: 260, background: '#fff', borderLeft: '1px solid #ede9e0',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #ede9e0' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--cor-texto)' }}>
            {selectedEl ? 'Propriedades da Foto' : 'Propriedades'}
          </h3>
        </div>

        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          {selectedEl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Preview da imagem */}
              {selectedEl.url && (
                <div style={{ width: '100%', height: 120, borderRadius: 6, overflow: 'hidden', background: '#f0ece0', border: '1px solid #ede9e0' }}>
                  <img src={selectedEl.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              <div>
                <label style={labelStyle}>URL da Imagem</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={selectedEl.url}
                  onChange={e => updateEl(selectedEl.id, { url: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Legenda</label>
                <input
                  type="text"
                  placeholder="Ex: Formatura 2024"
                  value={selectedEl.legenda || ''}
                  onChange={e => updateEl(selectedEl.id, { legenda: e.target.value })}
                  style={inputStyle}
                />
              </div>

              {/* Posição e dimensões */}
              <div>
                <label style={labelStyle}>Posição & Tamanho</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'X', key: 'x' },
                    { label: 'Y', key: 'y' },
                    { label: 'Largura', key: 'largura' },
                    { label: 'Altura', key: 'altura' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <span style={{ fontSize: 10, color: '#9b9790', display: 'block', marginBottom: 3 }}>{label}</span>
                      <input
                        type="number"
                        value={Math.round(selectedEl[key])}
                        onChange={e => updateEl(selectedEl.id, { [key]: Number(e.target.value) })}
                        style={{ ...inputStyle, textAlign: 'center', padding: '6px 4px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões de ação rápida */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => updateEl(selectedEl.id, { x: 0, y: 0, largura: CANVAS_W, altura: CANVAS_H })}
                  style={{ flex: 1, padding: '8px 4px', background: '#f5f0e8', color: 'var(--cor-texto)', border: '1px solid #ede9e0', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}
                >
                  Página Inteira
                </button>
                <button
                  onClick={() => updateEl(selectedEl.id, { x: Math.max(0, Math.floor((CANVAS_W - selectedEl.largura) / 2)), y: Math.max(0, Math.floor((CANVAS_H - selectedEl.altura) / 2)) })}
                  style={{ flex: 1, padding: '8px 4px', background: '#f5f0e8', color: 'var(--cor-texto)', border: '1px solid #ede9e0', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}
                >
                  Centralizar
                </button>
              </div>

              <button
                onClick={() => removeEl(selectedEl.id)}
                style={{ width: '100%', padding: '10px', background: '#fff5f5', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', marginTop: 8 }}
              >
                Excluir Foto
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#c0bbb4', marginTop: 60, lineHeight: 1.6, fontSize: 13 }}>
              Clique em uma foto no palco para editar suas propriedades
            </div>
          )}
        </div>
      </aside>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* =====================================================
   ESTILOS UTILITÁRIOS
   ===================================================== */
const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#9b9790',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '9px 10px',
  border: '1.5px solid #ede9e0',
  borderRadius: 6,
  fontSize: 13,
  fontFamily: 'inherit',
  color: 'var(--cor-texto)',
  background: '#faf8f5',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const toolbarBtn = (bg, color, disabled = false) => ({
  padding: '9px 18px',
  background: disabled ? '#ccc' : bg,
  color,
  border: 'none',
  borderRadius: 6,
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 13,
  fontFamily: 'inherit',
  transition: 'all 0.2s',
  opacity: disabled ? 0.7 : 1,
});
