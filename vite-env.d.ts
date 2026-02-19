/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_AUTHENTICATION_URL: string;
  readonly VITE_API_ROOT: string;
  readonly VITE_AUTHENTICATION_ROOT: string;
  readonly VITE_ITEMS_PER_PAGE: number;
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}