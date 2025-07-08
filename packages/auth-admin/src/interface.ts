export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  isEmailVerified: boolean;
}

export interface AuthProvider {
  validateToken(accessToken: string): Promise<AuthUser | null>;
  deleteUser(userId: string): Promise<void>;
  getUser(userId: string): Promise<AuthUser | null>;
}
