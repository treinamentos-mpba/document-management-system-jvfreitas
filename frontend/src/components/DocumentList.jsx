import DownloadButton from './DownloadButton';

export default function DocumentList({ documents, isLoading, downloadingId, onDownload }) {
  if (isLoading && documents.length === 0) {
    return <p className="list-message">Carregando documentos...</p>;
  }

  if (documents.length === 0) {
    return <p className="list-message empty-state">Nenhum documento por aqui ainda.</p>;
  }

  return (
    <ul className="document-list">
      {documents.map((document) => (
        <li className="document-row" key={document.id}>
          <span className="file-mark" aria-hidden="true">DOC</span>
          <div className="document-details">
            <span className="document-name" title={document.originalName}>{document.originalName}</span>
            <span className="document-meta">
              {formatFileSize(document.size)} <span aria-hidden="true">·</span> {formatDate(document.uploadedAt)}
            </span>
          </div>
          <DownloadButton
            onClick={() => onDownload(document)}
            isLoading={downloadingId === document.id}
          />
        </li>
      ))}
    </ul>
  );
}

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = size / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}