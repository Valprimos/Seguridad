/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL pública de la API backend en producción (ej: https://tu-backend.onrender.com/api) */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
