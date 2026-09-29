import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, LogIn, Clock, ArrowRight, Copy, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { Classroom } from '@/types/classroom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [recentClassrooms, setRecentClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentClassrooms = async () => {
      try {
        setIsLoading(true);
        // Attempt to fetch from backend if endpoint is supported
        const res = await api.get('/classrooms/recent');
        if (Array.isArray(res.data)) {
          setRecentClassrooms(res.data);
        } else if (res.data?.classrooms && Array.isArray(res.data.classrooms)) {
          setRecentClassrooms(res.data.classrooms);
        }
      } catch {
        // Fallback to recent classrooms saved locally
        try {
          const cached = localStorage.getItem('tdp_recent_classrooms');
          if (cached) {
            setRecentClassrooms(JSON.parse(cached));
          }
        } catch {
          // Ignore parse errors
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentClassrooms();
  }, []);

  const handleCopy = async (code: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopiedCode(code);
      toast.success(`Copied classroom code ${code}`);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const isStudent = user?.role === 'STUDENT';

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Greeting Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome, {user?.name || (isStudent ? 'Student' : 'Teacher')}
            </h1>
            <Badge variant={isStudent ? 'secondary' : 'default'} className="text-xs">
              {isStudent ? 'Student' : 'Instructor'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isStudent
              ? 'Join active classrooms with your classroom code to view slides, interact on whiteboards, and watch screen shares.'
              : 'Manage your virtual classrooms, launch interactive teaching sessions, or join active classes.'}
          </p>
        </div>
      </div>

      {/* Main Actions */}
      <div className={`grid gap-6 ${isStudent ? 'grid-cols-1 max-w-xl mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
        {!isStudent && (
          <Card className="border border-border/80 hover:border-primary/40 transition-all shadow-sm">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <PlusCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Create Classroom</CardTitle>
              <CardDescription>
                Host a new interactive classroom session with whiteboard, PDF presentation, and screen sharing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/create-classroom">
                <Button className="w-full font-medium">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Classroom
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card className={`border border-border/80 hover:border-primary/40 transition-all shadow-sm ${isStudent ? 'border-primary/40 bg-card' : ''}`}>
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2">
              <LogIn className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Join Classroom</CardTitle>
            <CardDescription>
              Enter a 6-character classroom code provided by your instructor or host to participate in an active class.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/join-classroom">
              <Button variant={isStudent ? 'default' : 'outline'} className="w-full font-medium">
                <LogIn className="mr-2 h-4 w-4" />
                Join Classroom
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Classrooms Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Recent Classrooms</h2>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8 text-xs text-muted-foreground">
            Loading recent classrooms...
          </div>
        ) : recentClassrooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-foreground">No recent classrooms found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a classroom or join an existing session using a classroom code.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentClassrooms.map((room) => {
              const isEnded = room.status === 'ENDED';

              return (
                <div
                  key={room.code || room.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs hover:border-primary/30 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-semibold text-sm text-foreground truncate">{room.name}</span>
                      <Badge variant={isEnded ? 'secondary' : 'default'} className="text-[10px] uppercase">
                        {room.status}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-4">
                      <span>Code:</span>
                      <span className="font-mono font-medium text-foreground">{room.code}</span>
                      <button
                        onClick={() => handleCopy(room.code)}
                        className="text-primary hover:opacity-80 p-0.5"
                        title="Copy code"
                      >
                        {copiedCode === room.code ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>

                  <Link to={`/classroom/${room.code}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs" disabled={isEnded}>
                      <span>{isEnded ? 'Classroom Ended' : 'Enter Classroom'}</span>
                      {!isEnded && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
