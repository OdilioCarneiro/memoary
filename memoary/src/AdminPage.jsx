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

/* ─────────────────────────────────────────────
   MINI THUMB — renderiza fotos em miniatura
───────────────────────────────────────────────*/
function PageThumb({ page }) {
  const els = page?.elementos?.filter(e => e.tipo === 'imagem' && e.url).slice(0, 6) || [];
  return (
    <div className="admin-page-card__thumb">
      {els.map(el => (
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
      {els.length === 0 && (
        <div className="admin-page-card__thumb-empty">
          <div className="admin-page-card__thumb-empty-line" />
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [pages,        setPages]        = useState([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSaving,     setIsSaving]     = useState(false);
  const [activeSpreadIdx, setActiveSpreadIdx] = useState(null);
  // selectedId: id do elemento selecionado, prefixado com side: 'left:uuid' | 'right:uuid'
  const [selectedKey,  setSelectedKey]  = useState(null);
  const [toast,        setToast]        = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const fileInputRef = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ── Cloudinary upload ── */
  const uploadToCloudinary = useCallback(async (file) => {
    const cloud  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloud || !preset) { showToast('Cloudinary não configurado.', 'error'); return null; }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);
    try {
      setUploading(true);
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/upload`, { method: 'POST', body: fd });
      const json = await res.json();
      if (json.secure_url) return json.secure_url;
      showToast(`Cloudinary: ${json.error?.message || 'Erro no upload'}`, 'error');
      return null;
    } catch { showToast('Erro de conexão no upload', 'error'); return null; }
    finally { setUploading(false); }
  }, [showToast]);

  /* ── Load ── */
  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`${API_URL}/api/anuario`);
        const json = await res.json();
        if (json.success) {
          let data = json.data;
          // Garante par
          if (data.length % 2 === 1) {
            const r2   = await fetch(`${API_URL}/api/anuario/nova-pagina`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lado: 'direita' }),
            });
            const j2 = await r2.json();
            if (j2.success) data = [...data, j2.data];
          }
          setPages(data);
        }
      } catch { showToast('Erro ao carregar páginas', 'error'); }
      finally  { setIsLoading(false); }
    }
    load();
  }, [showToast]);

  /* ── Spreads derivados ── */
  const spreads = [];
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({ idx: Math.floor(i / 2), left: pages[i] || null, right: pages[i + 1] || null });
  }

  const activeSpread = activeSpreadIdx !== null ? spreads[activeSpreadIdx] ?? null : null;
  const leftPage     = activeSpread?.left  ?? null;
  const rightPage    = activeSpread?.right ?? null;

  /* ── selectedEl derivado ── */
  const [selSide, selId] = selectedKey ? selectedKey.split(':') : [null, null];
  const selectedEl = selSide === 'left'
    ? leftPage?.elementos?.find(e => e.id === selId)  ?? null
    : rightPage?.elementos?.find(e => e.id === selId) ?? null;

  /* ── Helpers de state ── */
  const updatePage = useCallback((side, newEls) => {
    setPages(prev => {
      const updated = prev.map(p => {
        const target = side === 'left' ? leftPage : rightPage;
        return (target && p._id === target._id) ? { ...p, elementos: newEls } : p;
      });
      return updated;
    });
  }, [leftPage, rightPage]);

  const getPage = (side) => side === 'left' ? leftPage : rightPage;

  /* ── Criar spread ── */
  const handleNovaPagina = async () => {
    try {
      const [rL, rR] = await Promise.all([
        fetch(`${API_URL}/api/anuario/nova-pagina`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lado: 'esquerda' }),
        }),
        fetch(`${API_URL}/api/anuario/nova-pagina`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lado: 'direita' }),
        }),
      ]);
      const [jL, jR] = await Promise.all([rL.json(), rR.json()]);
      if (jL.success && jR.success) {
        const novas = [jL.data, jR.data];
        setPages(p => {
          const next = [...p, ...novas];
          const newIdx = Math.floor((next.length - 2) / 2);
          setTimeout(() => { setActiveSpreadIdx(newIdx); setSelectedKey(null); }, 0);
          return next;
        });
        showToast('Novo spread criado');
      }
    } catch { showToast('Erro ao criar spread', 'error'); }
  };

  /* ── Excluir página ── */
  const handleExcluirPagina = async (id) => {
    if (!window.confirm('Remover esta página permanentemente?')) return;
    try {
      const res  = await fetch(`${API_URL}/api/anuario/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setPages(p => p.filter(x => x._id !== id));
        setActiveSpreadIdx(null);
        setSelectedKey(null);
        showToast('Página removida');
      }
    } catch { showToast('Erro ao excluir', 'error'); }
  };

  /* ── Salvar ── */
  const savePage = useCallback(async (page) => {
    if (!page) return false;
    const res  = await fetch(`${API_URL}/api/anuario/${page._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elementos: page.elementos, lado: page.lado }),
    });
    const json = await res.json();
    return json.success;
  }, []);

  const salvarSpread = async () => {
    if (!activeSpread || isSaving) return;
    setIsSaving(true);
    try {
      // Pega versão mais recente do pages state
      const lp = pages.find(p => p._id === leftPage?._id)  ?? leftPage;
      const rp = pages.find(p => p._id === rightPage?._id) ?? rightPage;
      const [okL, okR] = await Promise.all([savePage(lp), savePage(rp)]);
      if (okL && okR) showToast('Spread salvo com sucesso!');
      else showToast('Erro ao salvar um dos lados', 'error');
    } catch { showToast('Erro de conexão', 'error'); }
    finally  { setIsSaving(false); }
  };

  /* ── Adicionar foto ── */
  const addPhoto = (side) => {
    const pg = getPage(side);
    if (!pg) return;
    const el = { id: gerarId(), tipo: 'imagem', url: '', x: 60, y: 60, largura: 280, altura: 200, legenda: '' };
    const newEls = [...(pg.elementos || []), el];
    updatePage(side, newEls);
    setSelectedKey(`${side}:${el.id}`);
  };

  /* ── Atualizar elemento ── */
  const updateEl = (side, id, data) => {
    const pg = getPage(side);
    if (!pg) return;
    updatePage(side, pg.elementos.map(e => e.id === id ? { ...e, ...data } : e));
  };

  /* ── Remover elemento ── */
  const removeEl = (side, id) => {
    const pg = getPage(side);
    if (!pg) return;
    updatePage(side, pg.elementos.filter(e => e.id !== id));
    setSelectedKey(null);
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

  /* ─────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────*/
  return (
    <div className="admin-root">

      {toast && (
        <div className={`admin-toast admin-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── SIDEBAR ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__header">
          <h2 className="admin-sidebar__title">Anuário</h2>
          <p className="admin-sidebar__subtitle">
            {spreads.length} {spreads.length === 1 ? 'spread' : 'spreads'} · {pages.length} páginas
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
            <p className="admin-sidebar__empty">Nenhuma página ainda.<br />Crie o primeiro spread.</p>
          )}

          {spreads.map((spread) => {
            const isActive = activeSpreadIdx === spread.idx;
            return (
              <div
                key={`spread-${spread.idx}`}
                className={`admin-spread-card${isActive ? ' admin-spread-card--active' : ''}`}
                onClick={() => { setActiveSpreadIdx(spread.idx); setSelectedKey(null); }}
                style={{ cursor: 'pointer' }}
              >
                {/* Miniatura do spread em linha */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  {/* Esquerda */}
                  <div style={{ flex: 1 }}>
                    <PageThumb page={spread.left} />
                  </div>
                  {/* Divisor */}
                  <div style={{ width: 2, background: 'var(--admin-border)', borderRadius: 1, flexShrink: 0 }} />
                  {/* Direita */}
                  <div style={{ flex: 1 }}>
                    <PageThumb page={spread.right} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span className="admin-page-card__label">Spread {spread.idx + 1}</span>
                    <span className="admin-page-card__count">
                      {(spread.left?.elementos?.length || 0) + (spread.right?.elementos?.length || 0)} foto(s)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {spread.left && (
                      <button
                        className="admin-page-card__delete"
                        onClick={e => { e.stopPropagation(); handleExcluirPagina(spread.left._id); }}
                        title="Remover página esquerda"
                      >×</button>
                    )}
                    {spread.right && (
                      <button
                        className="admin-page-card__delete"
                        onClick={e => { e.stopPropagation(); handleExcluirPagina(spread.right._id); }}
                        title="Remover página direita"
                      >×</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── CANVAS CENTRAL ── */}
      <main className="admin-canvas">
        {activeSpread ? (
          <>
            {/* Toolbar */}
            <div className="admin-toolbar">
              {/* Botões de adicionar foto em cada lado */}
              <button
                className="admin-btn admin-btn--primary"
                onClick={() => addPhoto('left')}
                disabled={!leftPage}
                title="Adicionar foto na página esquerda"
              >
                + Foto Esquerda
              </button>
              <button
                className="admin-btn admin-btn--primary"
                onClick={() => addPhoto('right')}
                disabled={!rightPage}
                title="Adicionar foto na página direita"
              >
                + Foto Direita
              </button>

              <div className="admin-toolbar__spacer" />

              <span className="admin-toolbar__info">
                Spread {activeSpreadIdx + 1}
                {' · '}
                {(leftPage?.elementos?.length || 0) + (rightPage?.elementos?.length || 0)} elemento(s)
              </span>

              <button
                className="admin-btn admin-btn--save"
                onClick={salvarSpread}
                disabled={isSaving}
              >
                {isSaving ? 'Salvando…' : 'Salvar Spread'}
              </button>
            </div>

            {/* Canvas de spread duplo */}
            <div className="admin-canvas__scroll">
              <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>

                {/* ── PÁGINA ESQUERDA ── */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    className="admin-stage admin-stage--left"
                    style={{
                      width: CANVAS_W, height: CANVAS_H,
                      borderRadius: '8px 0 0 8px',
                      background: 'linear-gradient(270deg, #bab4a4 0%, #d8d4c8 1.5%, #f5f2ec 3.5%, #fefcf8 100%)',
                      outline: selSide === 'left' ? '2px solid rgba(200,170,105,0.6)' : '2px solid transparent',
                      transition: 'outline 0.18s',
                    }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) { setSelectedKey(null); }
                    }}
                  >
                    <div className="admin-stage__guide" />
                    <div style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0, width: 30,
                      background: 'linear-gradient(to left, rgba(0,0,0,0.10), transparent)',
                      pointerEvents: 'none', zIndex: 1,
                    }} />

                    {(!leftPage?.elementos || leftPage.elementos.length === 0) && (
                      <div className="admin-stage__empty">
                        <div className="admin-stage__empty-icon">
                          <div className="admin-stage__empty-dot" />
                        </div>
                        <p className="admin-stage__empty-text">
                          Clique em "Foto Esquerda"<br />para montar esta página
                        </p>
                      </div>
                    )}

                    {leftPage?.elementos?.map(el => (
                      <SpreadElement
                        key={el.id}
                        el={el}
                        isSelected={selectedKey === `left:${el.id}`}
                        onSelect={() => { setSelectedKey(`left:${el.id}`); }}
                        onDragStop={(d) => updateEl('left', el.id, { x: d.x, y: d.y })}
                        onResizeStop={(ref, pos) => updateEl('left', el.id, {
                          largura: parseInt(ref.style.width),
                          altura:  parseInt(ref.style.height), ...pos,
                        })}
                      />
                    ))}
                  </div>
                  <p className="admin-stage__caption">← Esquerda · {CANVAS_W}×{CANVAS_H}px</p>
                </div>

                {/* Divisor central (lombada) */}
                <div style={{
                  width: 8, height: CANVAS_H, flexShrink: 0,
                  background: 'linear-gradient(to right, #8a8070, #c8c0b0, #8a8070)',
                  boxShadow: '0 0 18px rgba(0,0,0,0.22)',
                  zIndex: 2,
                }} />

                {/* ── PÁGINA DIREITA ── */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    className="admin-stage admin-stage--right"
                    style={{
                      width: CANVAS_W, height: CANVAS_H,
                      borderRadius: '0 8px 8px 0',
                      background: 'linear-gradient(90deg, #bab4a4 0%, #d8d4c8 1.5%, #f5f2ec 3.5%, #fefcf8 100%)',
                      outline: selSide === 'right' ? '2px solid rgba(200,170,105,0.6)' : '2px solid transparent',
                      transition: 'outline 0.18s',
                    }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) { setSelectedKey(null); }
                    }}
                  >
                    <div className="admin-stage__guide" />
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: 30,
                      background: 'linear-gradient(to right, rgba(0,0,0,0.10), transparent)',
                      pointerEvents: 'none', zIndex: 1,
                    }} />

                    {(!rightPage?.elementos || rightPage.elementos.length === 0) && (
                      <div className="admin-stage__empty">
                        <div className="admin-stage__empty-icon">
                          <div className="admin-stage__empty-dot" />
                        </div>
                        <p className="admin-stage__empty-text">
                          Clique em "Foto Direita"<br />para montar esta página
                        </p>
                      </div>
                    )}

                    {rightPage?.elementos?.map(el => (
                      <SpreadElement
                        key={el.id}
                        el={el}
                        isSelected={selectedKey === `right:${el.id}`}
                        onSelect={() => { setSelectedKey(`right:${el.id}`); }}
                        onDragStop={(d) => updateEl('right', el.id, { x: d.x, y: d.y })}
                        onResizeStop={(ref, pos) => updateEl('right', el.id, {
                          largura: parseInt(ref.style.width),
                          altura:  parseInt(ref.style.height), ...pos,
                        })}
                      />
                    ))}
                  </div>
                  <p className="admin-stage__caption">Direita → · {CANVAS_W}×{CANVAS_H}px</p>
                </div>

              </div>
              {/* Legenda geral */}
              <p style={{ marginTop: 10, fontSize: 10, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.65, textAlign: 'center' }}>
                Clique numa página para ativá-la, depois arraste as fotos livremente
              </p>
            </div>
          </>
        ) : (
          <div className="admin-canvas__placeholder">
            <div className="admin-canvas__placeholder-icon">
              <div className="admin-canvas__placeholder-line" />
            </div>
            <p className="admin-canvas__placeholder-text">
              Selecione um spread na barra lateral
              <span>ou crie um novo para começar</span>
            </p>
          </div>
        )}
      </main>

      {/* ── PAINEL DE PROPRIEDADES ── */}
      <aside className="admin-properties">
        <div className="admin-properties__header">
          <h3 className="admin-properties__title">Propriedades</h3>
          {selectedEl && (
            <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>
              {selSide === 'left' ? '← Página Esquerda' : 'Página Direita →'}
            </p>
          )}
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
                <label className="admin-label">URL da Imagem</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="https://..."
                    value={selectedEl.url}
                    onChange={e => updateEl(selSide, selId, { url: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await uploadToCloudinary(f);
                      if (url) {
                        updateEl(selSide, selId, { url });
                        // Auto-save após upload
                        const pg = getPage(selSide);
                        if (pg) {
                          const updatedPg = {
                            ...pg,
                            elementos: pg.elementos.map(el => el.id === selId ? { ...el, url } : el),
                          };
                          await savePage(updatedPg);
                          showToast('Foto enviada e salva!');
                        }
                      }
                      e.target.value = null;
                    }}
                  />
                  <button
                    className="admin-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}
                  >
                    {uploading ? 'Enviando…' : 'Upload'}
                  </button>
                </div>
                <small style={{ display: 'block', marginTop: 6, color: '#8b8679' }}>
                  Cole uma URL ou faça upload.
                </small>
              </div>

              <div className="admin-field-group">
                <label className="admin-label">Legenda</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Ex: Formatura 2024"
                  value={selectedEl.legenda || ''}
                  onChange={e => updateEl(selSide, selId, { legenda: e.target.value })}
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
                        onChange={e => updateEl(selSide, selId, { [key]: Number(e.target.value) })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-quick-actions">
                <button
                  className="admin-btn-quick"
                  onClick={() => updateEl(selSide, selId, { x: 0, y: 0, largura: CANVAS_W, altura: CANVAS_H })}
                >
                  Página Inteira
                </button>
                <button
                  className="admin-btn-quick"
                  onClick={() => updateEl(selSide, selId, {
                    x: Math.max(0, Math.floor((CANVAS_W - selectedEl.largura) / 2)),
                    y: Math.max(0, Math.floor((CANVAS_H - selectedEl.altura)  / 2)),
                  })}
                >
                  Centralizar
                </button>
              </div>

              <div className="admin-divider" />

              <button
                className="admin-btn-delete"
                onClick={() => removeEl(selSide, selId)}
              >
                Remover Foto
              </button>
            </div>
          ) : (
            <p className="admin-properties__empty">
              {activeSpread
                ? 'Clique numa foto no spread para editar suas propriedades'
                : 'Selecione um spread na barra lateral'}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SPREAD ELEMENT — Rnd wrapper isolado
──────────────────────────────────────────────*/
function SpreadElement({ el, isSelected, onSelect, onDragStop, onResizeStop }) {
  return (
    <Rnd
      key={el.id}
      bounds="parent"
      size={{ width: el.largura, height: el.altura }}
      position={{ x: el.x, y: el.y }}
      onDragStop={(_, d) => onDragStop(d)}
      onResizeStop={(_, __, ref, ___, pos) => onResizeStop(ref, pos)}
      onClick={e => { e.stopPropagation(); onSelect(); }}
      style={{
        border:       isSelected ? '2px solid #C8AA69' : '2px solid transparent',
        cursor:       'move',
        boxShadow:    isSelected ? '0 0 0 4px rgba(200,170,105,0.18)' : 'none',
        borderRadius: 4,
        transition:   'box-shadow 0.15s, border-color 0.15s',
        zIndex:       isSelected ? 10 : 1,
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
          fontSize: 16, fontFamily: "'Cormorant Garamond', serif",
          color: 'rgba(50,42,24,0.7)', textAlign: 'center', letterSpacing: '0.04em',
        }}>
          {el.legenda}
        </div>
      )}
    </Rnd>
  );
}