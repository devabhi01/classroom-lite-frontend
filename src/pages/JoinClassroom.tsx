import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Loader2, Clock, XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import api from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/Toast';

export const JoinClassroom: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingApproval, setIsWaitingApproval] = useState(false);
  const [submittedCode, setSubmittedCode] = useState('');

  const socketRef = useRef<any>(null);

  const handleRequestJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setError('Please enter a classroom code');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const res = await api.post(`/classrooms/${cleanCode}/join`);
      const data = res.data;
      const joinStatus = data?.status || data?.data?.status;

      // If user is host or already accepted by backend immediately
      if (joinStatus === 'ACCEPTED' || data?.role === 'HOST' || data?.classroom?.hostId === user?.id) {
        toast.success('Joined classroom successfully!');
        navigate(`/classroom/${cleanCode}`);
        return;
      }

      setSubmittedCode(cleanCode);
      setIsWaitingApproval(true);

      // Connect socket to listen for approval
      const s = connectSocket();
      socketRef.current = s;

      toast.info('Join request sent to the host. Waiting for approval...');
    } catch (err: any) {
      const errMsg = err.message || '';
      // If request is already pending in the database, put the student directly into waiting mode
      if (
        errMsg.toLowerCase().includes('pending approval') ||
        errMsg.toLowerCase().includes('already pending')
      ) {
        setSubmittedCode(cleanCode);
        setIsWaitingApproval(true);
        const s = connectSocket();
        socketRef.current = s;
        toast.info('Your join request is pending approval from the host.');
        return;
      }
      setError(errMsg || 'Could not join classroom. Please check the code.');
      toast.error(errMsg || 'Classroom not found or ended');
    } finally {
      setIsLoading(false);
    }
  };

  const checkApprovalStatus = useCallback(async () => {
    if (!submittedCode) return;
    try {
      const res = await api.post(`/classrooms/${submittedCode}/join`);
      const data = res.data;
      const joinStatus = data?.status || data?.data?.status;
      if (joinStatus === 'ACCEPTED') {
        toast.success('Your join request was accepted by the host!');
        setIsWaitingApproval(false);
        navigate(`/classroom/${submittedCode}`);
      }
    } catch {
      // Still pending
    }
  }, [submittedCode, navigate]);

  // Periodic fallback check while waiting for host approval (every 3s)
  useEffect(() => {
    if (!isWaitingApproval || !submittedCode) return;
    const interval = setInterval(() => {
      checkApprovalStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [isWaitingApproval, submittedCode, checkApprovalStatus]);

  // Listen for socket events when waiting for host approval
  useEffect(() => {
    if (!isWaitingApproval || !submittedCode) return;

    const s = socketRef.current || connectSocket();
    socketRef.current = s;

    const handleAccepted = (data: { userId?: string; classroomCode?: string; code?: string }) => {
      const targetUserId = data?.userId;
      if (!targetUserId || targetUserId === user?.id) {
        toast.success('Your join request was accepted by the host!');
        setIsWaitingApproval(false);
        navigate(`/classroom/${submittedCode}`);
      }
    };

    const handleRejected = (data: { userId?: string }) => {
      const targetUserId = data?.userId;
      if (!targetUserId || targetUserId === user?.id) {
        toast.error('Your join request was rejected by the host.', 'Request Rejected');
        setIsWaitingApproval(false);
        setError('The host rejected your join request.');
      }
    };

    // On (re)connect: immediately ask backend for current status in case we missed the event
    const handleConnect = () => {
      s.emit('classroom:request:status', { classroomCode: submittedCode });
    };

    s.on('connect', handleConnect);
    s.on('classroom:request:accepted', handleAccepted);
    s.on('classroom:request:rejected', handleRejected);

    // If already connected, poll immediately
    if (s.connected) {
      handleConnect();
    }

    return () => {
      s.off('connect', handleConnect);
      s.off('classroom:request:accepted', handleAccepted);
      s.off('classroom:request:rejected', handleRejected);
    };
  }, [isWaitingApproval, submittedCode, user?.id, navigate]);

  const cancelWaiting = () => {
    setIsWaitingApproval(false);
    if (socketRef.current) {
      disconnectSocket();
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        {!isWaitingApproval ? (
          <Card className="border border-border/80 shadow-md">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2">
                <LogIn className="h-5 w-5" />
              </div>
              <CardTitle>Join a Classroom</CardTitle>
              <CardDescription>
                Enter the 6-character classroom code provided by your instructor.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleRequestJoin}>
              <CardContent className="space-y-4">
                <Input
                  label="Classroom Code"
                  placeholder="e.g. TDP8K2"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    if (error) setError('');
                  }}
                  error={error}
                  maxLength={10}
                  className="font-mono text-center tracking-widest text-lg font-bold uppercase"
                  autoFocus
                  required
                />
              </CardContent>

              <CardFooter className="flex flex-col space-y-3">
                <Button type="submit" className="w-full" isLoading={isLoading}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Request to Join
                </Button>

                <Link to="/dashboard" className="text-xs text-muted-foreground hover:underline text-center pt-1">
                  Back to Dashboard
                </Link>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card className="border-2 border-primary/20 shadow-lg text-center bg-card p-6 space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-foreground">Waiting for host approval...</h2>
              <p className="mt-2 text-xs text-muted-foreground max-w-xs">
                Your request to join classroom <span className="font-mono font-bold text-foreground">{submittedCode}</span> has been sent to the host. You will automatically enter as soon as the host approves.
              </p>
            </div>

            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground flex items-center justify-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Real-time listener connected & polling host status...</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={checkApprovalStatus}
                className="w-full sm:w-auto text-xs"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Check Approval Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelWaiting}
                className="w-full sm:w-auto text-xs"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Cancel and Return
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
