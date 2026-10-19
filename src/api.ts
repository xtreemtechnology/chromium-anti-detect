export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const apiKey = import.meta.env.VITE_API_KEY;
  if (apiKey) headers.set('x-api-key', apiKey);
  return fetch(input, { ...init, headers });
}