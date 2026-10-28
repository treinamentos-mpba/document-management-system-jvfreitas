export default function DownloadButton({ onClick, isLoading }) {
  return (
    <button
      type="button"
      className="download-button"
      onClick={onClick}
      disabled={isLoading}
      aria-label={isLoading ? 'Baixando documento' : 'Baixar documento'}
      title={isLoading ? 'Baixando...' : 'Baixar'}
    >
      <span aria-hidden="true">{isLoading ? '…' : '↓'}</span>
    </button>
  );
}