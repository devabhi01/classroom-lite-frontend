import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  UserPlus,
  GraduationCap,
  UserCheck,
  Building2,
  Search,
  Check,
  X,
  Plus,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { institutionsApi } from '@/lib/institutions';
import { Institution } from '@/types/institution';

export const Signup: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  // Basic Account Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');

  // Teacher Institution Options
  // 'create' = Create own institution (becomes OWNER)
  // 'join' = Join existing institution (request as TEACHER)
  const [teacherOption, setTeacherOption] = useState<'create' | 'join'>('create');
  const [institutionName, setInstitutionName] = useState('');
  const [selectedTeacherInst, setSelectedTeacherInst] = useState<Institution | null>(null);
  const [teacherManualCode, setTeacherManualCode] = useState('');

  // Student Institution Options
  const [selectedStudentInsts, setSelectedStudentInsts] = useState<Institution[]>([]);

  // Institution Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Institution[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Errors & Loading
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    institution?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Live Institution Search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await institutionsApi.search(searchQuery.trim());
        setSearchResults(results);
      } catch (err) {
        console.error('Failed to search institutions', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const validate = (): boolean => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      institution?: string;
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

    if (role === 'TEACHER') {
      if (teacherOption === 'create') {
        if (!institutionName.trim()) {
          newErrors.institution = 'Institution name is required for your new organization';
        } else if (institutionName.trim().length < 3) {
          newErrors.institution = 'Institution name must be at least 3 characters';
        }
      } else if (teacherOption === 'join') {
        if (!selectedTeacherInst && !teacherManualCode.trim()) {
          newErrors.institution = 'Please select an institution or enter an institution code';
        }
      }
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

      const signupPayload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      };

      if (role === 'TEACHER') {
        if (teacherOption === 'create') {
          signupPayload.institutionName = institutionName.trim();
        } else if (teacherOption === 'join') {
          if (selectedTeacherInst) {
            signupPayload.institutionId = selectedTeacherInst.id;
          } else if (teacherManualCode.trim()) {
            signupPayload.institutionCode = teacherManualCode.trim().toUpperCase();
          }
        }
      } else if (role === 'STUDENT') {
        const instIds = selectedStudentInsts.map((i) => i.id);
        if (instIds.length > 0) {
          signupPayload.institutionIds = instIds;
        }
      }

      await signup(signupPayload);
      navigate(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to create account. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStudentInstitution = (inst: Institution) => {
    if (!selectedStudentInsts.some((i) => i.id === inst.id)) {
      setSelectedStudentInsts([...selectedStudentInsts, inst]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveStudentInstitution = (instId: string) => {
    setSelectedStudentInsts(selectedStudentInsts.filter((i) => i.id !== instId));
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
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
                    onClick={() => {
                      setRole('STUDENT');
                      setErrors((prev) => ({ ...prev, institution: undefined }));
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all ${
                      role === 'STUDENT'
                        ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                        : 'border-input hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span>Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('TEACHER');
                      setErrors((prev) => ({ ...prev, institution: undefined }));
                    }}
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
              </div>

              {/* Basic Fields */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Password"
                  type="password"
                  placeholder="Min. 6 chars"
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
              </div>

              {/* TEACHER INSTITUTION SECTION */}
              {role === 'TEACHER' && (
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>Institution Setup for Teachers</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTeacherOption('create')}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-all ${
                        teacherOption === 'create'
                          ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                          : 'border-input hover:bg-background text-muted-foreground'
                      }`}
                    >
                      <div className="font-semibold">Create Institution</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        Start your own institute as Owner
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTeacherOption('join')}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-all ${
                        teacherOption === 'join'
                          ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                          : 'border-input hover:bg-background text-muted-foreground'
                      }`}
                    >
                      <div className="font-semibold">Join Institution</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        Request to join an existing one
                      </div>
                    </button>
                  </div>

                  {errors.institution && (
                    <div className="text-xs text-destructive font-medium">{errors.institution}</div>
                  )}

                  {teacherOption === 'create' ? (
                    <div className="space-y-1.5 pt-1">
                      <Input
                        label="Institution Name"
                        placeholder="e.g. Apex Academy, Rao Institute"
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        required
                      />
                      <p className="text-[11px] text-muted-foreground">
                        You will become the Owner of this institution and can immediately create classrooms under it.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {selectedTeacherInst ? (
                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/40 bg-primary/5">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <div>
                              <div className="text-xs font-semibold text-foreground">{selectedTeacherInst.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">Code: {selectedTeacherInst.code}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedTeacherInst(null)}
                            className="text-muted-foreground hover:text-destructive p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search institution name or code..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          {isSearching && (
                            <div className="text-[11px] text-muted-foreground py-1">Searching institutions...</div>
                          )}

                          {searchResults.length > 0 && (
                            <div className="max-h-36 overflow-y-auto rounded-lg border border-border bg-card p-1 space-y-1">
                              {searchResults.map((inst) => (
                                <button
                                  key={inst.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTeacherInst(inst);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                    setTeacherManualCode('');
                                  }}
                                  className="w-full flex items-center justify-between p-2 rounded text-left text-xs hover:bg-muted"
                                >
                                  <span className="font-medium text-foreground">{inst.name}</span>
                                  <Badge variant="outline" className="font-mono text-[10px]">
                                    {inst.code}
                                  </Badge>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[11px] text-muted-foreground">Or enter code:</span>
                            <input
                              type="text"
                              placeholder="e.g. TDP82K4"
                              value={teacherManualCode}
                              onChange={(e) => setTeacherManualCode(e.target.value.toUpperCase())}
                              className="w-28 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Your teacher membership request will be pending until approved by the institution owner.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* STUDENT INSTITUTION SECTION */}
              {role === 'STUDENT' && (
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span>Select Institutions (Optional)</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Optional</span>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    You can join institutions to access their exclusive classrooms, or skip this and join later.
                  </p>

                  {/* Selected Institution Chips */}
                  {selectedStudentInsts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedStudentInsts.map((inst) => (
                        <span
                          key={inst.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium"
                        >
                          <span>{inst.name}</span>
                          <span className="text-[10px] font-mono opacity-70">({inst.code})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStudentInstitution(inst.id)}
                            className="hover:opacity-75"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Institution Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search to add institutions (e.g. Apex Academy)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {isSearching && (
                    <div className="text-[11px] text-muted-foreground py-1">Searching institutions...</div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-border bg-card p-1 space-y-1">
                      {searchResults.map((inst) => {
                        const isAdded = selectedStudentInsts.some((i) => i.id === inst.id);
                        return (
                          <button
                            key={inst.id}
                            type="button"
                            disabled={isAdded}
                            onClick={() => handleSelectStudentInstitution(inst)}
                            className={`w-full flex items-center justify-between p-2 rounded text-left text-xs transition-colors ${
                              isAdded ? 'opacity-50 cursor-not-allowed bg-muted/50' : 'hover:bg-muted'
                            }`}
                          >
                            <span className="font-medium text-foreground">{inst.name}</span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {inst.code}
                              </Badge>
                              {isAdded ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Plus className="h-3.5 w-3.5 text-primary" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link
                  to={`/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
                  className="font-semibold text-primary hover:underline"
                >
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
