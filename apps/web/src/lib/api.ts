export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export const sessionKey = 'dealerflow-session';
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(sessionKey);
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ error: 'The server could not complete this request' }));
    if (response.status === 401 && path !== '/auth/login') {
      sessionStorage.removeItem(sessionKey);
      window.dispatchEvent(new Event('session-expired'));
    }
    throw new ApiError(data.error || 'Request failed', response.status, data.fields);
  }
  return response.json();
}
export const save = <T>(path: string, body: unknown = {}, method = 'POST') =>
  api<T>(path, { method, body: body instanceof FormData ? body : JSON.stringify(body) });
export async function privateFile(path: string): Promise<Blob> {
  const token = sessionStorage.getItem(sessionKey);
  const response = await fetch(`/api${path}`, {
    headers: { Authorization: `Bearer ${token || ''}` },
  });
  if (!response.ok)
    throw new Error('Could not open this document. Please sign in again if your session expired.');
  return response.blob();
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
