import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";

const baseURL = (process.env.REACT_APP_API_URL ?? "").replace(/\/+$/, "");

export const http = axios.create({
  baseURL,
  timeout: 4000_000,
});

// Adjunta el token SIEMPRE, compatible con Axios v1 (AxiosHeaders) y objetos planos
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token) {
    // Si headers es AxiosHeaders (v1) => usar .set
    if (config.headers && typeof (config.headers as AxiosHeaders).set === "function") {
      (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
    } else {
      // Si headers es objeto plano o undefined => merge seguro
      config.headers = {
        ...(config.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
      } as any;
    }
  }
  return config;
});

// Opcional: mensajes de error más claros
http.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err?.response?.data?.message || err.message || "Error";
    return Promise.reject(new Error(msg));
  }
);
