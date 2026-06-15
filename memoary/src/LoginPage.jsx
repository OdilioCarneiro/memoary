import { useState } from 'react';
import './LoginPage.css';

export default function LoginPage({ onLoginSuccess }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErro('');
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Usuário ou senha incorretos.');
      localStorage.setItem('adminToken', data.token);
      onLoginSuccess();
    } catch (error) {
      setErro(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-card">

        <span className="admin-card-eyebrow">Anuário</span>
        <h2 className="admin-title dark">Acesso Restrito</h2>
        <p className="admin-subtitle">Faça login para gerenciar o anuário.</p>

        <form onSubmit={handleLogin} className="admin-form">
          <div className="input-group">
            <label htmlFor="usuario" className="admin-label">Usuário</label>
            <input
              type="text"
              id="usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="text-input"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="senha" className="admin-label">Senha</label>
            <input
              type="password"
              id="senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="text-input"
              required
            />
          </div>

          {erro && (
            <div className="feedback-message error">{erro}</div>
          )}

          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="admin-card-footer">
          <span className="admin-card-footer-mark">Memoary</span>
        </div>

      </div>
    </div>
  );
}