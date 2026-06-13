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

/* =====================================================
   ADMIN PAGE
   ===================================================== */
export default function AdminPage() {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activePage, setActivePage] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
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
      console.error('Cloudinary upload error', json);
      const message = json.error?.message || 'Erro no upload para Cloudinary';
      showToast(`Cloudinary: ${message}`, 'error');
      return null;
    } catch (e) {
      console.error('Cloudinary upload exception', e);
      showToast('Erro de conexão no upload', 'error');
      return null;
    } finally { setUploading(false); }
  }, [showToast]);

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
      showToast('Erro ao criar página', 'error', {e});
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
      showToast('Erro ao excluir', 'error', {e});
    }
  };

  const savePageToBackend = useCallback(async (pageToSave) => {
    if (!pageToSave || isSaving) return false;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/anuario/${pageToSave._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementos: pageToSave.elementos }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Alterações salvas');
        return true;
      }
      showToast('Erro ao salvar', 'error');
      return false;
    } catch (e) {
      showToast('Erro de conexão', 'error', { e });
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

  /* ===================================================
     LOADING
     =================================================== */
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

  /* ===================================================
     RENDER PRINCIPAL
     =================================================== */
  return (
    <div className="admin-root">

      {/* TOAST */}
      {toast && (
        <div className={`admin-toast admin-toast--${toast.type}`}>
          {toast.msg}
        </div>
      )}

      {/* SIDEBAR — LISTA DE PÁGINAS */}
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
            Nova Página
          </button>
        </div>

        <div className="admin-sidebar__list">
          {pages.length === 0 && (
            <p className="admin-sidebar__empty">
              Nenhuma página ainda.<br />
              Crie a primeira para começar.
            </p>
          )}

          {pages.map((page, idx) => {
            const isActive = activePage?._id === page._id;
            return (
              <div
                key={page._id}
                className={`admin-page-card${isActive ? ' admin-page-card--active' : ''}`}
                onClick={() => { setActivePage(page); setSelectedId(null); }}
              >
                {/* Miniatura */}
                <div className="admin-page-card__thumb">
                  {page.elementos?.filter(e => e.tipo === 'imagem' && e.url).slice(0, 4).map(el => (
                    <img
                      key={el.id}
                      src={el.url}
                      alt=""
                      className="admin-page-card__thumb-img"
                      style={{
                        left: `${(el.x / CANVAS_W) * 100}%`,
                        top: `${(el.y / CANVAS_H) * 100}%`,
                        width: `${(el.largura / CANVAS_W) * 100}%`,
                        height: `${(el.altura / CANVAS_H) * 100}%`,
                      }}
                    />
                  ))}
                  {(!page.elementos || page.elementos.length === 0) && (
                    <div className="admin-page-card__thumb-empty">
                      <div className="admin-page-card__thumb-empty-line" />
                    </div>
                  )}
                </div>

                <div className="admin-page-card__meta">
                  <div>
                    <span className="admin-page-card__label">Página {idx + 1}</span>
                    <span className="admin-page-card__count">
                      {page.elementos?.length || 0} {(page.elementos?.length !== 1) ? 'fotos' : 'foto'}
                    </span>
                  </div>
                  <button
                    className="admin-page-card__delete"
                    onClick={e => { e.stopPropagation(); handleExcluirPagina(page._id); }}
                    title="Remover página"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* CANVAS CENTRAL */}
      <main className="admin-canvas">
        {activePage ? (
          <>
            {/* Toolbar */}
            <div className="admin-toolbar">
              <button className="admin-btn admin-btn--primary" onClick={addPhoto}>
                Adicionar Foto
              </button>
              <div className="admin-toolbar__spacer" />
              <span className="admin-toolbar__info">
                {activePage.elementos?.length || 0} elemento{activePage.elementos?.length !== 1 ? 's' : ''}
              </span>
              <button className="admin-btn admin-btn--save" onClick={salvarPagina} disabled={isSaving}>
                {isSaving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>

            {/* Scroll area */}
            <div className="admin-canvas__scroll">
              {/* O Palco */}
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
                        ? '2px solid #C8AA69'
                        : '2px solid transparent',
                      cursor: 'move',
                      boxShadow: selectedId === el.id
                        ? '0 0 0 4px rgba(200,170,105,0.18)'
                        : 'none',
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
                        width: '100%', height: '100%',
                        background: '#f0ece0',
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
                        <span style={{ fontSize: 10, color: '#b0ab9e', textAlign: 'center', padding: '0 8px', lineHeight: 1.4, letterSpacing: '0.03em' }}>
                          Cole a URL no painel lateral
                        </span>
                      </div>
                    )}
                    {el.legenda && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(255,255,255,0.9)',
                        padding: '5px 8px',
                        fontSize: 10,
                        fontFamily: "'Cormorant Garamond', serif",
                        color: 'rgba(50,42,24,0.7)',
                        textAlign: 'center',
                        letterSpacing: '0.04em',
                      }}>
                        {el.legenda}
                      </div>
                    )}
                  </Rnd>
                ))}
              </div>

              <p className="admin-stage__caption">
                {CANVAS_W} × {CANVAS_H} px — Proporção A5
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
              <span>ou crie uma nova para começar</span>
            </p>
          </div>
        )}
      </main>

      {/* PAINEL DE PROPRIEDADES */}
      <aside className="admin-properties">
        <div className="admin-properties__header">
          <h3 className="admin-properties__title">
            {selectedEl ? 'Propriedades' : 'Propriedades'}
          </h3>
        </div>

        <div className="admin-properties__body">
          {selectedEl ? (
            <div className="admin-field">
              {/* Preview */}
              {selectedEl.url && (
                <div className="admin-preview">
                  <img src={selectedEl.url} alt="" />
                </div>
              )}

              {/* URL */}
              <div className="admin-field-group">
                <label className="admin-label" style={{ display: 'block', marginBottom: 6 }}>URL da Imagem</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="https://..."
                    value={selectedEl.url}
                    onChange={e => updateEl(selectedEl.id, { url: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    const url = await uploadToCloudinary(f);
                    if (url) {
                      updateEl(selectedEl.id, { url });
                      // salva imediatamente a página quando o upload terminar
                      await savePageToBackend({ ...activePage, elementos: activePage.elementos.map(el => el.id === selectedEl.id ? { ...el, url } : el) });
                    }
                    e.target.value = null;
                  }} />
                  <button className="admin-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Enviar do dispositivo">
                    {uploading ? 'Enviando…' : 'Upload'}
                  </button>
                </div>
                <small style={{ display: 'block', marginTop: 6, color: '#8b8679' }}>
                  Ou cole uma URL. Para upload direto, configure <strong>VITE_CLOUDINARY_CLOUD_NAME</strong> e <strong>VITE_CLOUDINARY_UPLOAD_PRESET</strong>.
                </small>
              </div>

              {/* Legenda */}
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

              {/* Posição & Tamanho */}
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

              {/* Ações rápidas */}
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
                    y: Math.max(0, Math.floor((CANVAS_H - selectedEl.altura) / 2))
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
