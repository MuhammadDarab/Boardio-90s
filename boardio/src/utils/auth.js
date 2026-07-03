export function getToken() {
  return localStorage.getItem("auth_token");
}

export function setToken(token) {
  localStorage.setItem("auth_token", token);
}

export function clearToken() {
  localStorage.removeItem("auth_token");
}

function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function authFetch(url, options = {}) {
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearToken();
    if (window.location.pathname !== "/login") {
      window.location.pathname = "/login";
    }
    throw new Error("Unauthorized");
  }
  return response;
}
