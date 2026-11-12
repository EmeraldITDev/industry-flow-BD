/**
 * Backend API configuration — the single place the backend URL lives.
 * Used by the app (src/services/api.ts) and the PWA API cache rules
 * (vite.config.ts). To point at a different backend, change API_BASE_URL
 * below (no .env needed).
 *
 * This is the backend origin: request paths already start with `/api/...`.
 */
//export const API_BASE_URL = 'http://localhost:8000';
export const API_BASE_URL = 'https://industry-flow-backend.onrender.com';

/** Backend hostname, used to scope service-worker API caching. */
export const API_HOST = new URL(API_BASE_URL).hostname;
