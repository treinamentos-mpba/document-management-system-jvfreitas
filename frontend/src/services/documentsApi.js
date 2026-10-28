const API_PREFIX = '/api';

function userHeaders(userId) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) throw new Error('Informe um usuário para continuar.');
  return { 'X-User-Id': normalizedUserId };
}

async function ensureSuccess(response) {
  if (response.ok) return;

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  throw new Error(payload?.error?.message || 'Não foi possível concluir a solicitação.');
}

export async function listDocuments(userId, { signal } = {}) {
  const response = await fetch(`${API_PREFIX}/documents`, {
    headers: userHeaders(userId),
    signal,
  });
  await ensureSuccess(response);
  const payload = await response.json();
  return payload.documents;
}

export async function uploadDocument(file, userId) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    headers: userHeaders(userId),
    body: formData,
  });
  await ensureSuccess(response);
  return response.json();
}

export async function downloadDocument(documentMetadata, userId) {
  const response = await fetch(
    `${API_PREFIX}/documents/${encodeURIComponent(documentMetadata.id)}/download`,
    { headers: userHeaders(userId) },
  );
  await ensureSuccess(response);

  const fileUrl = URL.createObjectURL(await response.blob());
  const link = window.document.createElement('a');
  link.href = fileUrl;
  link.download = documentMetadata.originalName || 'documento';
  link.style.display = 'none';
  window.document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
}