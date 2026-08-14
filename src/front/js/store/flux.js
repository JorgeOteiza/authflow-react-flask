const API_URL = process.env.REACT_APP_BACKEND_URL || "";

const readCookie = name => {
  const item = document.cookie
    .split("; ")
    .find(cookie => cookie.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.split("=").slice(1).join("=")) : null;
};

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const parseResponse = async response => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      data.error?.message || "No se pudo completar la solicitud.",
      response.status,
      data.error?.code || "request_failed"
    );
  }
  return data;
};

const rawRequest = async (path, options = {}, csrfCookie = "csrf_access_token") => {
  const method = options.method || "GET";
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfToken = readCookie(csrfCookie);
    if (csrfToken) headers["X-CSRF-TOKEN"] = csrfToken;
  }
  return fetch(`${API_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include"
  });
};

const request = async (path, options = {}, retry = true) => {
  const response = await rawRequest(path, options);
  const hasRefreshSession = Boolean(readCookie("csrf_refresh_token"));
  if (
    response.status === 401 &&
    retry &&
    hasRefreshSession &&
    !path.startsWith("/api/auth/")
  ) {
    const refreshResponse = await rawRequest(
      "/api/auth/refresh",
      { method: "POST" },
      "csrf_refresh_token"
    );
    if (refreshResponse.ok) return request(path, options, false);
  }
  return parseResponse(response);
};

const resultFrom = async operation => {
  try {
    const data = await operation();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof ApiError ? error.message : "No se pudo conectar con el servidor.",
      code: error.code || "network_error"
    };
  }
};

const getState = ({ setStore }) => ({
  store: {
    user: null,
    sessionReady: false,
    notice: null
  },
  actions: {
    restoreSession: async () => {
      const result = await resultFrom(() => request("/api/me"));
      setStore({ user: result.ok ? result.data.user : null, sessionReady: true });
      return result.ok;
    },

    login: async (email, password) => {
      const result = await resultFrom(() => request(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
        false
      ));
      if (result.ok) setStore({ user: result.data.user });
      return result;
    },

    signup: async (email, password) => {
      const result = await resultFrom(() => request(
        "/api/auth/signup",
        { method: "POST", body: JSON.stringify({ email, password }) },
        false
      ));
      if (result.ok && result.data.user) setStore({ user: result.data.user });
      return result;
    },

    verifyEmail: token => resultFrom(() => request(
      "/api/auth/verify-email",
      { method: "POST", body: JSON.stringify({ token }) },
      false
    )),

    forgotPassword: email => resultFrom(() => request(
      "/api/auth/forgot-password",
      { method: "POST", body: JSON.stringify({ email }) },
      false
    )),

    resetPassword: (token, password) => resultFrom(() => request(
      "/api/auth/reset-password",
      { method: "POST", body: JSON.stringify({ token, password }) },
      false
    )),

    updateAccount: async payload => {
      const result = await resultFrom(() => request(
        "/api/me",
        { method: "PUT", body: JSON.stringify(payload) }
      ));
      if (result.ok) setStore({ user: result.data.user });
      return result;
    },

    deleteAccount: async password => {
      const result = await resultFrom(() => request(
        "/api/me",
        { method: "DELETE", body: JSON.stringify({ password }) }
      ));
      if (result.ok) {
        const notice = {
          type: "account-deleted",
          title: "Cuenta eliminada con éxito",
          message: "Tus datos y sesiones se eliminaron correctamente. Esperamos volver a verte pronto."
        };
        setStore({ user: null, notice });
      }
      return result;
    },

    clearNotice: () => setStore({ notice: null }),

    logout: async () => {
      await resultFrom(() => request("/api/auth/logout", { method: "POST" }, false));
      setStore({ user: null });
    }
  }
});

export default getState;
