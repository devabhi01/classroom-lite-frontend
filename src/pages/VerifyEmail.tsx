import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';

export const VerifyEmail: React.FC = () => {
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';
  const phoneParam = searchParams.get('phone') || '';

  const [email, setEmail] = useState(emailParam);
  const [phone, setPhone] = useState(phoneParam);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // If successfully verified, redirect to dashboard
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // If token is provided in URL, automatically attempt verification
  useEffect(() => {
    if (!tokenParam) return;

    let isMounted = true;
    const autoVerify = async () => {
      try {
        setIsVerifying(true);
        setErrorMessage(null);
        await verifyEmail({ token: tokenParam });
        if (isMounted) {
          setIsSuccess(true);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(
            err.message ||
              'Invalid or expired verification link. Please enter your 6-digit code or request a new one.',
          );
        }
      } finally {
        if (isMounted) {
          setIsVerifying(false);
        }
      }
    };

    autoVerify();
    return () => {
      isMounted = false;
    };
  }, [tokenParam, verifyEmail]);

  // Handle manual 6-digit OTP code submission
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setErrorMessage('Please enter the 6-digit verification code');
      return;
    }

    try {
      setIsVerifying(true);
      setErrorMessage(null);
      await verifyEmail({
        code: otpCode.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle resend verification email/SMS
  const handleResend = async () => {
    const target = email.trim() || phone.trim();
    if (!target) {
      setErrorMessage('Please enter your email or phone number to resend verification OTP');
      return;
    }
    if (resendCooldown > 0) return;

    try {
      setIsResending(true);
      setErrorMessage(null);
      await resendVerification(target);
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend confirmation OTP');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo size="lg" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Account Verification</h2>
          <p className="mt-1 text-sm text-muted-foreground">Verify your email or phone to activate your account</p>
        </div>

        <Card className="border border-border/80 shadow-md">
          {/* Success State */}
          {isSuccess ? (
            <div className="p-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 ring-8 ring-emerald-500/5">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold text-foreground">Account Verified!</CardTitle>
                <CardDescription className="text-sm">
                  Your identity has been confirmed successfully. Redirecting you to your dashboard...
                </CardDescription>
              </div>

              <div className="pt-2">
                <Button className="w-full" onClick={() => navigate('/dashboard')}>
                  <span>Go to Dashboard</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : tokenParam && isVerifying ? (
            /* Auto-verifying from link */
            <div className="p-10 text-center space-y-4">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <div className="space-y-1">
                <CardTitle className="text-lg">Verifying your link...</CardTitle>
                <CardDescription>Please wait while we confirm your verification token</CardDescription>
              </div>
            </div>
          ) : (
            /* Code / Manual Verification Form */
            <>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {phone ? <Smartphone className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
                </div>
                <CardTitle className="text-xl">Enter Verification OTP</CardTitle>
                <CardDescription>
                  {email && phone ? (
                    <span>
                      We sent a 6-digit OTP code to{' '}
                      <strong className="text-foreground font-medium">{email}</strong> and via SMS to{' '}
                      <strong className="text-foreground font-medium">{phone}</strong>
                    </span>
                  ) : email ? (
                    <span>
                      We sent a 6-digit confirmation code to{' '}
                      <strong className="text-foreground font-medium">{email}</strong>
                    </span>
                  ) : phone ? (
                    <span>
                      We sent an SMS OTP code to{' '}
                      <strong className="text-foreground font-medium">{phone}</strong>
                    </span>
                  ) : (
                    'Enter your 6-digit confirmation code below'
                  )}
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleVerifyCode}>
                <CardContent className="space-y-4 pt-2">
                  {errorMessage && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                      </div>
                    </div>
                  )}

                  {!emailParam && !phoneParam && (
                    <div className="space-y-1.5 text-left">
                      <label className="block text-xs font-medium text-foreground">Email or Phone Number</label>
                      <input
                        type="text"
                        value={email || phone}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.includes('@')) {
                            setEmail(val);
                            setPhone('');
                          } else {
                            setPhone(val);
                            setEmail('');
                          }
                        }}
                        placeholder="you@example.com or +919876543210"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 text-left">
                    <label className="block text-xs font-medium text-foreground">6-Digit Verification Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center tracking-[0.4em] font-mono text-xl py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    <p className="text-[11px] text-muted-foreground text-center">
                      Enter the 6-digit code received via SMS or email.
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-3">
                  <Button type="submit" className="w-full" isLoading={isVerifying} disabled={otpCode.length < 6}>
                    Verify & Continue
                  </Button>

                  <div className="flex items-center justify-between w-full pt-1 text-xs">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending || resendCooldown > 0}
                      className="text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline flex items-center gap-1"
                    >
                      <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                      <span>{resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend code (Email & SMS)'}</span>
                    </button>

                    <Link to="/login" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <ArrowLeft className="h-3 w-3" />
                      <span>Sign in</span>
                    </Link>
                  </div>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};
