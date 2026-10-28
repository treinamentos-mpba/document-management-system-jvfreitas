import { useId, useState } from 'react';

export default function UploadComponent({ onUpload, isUploading }) {
  const inputId = useId();
  const [selectedFile, setSelectedFile] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile || isUploading) return;

    const form = event.currentTarget;
    const completed = await onUpload(selectedFile);
    if (completed) {
      setSelectedFile(null);
      form.reset();
    }
  }

  function handleFileChange(event) {
    setSelectedFile(event.target.files?.[0] || null);
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className={`file-picker${selectedFile ? ' file-picker-selected' : ''}`} htmlFor={inputId}>
        <span className="upload-symbol" aria-hidden="true">＋</span>
        <span className="file-picker-copy">
          <strong>{selectedFile ? selectedFile.name : 'Selecionar arquivo'}</strong>
          <small>{selectedFile ? formatFileSize(selectedFile.size) : 'Escolha um arquivo do seu dispositivo'}</small>
        </span>
        <span className="file-picker-action">Procurar</span>
      </label>
      <input
        className="visually-hidden"
        id={inputId}
        type="file"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <button className="button button-primary upload-submit" type="submit" disabled={!selectedFile || isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar arquivo'}
        {!isUploading && <span aria-hidden="true">↑</span>}
      </button>
    </form>
  );
}

function formatFileSize(size) {
  if (size < 1024) return `${size} bytes`;
  const units = ['KB', 'MB', 'GB'];
  let value = size / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`;
}