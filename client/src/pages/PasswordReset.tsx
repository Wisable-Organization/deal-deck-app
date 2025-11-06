import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MIN_PASSWORD_LEN } from "@/lib/authConstants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // If token exists, show password reset form; otherwise show email request form
  const isResetMode = !!token;

  const requestResetMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest("POST", "/api/auth/password-reset-request", data);
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
      toast({
        title: "Reset link sent",
        description: "If the email exists, a password reset link has been sent.",
      });
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to send reset link. Please try again.");
    },
  });

  const confirmResetMutation = useMutation({
    mutationFn: async (data: { token: string; new_password: string }) => {
      const res = await apiRequest("POST", "/api/auth/password-reset-confirm", data);
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
      toast({
        title: "Password reset successful",
        description: "Your password has been reset. You can now login.",
      });
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to reset password. The token may be invalid or expired.");
    },
  });

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    requestResetMutation.mutate({ email });
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LEN) {
      setError(`Password must be at least ${MIN_PASSWORD_LEN} characters long`);
      return;
    }

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    confirmResetMutation.mutate({ token, new_password: newPassword });
  };

  if (success && !isResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription>
              If the email exists, a password reset link has been sent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isResetMode ? "Reset Password" : "Forgot Password"}
          </CardTitle>
          <CardDescription>
            {isResetMode
              ? "Enter your new password"
              : "Enter your email address and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={isResetMode ? handleConfirmReset : handleRequestReset}
            className="space-y-4"
          >
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!isResetMode && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={requestResetMutation.isPending}
                />
              </div>
            )}

            {isResetMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={confirmResetMutation.isPending}
                    minLength={MIN_PASSWORD_LEN}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={confirmResetMutation.isPending}
                    minLength={MIN_PASSWORD_LEN}
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                isResetMode
                  ? confirmResetMutation.isPending
                  : requestResetMutation.isPending
              }
            >
              {isResetMode
                ? confirmResetMutation.isPending
                  ? "Resetting..."
                  : "Reset Password"
                : requestResetMutation.isPending
                ? "Sending..."
                : "Send Reset Link"}
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-primary hover:underline"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

