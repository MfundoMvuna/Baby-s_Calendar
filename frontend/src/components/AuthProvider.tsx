"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Amplify } from "aws-amplify";
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
  resetPassword,
  confirmResetPassword,
  type SignInOutput,
} from "aws-amplify/auth";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
    },
  },
});

export interface AuthUser {
  userId: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  getIdToken: () => Promise<string | null>;
  handleSignIn: (email: string, password: string) => Promise<SignInOutput>;
  handleSignUp: (email: string, password: string) => Promise<void>;
  handleConfirmSignUp: (email: string, code: string) => Promise<void>;
  handleSignOut: () => Promise<void>;
  handleForgotPassword: (email: string) => Promise<void>;
  handleConfirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Check for existing session on mount
  useEffect(() => {
    (async () => {
      try {
        const currentUser = await getCurrentUser();
        const session = await fetchAuthSession();
        const email =
          session.tokens?.idToken?.payload?.email as string ?? "";
        setUser({ userId: currentUser.userId, email });
      } catch {
        // Not signed in
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  }, []);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const result = await signIn({ username: email, password });
        if (result.isSignedIn) {
          const currentUser = await getCurrentUser();
          const session = await fetchAuthSession();
          const userEmail =
            session.tokens?.idToken?.payload?.email as string ?? "";
          setUser({ userId: currentUser.userId, email: userEmail });
        }
        return result;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Sign in failed";
        setError(msg);
        throw e;
      }
    },
    []
  );

  const handleSignUp = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        await signUp({
          username: email,
          password,
          options: { userAttributes: { email } },
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Sign up failed";
        setError(msg);
        throw e;
      }
    },
    []
  );

  const handleConfirmSignUp = useCallback(
    async (email: string, code: string) => {
      setError(null);
      try {
        await confirmSignUp({ username: email, confirmationCode: code });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Confirmation failed";
        setError(msg);
        throw e;
      }
    },
    []
  );

  const handleForgotPassword = useCallback(
    async (email: string) => {
      setError(null);
      try {
        await resetPassword({ username: email });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to send reset code";
        setError(msg);
        throw e;
      }
    },
    []
  );

  const handleConfirmResetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      setError(null);
      try {
        await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Password reset failed";
        setError(msg);
        throw e;
      }
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        getIdToken,
        handleSignIn,
        handleSignUp,
        handleConfirmSignUp,
        handleSignOut,
        handleForgotPassword,
        handleConfirmResetPassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
