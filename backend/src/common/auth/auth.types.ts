export interface JwtClaims {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  [key: string]: unknown;
}

export interface AuthUser {
  id: string;
  subject: string;
  email: string | null;
  displayName: string;
  pictureUrl: string | null;
}

