const TOKEN_KEY = 'coursehub_jwt';

// Luu hoac xoa JWT token trong localStorage
export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Lay JWT token hien tai tu localStorage
export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Ham goi HTTP request chung toi Express backend
async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Doi tuong tien ich cung cap cac phuong thuc REST
export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
