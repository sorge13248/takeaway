declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test';
    PORT?: string;
    DB_PATH?: string;
    UPLOADS_DIR?: string;
    DB_AUTO_LOAD_ENTITIES?: string;
    DB_SYNCHRONIZE?: string;
    DB_LOGGING?: string;
    CORS_ALLOWED_ORIGINS?: string;
    AUTH_MOCK_ENABLED?: string;
    OIDC_ISSUER_URL?: string;
    OIDC_CLIENT_ID?: string;
    OIDC_CLIENT_SECRET?: string;
    OIDC_REDIRECT_URI?: string;
    OIDC_FRONTEND_REDIRECT_BASE_URL?: string;
  }
}

declare module 'multer' {
  const multer: any;
  export const diskStorage: any;
  export default multer;
}
