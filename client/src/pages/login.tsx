import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Eye,
  EyeOff,
  User,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import logoUrl from "@assets/WhatsApp_Image_2026-01-17_at_10.38.06_1768626585689.jpeg";

const REMEMBER_KEY = "knockturn_remembered_login";

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot password dialog state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmployeeCode, setResetEmployeeCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Pre-fill fields from a previous "Remember me" login, if any.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUsername(parsed.username || "");
        setEmployeeCode(parsed.employeeCode || "");
        setPassword(parsed.password || "");
        setRememberMe(true);
      }
    } catch {
      // ignore malformed/old saved data
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          employeeCode,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      // Remember (or forget) the login fields for next time
      if (rememberMe) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({ username, employeeCode, password })
        );
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      // Store user data
      localStorage.setItem(
        "knocxtirn_user",
        JSON.stringify({
          id: data.user.id,
          username: data.user.username,
          employeeCode: data.user.employeeCode,
          isAdmin: !!data.user.isAdmin,
        })
      );

      // Redirect to dashboard
      setLocation("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const openForgotPassword = () => {
    setResetEmployeeCode(employeeCode);
    setResetNewPassword("");
    setResetConfirmPassword("");
    setShowResetNewPassword(false);
    setShowResetConfirmPassword(false);
    setResetError("");
    setResetSuccess(false);
    setShowForgotPassword(true);
  };

  const handleForgotPasswordDialogChange = (open: boolean) => {
    setShowForgotPassword(open);
    if (!open) {
      // Clear sensitive fields when the dialog is dismissed.
      setResetNewPassword("");
      setResetConfirmPassword("");
      setShowResetNewPassword(false);
      setShowResetConfirmPassword(false);
      setResetError("");
      setResetSuccess(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");

    if (resetNewPassword.length < 4) {
      setResetError("Password must be at least 4 characters.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: resetEmployeeCode,
          newPassword: resetNewPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResetError(data.error || "Could not reset password. Please try again.");
        return;
      }

      setResetSuccess(true);
      // Pre-fill the login form with the new password for convenience.
      setEmployeeCode(resetEmployeeCode);
      setPassword(resetNewPassword);
    } catch (err) {
      console.error("Reset password error:", err);
      setResetError("An error occurred. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[hsl(210,90%,35%)] via-[hsl(210,85%,45%)] to-[hsl(215,80%,25%)] animate-gradient">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center"
          >
            <div className="mb-8 animate-float">
              <div className="w-full max-w-[300px] mx-auto overflow-hidden rounded-xl flex items-center justify-center border border-white/20 shadow-2xl">
                <img src={logoUrl} alt="Knockturn Logo" className="w-full h-auto" />
              </div>
            </div>

            <h1 className="font-display text-5xl font-bold mb-4 tracking-tight">
              Knockturn
            </h1>
            <p className="text-xl text-white/80 font-light mb-2">
              Employee Portal
            </p>
            <div className="w-20 h-1 bg-white/40 mx-auto rounded-full mt-6"></div>

            <p className="mt-8 text-white/60 text-sm max-w-sm mx-auto leading-relaxed">
              Access your enterprise dashboard, manage time tracking, and stay connected with your team.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="absolute bottom-12 text-white/50 text-sm"
          >
            knockturn.tech
          </motion.div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden text-center mb-10">
            <div className="w-full max-w-[200px] mx-auto mb-4">
              <img src={logoUrl} alt="Knockturn Logo" className="w-full h-auto" />
            </div>
            <p className="text-muted-foreground mt-1">Employee Portal</p>
          </div>

          <Card className="border-0 shadow-xl bg-card">
            <CardHeader className="space-y-1 pb-6">
              <h2 className="font-display text-2xl font-semibold text-center text-foreground">
                Sign In
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                Enter your credentials to access the portal
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-foreground">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your full name"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-11 h-12 bg-secondary/50 border-input focus:bg-background transition-colors"
                      data-testid="input-username"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeCode" className="text-sm font-medium text-foreground">
                    Employee Code
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                    <Input
                      id="employeeCode"
                      type="text"
                      placeholder="e.g., E0041"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      className="pl-11 h-12 bg-secondary/50 border-input focus:bg-background transition-colors uppercase"
                      data-testid="input-employee-code"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 bg-secondary/50 border-input focus:bg-background transition-colors"
                      data-testid="input-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rememberMe"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      data-testid="checkbox-remember-me"
                    />
                    <Label
                      htmlFor="rememberMe"
                      className="text-sm font-normal text-muted-foreground cursor-pointer"
                    >
                      Remember me on this device
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-sm font-medium text-primary hover:underline"
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/25"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-8">
            © 2026 Knockturn Technologies. All rights reserved.
          </p>
        </motion.div>
      </div>

      <Dialog open={showForgotPassword} onOpenChange={handleForgotPasswordDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter your employee code to verify it's you, then set a new password.
            </DialogDescription>
          </DialogHeader>

          {resetSuccess ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Your password has been updated. You can sign in now.</span>
              </div>
              <Button
                type="button"
                className="w-full h-11"
                onClick={() => handleForgotPasswordDialogChange(false)}
                data-testid="button-close-forgot-password"
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetError && (
                <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="resetEmployeeCode">Employee Code</Label>
                <Input
                  id="resetEmployeeCode"
                  type="text"
                  value={resetEmployeeCode}
                  onChange={(e) => setResetEmployeeCode(e.target.value)}
                  placeholder="e.g., E0041"
                  className="uppercase"
                  required
                  data-testid="input-reset-employee-code"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resetNewPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="resetNewPassword"
                    type={showResetNewPassword ? "text" : "password"}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Enter a new password"
                    className="pr-11"
                    required
                    data-testid="input-reset-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-toggle-reset-new-password"
                  >
                    {showResetNewPassword ? (
                      <EyeOff className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resetConfirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="resetConfirmPassword"
                    type={showResetConfirmPassword ? "text" : "password"}
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Re-enter the new password"
                    className="pr-11"
                    required
                    data-testid="input-reset-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowResetConfirmPassword(!showResetConfirmPassword)
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-toggle-reset-confirm-password"
                  >
                    {showResetConfirmPassword ? (
                      <EyeOff className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isResetting}
                data-testid="button-submit-reset-password"
              >
                {isResetting ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}