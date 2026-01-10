export interface JwtPayload {
  sub: string; // user id (stored as string in JWT, but represents number)
  email: string;
  role: string;
  jti?: string; // JWT ID - usado para refresh token rotation
  tokenFamily?: string; // Token family ID - para tracking de rotaciones
  iat?: number;
  exp?: number;
}

export interface JwtPayloadWithRefreshToken extends JwtPayload {
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}
