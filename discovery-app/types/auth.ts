export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  profileCompleted?: boolean;
}

export interface AuthState {
  user: User | null;
  isProfileCompleted: boolean;
  loading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshProfileStatus: () => Promise<void>;
}
