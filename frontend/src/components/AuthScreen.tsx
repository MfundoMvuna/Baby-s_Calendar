"use client";

import { useState } from "react";
import { Baby, Heart } from "lucide-react";
import { useAuth } from "./AuthProvider";

type AuthMode = "signIn" | "signUp" | "confirm" | "forgotPassword" | "resetPassword";

export default function AuthScreen() {
  const { handleSignIn, handleSignUp, handleConfirmSignUp, handleForgotPassword, handleConfirmResetPassword, error, clearError } =
    useAuth();

  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const displayError = localError ?? error;

  function switchMode(next: AuthMode) {
    clearError();
    setLocalError(null);
    setResetSuccess(false);
    setMode(next);
  }

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setBusy(true);
    try {
      const result = await handleSignIn(email, password);
      if (
        result.nextStep?.signInStep === "CONFIRM_SIGN_UP"
      ) {
        setMode("confirm");
      }
    } catch {
      // error already set in context
    } finally {
      setBusy(false);
    }
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (password !== confirmPassword) {
      setLocalError("Passwords don't match");
      return;
    }
    if (password.length < 10) {
      setLocalError(
        "Password must be at least 10 characters with uppercase, lowercase, number, and symbol"
      );
      return;
    }
    setBusy(true);
    try {
      await handleSignUp(email, password);
      setMode("confirm");
    } catch {
      // error already set in context
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setBusy(true);
    try {
      await handleConfirmSignUp(email, code);
      // After confirm, sign in automatically
      await handleSignIn(email, password);
    } catch {
      // error already set in context
    } finally {
      setBusy(false);
    }
  }

  async function onForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!email) {
      setLocalError("Please enter your email address first");
      return;
    }
    setBusy(true);
    try {
      await handleForgotPassword(email);
      setMode("resetPassword");
    } catch {
      // error already set in context
    } finally {
      setBusy(false);
    }
  }

  async function onResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (newPassword.length < 10) {
      setLocalError("Password must be at least 10 characters with uppercase, lowercase, number, and symbol");
      return;
    }
    setBusy(true);
    try {
      await handleConfirmResetPassword(email, resetCode, newPassword);
      setResetSuccess(true);
      setTimeout(() => { setResetSuccess(false); switchMode("signIn"); }, 2000);
    } catch {
      // error already set in context
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="relative">
          <Baby className="w-12 h-12 text-primary-500" />
          <Heart className="w-4 h-4 text-pink-400 absolute -top-1 -right-1 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary-700">
            Baby&apos;s Calendar
          </h1>
          <p className="text-xs text-primary-400">Pregnancy Tracker</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 space-y-5">
        <h2 className="text-lg font-semibold text-center text-primary-700">
          {mode === "signIn" && "Welcome back"}
          {mode === "signUp" && "Create your account"}
          {mode === "confirm" && "Verify your email"}
          {mode === "forgotPassword" && "Reset your password"}
          {mode === "resetPassword" && "Enter new password"}
        </h2>

        {displayError && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 text-center">
            {displayError}
          </div>
        )}

        {/* Sign In */}
        {mode === "signIn" && (
          <form onSubmit={onSignIn} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-primary-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-primary-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50"
            >
              {busy ? "Signing in..." : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => { clearError(); setLocalError(null); if (!email) { setLocalError("Enter your email first"); return; } setMode("forgotPassword"); }}
              className="text-xs text-primary-400 hover:text-primary-600 mx-auto block"
            >
              Forgot password?
            </button>
          </form>
        )}

        {/* Forgot Password — send email */}
        {mode === "forgotPassword" && (
          <form onSubmit={onForgotPassword} className="space-y-3">
            <p className="text-sm text-gray-500 text-center">
              We&apos;ll send a reset code to your email
            </p>
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-primary-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50"
            >
              {busy ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        )}

        {/* Reset Password — enter code + new password */}
        {mode === "resetPassword" && (
          <form onSubmit={onResetPassword} className="space-y-3">
            {resetSuccess ? (
              <div className="text-sm text-green-600 bg-green-50 rounded-lg p-3 text-center">
                Password reset successful! Redirecting to sign in...
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 text-center">
                  Check your email for the code we sent to <strong>{email}</strong>
                </p>
                <input
                  type="text"
                  placeholder="Reset code"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-primary-200 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
                <input
                  type="password"
                  placeholder="New password (min 10 chars)"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-primary-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary w-full py-3 text-sm disabled:opacity-50"
                >
                  {busy ? "Resetting..." : "Reset Password"}
                </button>
              </>
            )}
          </form>
        )}

        {/* Sign Up */}
        {mode === "signUp" && (
          <form onSubmit={onSignUp} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-primary-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <input
              type="password"
              placeholder="Password (min 10 chars)"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-primary-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <input
              type="password"
              placeholder="Confirm password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-primary-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50"
            >
              {busy ? "Creating account..." : "Sign Up"}
            </button>
          </form>
        )}

        {/* Confirm Code */}
        {mode === "confirm" && (
          <form onSubmit={onConfirm} className="space-y-3">
            <p className="text-sm text-gray-500 text-center">
              We sent a verification code to <strong>{email}</strong>
            </p>
            <input
              type="text"
              placeholder="Verification code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-primary-200 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50"
            >
              {busy ? "Verifying..." : "Verify & Sign In"}
            </button>
          </form>
        )}

        {/* Toggle links */}
        <div className="text-center text-sm text-gray-400">
          {mode === "signIn" && (
            <p>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => switchMode("signUp")}
                className="text-primary-500 font-medium hover:underline"
              >
                Sign Up
              </button>
            </p>
          )}
          {(mode === "signUp" || mode === "confirm") && (
            <p>
              Already have an account?{" "}
              <button
                onClick={() => switchMode("signIn")}
                className="text-primary-500 font-medium hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
          {(mode === "forgotPassword" || mode === "resetPassword") && (
            <p>
              Remember your password?{" "}
              <button
                onClick={() => switchMode("signIn")}
                className="text-primary-500 font-medium hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-300">
        Your data is encrypted &amp; stored in South Africa (POPIA compliant)
      </p>
    </div>
  );
}
