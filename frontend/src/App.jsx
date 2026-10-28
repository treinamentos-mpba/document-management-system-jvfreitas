import { useEffect, useState } from 'react';
import { listDocuments, uploadDocument, downloadDocument } from './services/documentsApi';
import DocumentList from './components/DocumentList';
import UploadComponent from './components/UploadComponent';
import './App.css';

export default function App() {
  const [activeUser, setActiveUser] = useState('usuario-demo');
  const [userDraft, setUserDraft] = useState('usuario-demo');
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    async function refreshDocuments() {
      setIsLoading(true);
      try {
        const result = await listDocuments(activeUser, { signal: controller.signal });
        if (isCurrent) setDocuments(result);
      } catch (error) {
        if (isCurrent && error.name !== 'AbortError') {
          setFeedback({ type: 'error', message: error.message });
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    refreshDocuments();
    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [activeUser]);

  function applyUser(event) {
    event.preventDefault();
    const nextUser = userDraft.trim();
    if (!nextUser) {
      setFeedback({ type: 'error', message: 'Informe um usuário para continuar.' });
      return;
    }
    setFeedback(null);
    setActiveUser(nextUser);
  }

  async function handleUpload(file) {
    setIsUploading(true);
    setFeedback(null);
    try {
      await uploadDocument(file, activeUser);
      setFeedback({ type: 'success', message: 'Documento enviado.' });
      setDocuments(await listDocuments(activeUser));
      return true;
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(document) {
    setDownloadingId(document.id);
    setFeedback(null);
    try {
      await downloadDocument(document, activeUser);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>DMS<span className="brand-divider">/</span>Documentos</span>
        </a>
        <form className="user-switcher" onSubmit={applyUser}>
          <label htmlFor="active-user">Usuário ativo</label>
          <input
            id="active-user"
            value={userDraft}
            onChange={(event) => setUserDraft(event.target.value)}
            maxLength={128}
            autoComplete="off"
          />
          <button type="submit" className="button button-quiet">Aplicar</button>
        </form>
      </header>

      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ESPAÇO PESSOAL</p>
            <h1>Documentos</h1>
          </div>
          <span className="document-count" aria-live="polite">
            {documents.length} {documents.length === 1 ? 'arquivo' : 'arquivos'}
          </span>
        </div>

        <section className="upload-section" aria-labelledby="upload-heading">
          <div className="section-heading">
            <span className="section-index">01</span>
            <h2 id="upload-heading">Adicionar documento</h2>
          </div>
          <UploadComponent onUpload={handleUpload} isUploading={isUploading} />
        </section>

        {feedback && (
          <p className={`feedback feedback-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
            <span aria-hidden="true">{feedback.type === 'error' ? '!' : '✓'}</span>
            {feedback.message}
          </p>
        )}

        <section className="documents-section" aria-labelledby="documents-heading">
          <div className="section-heading list-heading">
            <span className="section-index">02</span>
            <h2 id="documents-heading">Arquivos salvos</h2>
            {isLoading && <span className="loading-label">Atualizando...</span>}
          </div>
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            downloadingId={downloadingId}
            onDownload={handleDownload}
          />
        </section>
      </main>

      <footer className="app-footer">
        <span>Armazenamento local</span>
        <span className="footer-status"><i aria-hidden="true" /> Conectado</span>
      </footer>
    </div>
  );
}
