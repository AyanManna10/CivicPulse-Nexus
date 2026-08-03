import axios from "axios";

const KEYCLOAK_TOKEN_URL = "http://localhost:8080/realms/civicpulse/protocol/openid-connect/token";
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string;
const KEYCLOAK_CLIENT_SECRET = import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET as string;

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(fn: () => void) {
  onSessionExpired = fn;
}

export async function loginWithPassword(username: string, password: string): Promise<string> {
  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("client_id", KEYCLOAK_CLIENT_ID);
  params.append("client_secret", KEYCLOAK_CLIENT_SECRET);
  params.append("username", username);
  params.append("password", password);
  const res = await axios.post(KEYCLOAK_TOKEN_URL, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  accessToken = res.data.access_token;
  refreshToken = res.data.refresh_token;
  return accessToken as string;
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshToken) throw new Error("No refresh token");
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("client_id", KEYCLOAK_CLIENT_ID);
  params.append("client_secret", KEYCLOAK_CLIENT_SECRET);
  params.append("refresh_token", refreshToken);
  const res = await axios.post(KEYCLOAK_TOKEN_URL, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  accessToken = res.data.access_token;
  refreshToken = res.data.refresh_token;
  return accessToken as string;
}

export function clearSession() {
  accessToken = null;
  refreshToken = null;
}

export function hasSession() {
  return accessToken !== null;
}

export const api = axios.create({ baseURL: "http://localhost:9000" });

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshingPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        if (!refreshingPromise) {
          refreshingPromise = refreshAccessToken().finally(() => { refreshingPromise = null; });
        }
        const newToken = await refreshingPromise;
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        clearSession();
        if (onSessionExpired) onSessionExpired();
      }
    }
    return Promise.reject(error);
  }
);

function decodeJwtPayload(token: string): any {
  try {
    const payload = token.split(".")[1];
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function getRoles(): string[] {
  if (!accessToken) return [];
  return decodeJwtPayload(accessToken)?.realm_access?.roles ?? [];
}

export function hasAnyRole(...roles: string[]): boolean {
  const userRoles = getRoles();
  return roles.some((r) => userRoles.includes(r));
}

export function getUsername(): string {
  if (!accessToken) return "";
  return decodeJwtPayload(accessToken)?.preferred_username ?? "";
}

export function getUserEmail(): string {
  if (!accessToken) return "";
  return decodeJwtPayload(accessToken)?.email ?? "";
}

// ── Validation helpers ────────────────────────────────────────────────────────

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const NAME_RE  = /^[a-zA-Z\s.\-']{2,80}$/;

export function validateEmail(email: string): string {
  if (!email?.trim()) return "Email is required";
  if (!EMAIL_RE.test(email.trim())) return "Enter a valid email (e.g. name@gmail.com)";
  return "";
}

export function validateName(name: string): string {
  if (!name?.trim()) return "Full name is required";
  if (!NAME_RE.test(name.trim())) return "Name must contain only letters and spaces (2–80 chars)";
  return "";
}

export function validatePhone(phone: string): string {
  if (!phone?.trim()) return "Phone number is required";
  if (!/^\d{10}$/.test(phone.trim())) return "Phone must be exactly 10 digits";
  return "";
}

export function validateAadhaar(aadhaar: string): string {
  if (!aadhaar) return ""; // optional field
  if (!/^\d{12}$/.test(aadhaar)) return "Aadhaar must be exactly 12 digits";
  return "";
}
export const Api = axios.create({
  baseURL: "http://localhost:8085",
});