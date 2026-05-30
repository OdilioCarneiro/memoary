import { useState } from 'react';
import './AdminPage.css';

export default function AdminPage() {
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [legenda, setLegenda] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!imageFile) {
      setFeedback({ type: 'error', text: 'Por favor, selecione uma imagem.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // Cria o "pacote" de dados para enviar ao servidor
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('legenda', legenda);

      // Lê a URL do Render. Se não achar, usa o localhost (para testes no seu PC)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_URL}/api/anuario`, {
        method: 'POST',
        body: formData, 
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao comunicar com o servidor.');
      }

      setFeedback({ type: 'success', text: 'Página adicionada ao anuário com sucesso!' });
      
      // Limpa os campos
      setImageFile(null);
      setPreviewUrl(null);
      setLegenda('');
      
    } catch (error) {
      console.error("Erro no upload:", error);
      setFeedback({ type: 'error', text: error.message || 'Erro ao enviar os dados. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h2 className="admin-title dark">Adicionar Nova Memória</h2>
        <p className="admin-subtitle">Preencha os dados abaixo para adicionar uma nova página ao anuário.</p>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="input-group">
            <label htmlFor="fotoUpload" className="admin-label">Selecione a Foto</label>
            <input 
              type="file" 
              id="fotoUpload" 
              accept="image/*" 
              onChange={handleImageChange} 
              className="file-input"
            />
          </div>

          {previewUrl && (
            <div className="preview-container">
              <p className="admin-label">Pré-visualização:</p>
              <img src={previewUrl} alt="Preview" className="image-preview" />
            </div>
          )}

          <div className="input-group">
            <label htmlFor="legenda" className="admin-label">Legenda da Foto (Opcional)</label>
            <textarea 
              id="legenda"
              rows="3"
              placeholder="Escreva algo especial sobre esse momento..."
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              className="text-input"
            />
          </div>

          {feedback && (
            <div className={`feedback-message ${feedback.type}`}>
              {feedback.text}
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Adicionar ao Anuário'}
          </button>
        </form>
      </div>
    </div>
  );
}