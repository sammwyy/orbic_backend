export interface JwtPayload {
  sub: string;
  username: string;
  emailVerified: boolean;
  sessionId: string;
}
