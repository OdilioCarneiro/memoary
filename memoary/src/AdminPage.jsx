import { useState, useEffect, useCallback, useRef } from 'react';
import { Rnd } from 'react-rnd';
import './AdminPage.css';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://memoary.onrender.com';

const gerarId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

const CANVAS_W = 420;
const CANVAS_H = 660;

export default function AdminPage() {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activePage, setActivePage] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [spreadPagePosition, setSpreadPagePosition] = useState('right');
  const fileInputRef = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const uploadToCloudinary = useCallback(async (file) => {
    const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloud || !preset) {
      showToast('Cloudinary não está configurado (VITE variables).', 'error');
      return null;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);
    try {
      setUploading(true);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/upload`, { method: 'POST', body: fd });
      const json = await res.json();
      if (json.secure_url) return json.secure_url;
      const message = json.error?.message || 'Erro no upload para Cloudinary';
      showToast(`Cloudinary: ${message}`, 'error');
      return null;
    } catch (e) {
      showToast('Erro de conexão no upload', 'error');
      return null;
    } finally { setUploading(false); }
  }, [showToast]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/anuario`);
        const json = await res.json();
        if (json.success) {
          let pagesData = json.data;
          if (pagesData.length % 2 === 1) {
            const res2 = await fetch(`${API_URL}/api/anuario/nova-pagina`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lado: 'direita' }),
            });
            const json2 = await res2.json();
            if (json2.success) pagesData = [...pagesData, json2.data];
          }
          setPages(pagesData);
        }
      } catch (e) {
        showToast('Erro ao carregar páginas', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [showToast]);

  const handleNovaPagina = async () => {
    try {
      const [resL, resR] = await Promise.all([
        fetch(`${API_URL}/api/anuario/nova-pagina`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lado: 'esquerda' }),
        }),
        fetch(`${API_URL}/api/anuario/nova-pagina`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lado: 'direita' }),
        }),
      ]);
      const [jsonL, jsonR] = await Promise.all([resL.json(), resR.json()]);
      if (jsonL.success && jsonR.success) {
        const novas = [jsonL.data, jsonR.data];
        setPages(p => [...p, ...novas]);
        setActivePage(jsonL.data);
        setSpreadPagePosition('left');
        setSelectedId(null);
        showToast('Novo spread criado');
      }
    } catch (e) {
      showToast('Erro ao criar página', 'error');
    }
  };

  const handleExcluirPagina = async (id) => {
    if (!window.confirm('Remover esta página permanentemente?')) return;
    try {
      const res = await fetch(`${API_URL}/api/anuario/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setPages(p => p.filter(x => x._id !== id));
        if (activePage?._id === id) { setActivePage(null); setSelectedId(null); }
        showToast('Página removida');
      }
    } catch (e) {
      showToast('Erro ao excluir', 'error');
    }
  };

  const savePageToBackend = useCallback(async (pageToSave) => {
    if (!pageToSave || isSaving) return false;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/anuario/${pageToSave._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elementos: pageToSave.elementos,
          lado: pageToSave.lado,
        }),
      });
      const json = await res.json();
      if (json.success) { showToast('Alterações salvas'); return true; }
      showToast('Erro ao salvar', 'error');
      return false;
    } catch (e) {
      showToast('Erro de conexão', 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, showToast]);

  const salvarPagina = async () => {
    if (!activePage) return;
    await savePageToBackend(activePage);
  };

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

  const spreads = [];
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({
      idx: Math.floor(i / 2),
      left: pages[i] || null,
      right: pages[i + 1] || null,
    });
  }

  const handleSelectSpread = (spread, position) => {
    const page = position === 'left' ? spread.left : spread.right;
    if (!page) return;
    setActivePage(page);
    setSpreadPagePosition(position);
    setSelectedId(null);
  };

  const activeSpread = spreads.find(
    s => s.left?._id === activePage?._id || s.right?._id === activePage?._id
  ) || null;

  const handleSwitchSide = (position) => {
    if (!activeSpread) return;
    handleSelectSpread(activeSpread, position);
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading__inner">
          <div className="admin-loading__spinner" />
          <span className="admin-loading__text">Carregando editor</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-root">

      {toast && (
        <div className={`admin-toast admin-toast--${toast.type}`}>
          {toast.msg}
        </div>
      )}

      <aside className="admin-sidebar">
        <div className="admin-sidebar__header">
          <h2 className="admin-sidebar__title">Anuário</h2>
          <p className="admin-sidebar__subtitle">
            {pages.length} {pages.length === 1 ? 'página' : 'páginas'}
          </p>
        </div>

        <div className="admin-sidebar__actions">
          <button className="admin-btn-new" onClick={handleNovaPagina}>
            <span className="admin-btn-new__icon">+</span>
            Novo Spread
          </button>
        </div>

        <div className="admin-sidebar__list">
          {spreads.length === 0 && (
            <p className="admin-sidebar__empty">
              Nenhuma página ainda.<br />
              Crie a primeira para começar.
            </p>
          )}

          {spreads.map((spread) => {
            const isActiveLeft  = activePage?._id === spread.left?._id;
            const isActiveRight = activePage?._id === spread.right?._id;

            return (
              <div key={`spread-${spread.idx}`} className="admin-spread-card">

                <div
                  className={`admin-page-card${isActiveLeft ? ' admin-page-card--active' : ''}`}
                  onClick={() => handleSelectSpread(spread, 'left')}
                >
                  <div className="admin-page-card__thumb">
                    {spread.left?.elementos?.filter(e => e.tipo === 'imagem' && e.url).slice(0, 4).map(el => (
                      <img
                        key={el.id}
                        src={el.url}
                        alt=""
                        className="admin-page-card__thumb-img"
                        style={{
                          left:   `${(el.x       / CANVAS_W) * 100}%`,
                          top:    `${(el.y       / CANVAS_H) * 100}%`,
                          width:  `${(el.largura / CANVAS_W) * 100}%`,
                          height: `${(el.altura  / CANVAS_H) * 100}%`,
                        }}
                      />
                    ))}
                    {(!spread.left?.elementos || spread.left.elementos.length === 0) && (
                      <div className="admin-page-card__thumb-empty">
                        <div className="admin-page-card__thumb-empty-line" />
                      </div>
                    )}
                  </div>
                  <div className="admin-page-card__meta">
                    <div>
                      <span className="admin-page-card__label">← Esq</span>
                      <span className="admin-page-card__count">
                        {spread.left?.elementos?.length || 0} foto(s)
                      </span>
                    </div>
                    {spread.left && (
                      <button
                        className="admin-page-card__delete"
                        onClick={e => { e.stopPropagation(); handleExcluirPagina(spread.left._id); }}
                        title="Remover página"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className={`admin-page-card${isActiveRight ? ' admin-page-card--active' : ''}`}
                  onClick={() => handleSelectSpread(spread, 'right')}
                >
                  <div className="admin-page-card__thumb">
                    {spread.right?.elementos?.filter(e => e.tipo === 'imagem' && e.url).slice(0, 4).map(el => (
                      <img
                        key={el.id}
                        src={el.url}
                        alt=""
                        className="admin-page-card__thumb-img"
                        style={{
                          left:   `${(el.x       / CANVAS_W) * 100}%`,
                          top:    `${(el.y       / CANVAS_H) * 100}%`,
                          width:  `${(el.largura / CANVAS_W) * 100}%`,
                          height: `${(el.altura  / CANVAS_H) * 100}%`,
                        }}
                      />
                    ))}
                    {(!spread.right?.elementos || spread.right.elementos.length === 0) && (
                      <div className="admin-page-card__thumb-empty">
                        <div className="admin-page-card__thumb-empty-line" />
                      </div>
                    )}
                  </div>
                  <div className="admin-page-card__meta">
                    <div>
                      <span className="admin-page-card__label">Dir →</span>
                      <span className="admin-page-card__count">
                        {spread.right?.elementos?.length || 0} foto(s)
                      </span>
                    </div>
                    {spread.right && (
                      <button
                        className="admin-page-card__delete"
                        onClick={e => { e.stopPropagation(); handleExcluirPagina(spread.right._id); }}
                        title="Remover página"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </aside>

      <main className="admin-canvas">
        {activePage ? (
          <>
            <div className="admin-toolbar">
              <button className="admin-btn admin-btn--primary" onClick={addPhoto}>
                Adicionar Foto
              </button>

              {activeSpread && (
                <div style={{
                  display: 'flex', gap: 6, marginLeft: 12,
                  borderLeft: '1px solid rgba(200,170,105,0.25)', paddingLeft: 12,
                }}>
                  <button
                    onClick={() => handleSwitchSide('left')}
                    disabled={!activeSpread.left}
                    style={{
                      padding: '6px 14px', fontSize: 12, fontWeight: 600,
                      borderRadius: 4, border: '1px solid #C8AA69', cursor: 'pointer',
                      background: spreadPagePosition === 'left' ? '#C8AA69' : 'transparent',
                      color:      spreadPagePosition === 'left' ? '#fff'    : '#8b8679',
                      transition: 'all 0.18s',
                      opacity: activeSpread.left ? 1 : 0.35,
                    }}
                  >
                    ← Esquerda
                  </button>
                  <button
                    onClick={() => handleSwitchSide('right')}
                    disabled={!activeSpread.right}
                    style={{
                      padding: '6px 14px', fontSize: 12, fontWeight: 600,
                      borderRadius: 4, border: '1px solid #C8AA69', cursor: 'pointer',
                      background: spreadPagePosition === 'right' ? '#C8AA69' : 'transparent',
                      color:      spreadPagePosition === 'right' ? '#fff'    : '#8b8679',
                      transition: 'all 0.18s',
                      opacity: activeSpread.right ? 1 : 0.35,
                    }}
                  >
                    Direita →
                  </button>
                </div>
              )}

              <div className="admin-toolbar__spacer" />

              <span className="admin-toolbar__info">
                {spreadPagePosition === 'left' ? '← Esquerda' : 'Direita →'}
                {' · '}
                {activePage.elementos?.length || 0} elemento(s)
              </span>

              <button
                className="admin-btn admin-btn--save"
                onClick={salvarPagina}
                disabled={isSaving}
              >
                {isSaving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>

            <div className="admin-canvas__scroll">
              <div
                className="admin-stage"
                style={{ width: CANVAS_W, height: CANVAS_H }}
                onClick={() => setSelectedId(null)}
              >
                <div className="admin-stage__spine-shadow" />
                <div className="admin-stage__guide" />

                {(!activePage.elementos || activePage.elementos.length === 0) && (
                  <div className="admin-stage__empty">
                    <div className="admin-stage__empty-icon">
                      <div className="admin-stage__empty-dot" />
                    </div>
                    <p className="admin-stage__empty-text">
                      Clique em "Adicionar Foto"<br />para montar a página
                    </p>
                  </div>
                )}

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
                      border: selectedId === el.id ? '2px solid #C8AA69' : '2px solid transparent',
                      cursor: 'move',
                      boxShadow: selectedId === el.id ? '0 0 0 4px rgba(200,170,105,0.18)' : 'none',
                      borderRadius: 4,
                      transition: 'box-shadow 0.15s, border-color 0.15s',
                    }}
                  >
                    {el.url ? (
                      <img
                        src={el.url}
                        alt="Foto"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 2, pointerEvents: 'none' }}
                        draggable={false}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%', background: '#f0ece0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: 8, borderRadius: 2,
                        border: '1.5px dashed rgba(200,170,105,0.35)',
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          border: '1.5px solid rgba(200,170,105,0.4)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(200,170,105,0.4)' }} />
                        </div>
                        <span style={{ fontSize: 10, color: '#b0ab9e', textAlign: 'center', padding: '0 8px', lineHeight: 1.4 }}>
                          Cole a URL no painel lateral
                        </span>
                      </div>
                    )}
                    {el.legenda && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(255,255,255,0.9)', padding: '5px 8px',
                        fontSize: 10, fontFamily: "'Cormorant Garamond', serif",
                        color: 'rgba(50,42,24,0.7)', textAlign: 'center', letterSpacing: '0.04em',
                      }}>
                        {el.legenda}
                      </div>
                    )}
                  </Rnd>
                ))}
              </div>

              <p className="admin-stage__caption">
                {spreadPagePosition === 'left' ? '← Esquerda' : 'Direita →'}
                {' · '}{CANVAS_W} × {CANVAS_H} px · Proporção A5
              </p>
            </div>
          </>
        ) : (
          <div className="admin-canvas__placeholder">
            <div className="admin-canvas__placeholder-icon">
              <div className="admin-canvas__placeholder-line" />
            </div>
            <p className="admin-canvas__placeholder-text">
              Selecione uma página na barra lateral
              <span>ou crie um novo spread para começar</span>
            </p>
          </div>
        )}
      </main>

      <aside className="admin-properties">
        <div className="admin-properties__header">
          <h3 className="admin-properties__title">Propriedades</h3>
        </div>

        <div className="admin-properties__body">
          {selectedEl ? (
            <div className="admin-field">
              {selectedEl.url && (
                <div className="admin-preview">
                  <img src={selectedEl.url} alt="" />
                </div>
              )}

              <div className="admin-field-group">
                <label className="admin-label" style={{ display: 'block', marginBottom: 6 }}>
                  URL da Imagem
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="https://..."
                    value={selectedEl.url}
                    onChange={e => updateEl(selectedEl.id, { url: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const f = e.target.files && e.target.files[0];
                      if (!f) return;
                      const url = await uploadToCloudinary(f);
                      if (url) {
                        updateEl(selectedEl.id, { url });
                        await savePageToBackend({
                          ...activePage,
                          elementos: activePage.elementos.map(el =>
                            el.id === selectedEl.id ? { ...el, url } : el
                          ),
                        });
                      }
                      e.target.value = null;
                    }}
                  />
                  <button
                    className="admin-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Enviando…' : 'Upload'}
                  </button>
                </div>
                <small style={{ display: 'block', marginTop: 6, color: '#8b8679' }}>
                  Ou cole uma URL. Configure <strong>VITE_CLOUDINARY_CLOUD_NAME</strong> e <strong>VITE_CLOUDINARY_UPLOAD_PRESET</strong> para upload direto.
                </small>
              </div>

              <div className="admin-field-group">
                <label className="admin-label">Legenda</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Ex: Formatura 2024"
                  value={selectedEl.legenda || ''}
                  onChange={e => updateEl(selectedEl.id, { legenda: e.target.value })}
                />
              </div>

              <div className="admin-divider" />

              <div className="admin-field-group">
                <label className="admin-label">Posição & Tamanho</label>
                <div className="admin-grid-2">
                  {[
                    { label: 'X', key: 'x' },
                    { label: 'Y', key: 'y' },
                    { label: 'Largura', key: 'largura' },
                    { label: 'Altura', key: 'altura' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <span className="admin-grid-label">{label}</span>
                      <input
                        type="number"
                        className="admin-input admin-input--number"
                        value={Math.round(selectedEl[key])}
                        onChange={e => updateEl(selectedEl.id, { [key]: Number(e.target.value) })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-quick-actions">
                <button
                  className="admin-btn-quick"
                  onClick={() => updateEl(selectedEl.id, { x: 0, y: 0, largura: CANVAS_W, altura: CANVAS_H })}
                >
                  Página Inteira
                </button>
                <button
                  className="admin-btn-quick"
                  onClick={() => updateEl(selectedEl.id, {
                    x: Math.max(0, Math.floor((CANVAS_W - selectedEl.largura) / 2)),
                    y: Math.max(0, Math.floor((CANVAS_H - selectedEl.altura)  / 2)),
                  })}
                >
                  Centralizar
                </button>
              </div>

              <div className="admin-divider" />

              <button className="admin-btn-delete" onClick={() => removeEl(selectedEl.id)}>
                Remover Foto
              </button>
            </div>
          ) : (
            <p className="admin-properties__empty">
              Selecione um elemento no palco para editar suas propriedades
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}