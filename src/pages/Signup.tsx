import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, GraduationCap, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';

export const Signup: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

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

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      await signup({ name: name.trim(), email: email.trim(), password, role });
      navigate(redirectPath);
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to create account. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo size="lg" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Create an account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Join TDP Classroom Lite to teach or learn</p>
        </div>

        <Card className="border border-border/80 shadow-md">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Enter your details to create your teacher or student account</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errors.general && (
                <div className="rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive">
                  {errors.general}
                </div>
              )}

              {/* Role Selector: Student vs Teacher */}
              <div className="space-y-1.5 text-left">
                <label className="block text-sm font-medium text-foreground">Account Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('STUDENT')}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                      role === 'STUDENT'
                        ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                        : 'border-input hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span>Student (Join only)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('TEACHER')}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                      role === 'TEACHER'
                        ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                        : 'border-input hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Teacher (Host)</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {role === 'STUDENT'
                    ? 'Students can join and participate in classrooms using a classroom code.'
                    : 'Teachers can create, host, and moderate classroom sessions.'}
                </p>
              </div>

              <Input
                label="Full Name"
                type="text"
                placeholder="Abhishek Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                autoComplete="name"
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="abhishek@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                autoComplete="email"
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                autoComplete="new-password"
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                autoComplete="new-password"
                required
              />
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link to={`/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`} className="font-semibold text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
