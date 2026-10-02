import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsLoading(true);
      setErrors({});
      await login({ email, password });
      navigate(redirectPath);
    } catch (err: any) {
      setErrors({ general: err.message || 'Invalid email or password' });
    } finally {
      setIsLoading(false);
    }
  };

  const isServerOffline = errors.general && (
    errors.general.toLowerCase().includes('connect') ||
    errors.general.toLowerCase().includes('server') ||
    errors.general.toLowerCase().includes('network')
  );

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo size="lg" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your classroom account</p>
        </div>

        <Card className="border border-border/80 shadow-md">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your email and password to access your dashboard</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errors.general && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">{errors.general}</span>
                      {errors.general.toLowerCase().includes('verif') && (
                        <Link
                          to={`/verify-email?email=${encodeURIComponent(email)}`}
                          className="mt-1.5 inline-block font-semibold text-primary underline"
                        >
                          Click here to enter your 6-digit verification code &rarr;
                        </Link>
                      )}
                      {isServerOffline && (
                        <p className="mt-1 text-muted-foreground">
                          Cannot connect to the server at <code className="font-mono bg-muted px-1 py-0.5 rounded">http://localhost:3000</code>. Please ensure the backend is running.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="teacher@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                autoComplete="email"
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                autoComplete="current-password"
                required
              />
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>

              <div className="text-center text-xs text-muted-foreground pt-1">
                Don&apos;t have an account?{' '}
                <Link to={`/signup${searchParams.toString() ? `?${searchParams.toString()}` : ''}`} className="font-semibold text-primary hover:underline">
                  Create one now
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
