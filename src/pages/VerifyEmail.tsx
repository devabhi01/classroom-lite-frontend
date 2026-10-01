import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowRight, RefreshCw, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';

export const VerifyEmail: React.FC = () => {
  const { verifyEmail, resendVerification, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // If already authenticated and verified, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && user?.isEmailVerified !== false) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user?.isEmailVerified, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your registered email address');
      return;
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await verifyEmail({ email: email.trim().toLowerCase(), otp: otp.trim() });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Please provide your email address to resend code');
      return;
    }
    if (countdown > 0) return;

    try {
      setIsResending(true);
      setError('');
      await resendVerification(email.trim().toLowerCase());
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo size="lg" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            Verify Your Email
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the 6-digit code sent to your email to activate your account
          </p>
        </div>

        <Card className="border border-border/80 shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg">Check Your Inbox</CardTitle>
            <CardDescription className="text-xs">
              We've sent a 6-digit verification code to{' '}
              <span className="font-semibold text-foreground">
                {email || 'your email'}
              </span>
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleVerify}>
            <CardContent className="space-y-4 pt-2">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive">
                  {error}
                </div>
              )}

              {!emailParam && (
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="yourname@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              )}

              <div className="space-y-1.5 text-center">
                <label className="block text-xs font-medium text-foreground text-left">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setOtp(val);
                      if (error) setError('');
                    }}
                    className="w-full text-center tracking-[0.5em] font-mono font-bold text-2xl py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground text-left">
                  The code is valid for 15 minutes.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-muted-foreground">Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || isResending}
                  className={`font-semibold transition-colors flex items-center gap-1 ${
                    countdown > 0 || isResending
                      ? 'text-muted-foreground cursor-not-allowed opacity-60'
                      : 'text-primary hover:underline'
                  }`}
                >
                  <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                  <span>
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                  </span>
                </button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-2">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Verify & Continue
              </Button>

              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-1">
                <Link to="/login" className="hover:text-primary transition-colors">
                  Back to Login
                </Link>
                <span>&bull;</span>
                <Link to="/signup" className="hover:text-primary transition-colors">
                  Register with another email
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
