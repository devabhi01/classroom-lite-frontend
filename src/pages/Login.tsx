import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, Sparkles, UserCheck, GraduationCap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';

export const Login: React.FC = () => {
  const { login, loginAsDemo } = useAuth();
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

  const handleDemoLogin = (role: 'HOST' | 'STUDENT') => {
    loginAsDemo(role);
    navigate(redirectPath);
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
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">{errors.general}</span>
                      {isServerOffline && (
                        <p className="mt-1 text-muted-foreground">
                          Your NestJS backend server might not be running on <code className="font-mono bg-muted px-1 py-0.5 rounded">http://localhost:3000</code>. You can start the NestJS server, or explore all frontend features right now using Demo Mode below!
                        </p>
                      )}
                    </div>
                  </div>
                  {isServerOffline && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleDemoLogin('HOST')}
                      className="w-full mt-1 bg-primary text-primary-foreground text-xs"
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Continue in Demo Mode (No backend needed)
                    </Button>
                  )}
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

              <div className="relative w-full text-center my-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or try demo mode</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin('HOST')}
                  className="text-xs"
                >
                  <UserCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  Demo Host
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin('STUDENT')}
                  className="text-xs"
                >
                  <GraduationCap className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
                  Demo Student
                </Button>
              </div>

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
