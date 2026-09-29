import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import api from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { toast } from '@/components/ui/Toast';
import { Classroom, WorkspaceTab } from '@/types/classroom';
import { Participant, JoinRequest } from '@/types/participant';
import { PdfState } from '@/types/pdf';
import { WhiteboardOperation } from '@/types/whiteboard';
import { User } from '@/types/auth';

interface UseClassroomProps {
  classroomCode: string;
  currentUser: User | null;
}

export const useClassroom = ({ classroomCode, currentUser }: UseClassroomProps) => {
  const navigate = useNavigate();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('whiteboard');
  const [initialPdf, setInitialPdf] = useState<PdfState | null>(null);
  const [initialWhiteboard, setInitialWhiteboard] = useState<WhiteboardOperation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const isHost = classroom?.hostId === currentUser?.id;

  // 1. Fetch classroom details via REST API
  const fetchClassroom = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/classrooms/${classroomCode}`);
      const data = res.data;
      const rawRoom = data.classroom || data.data || data;

      const roomData: Classroom = {
        id: rawRoom.id || rawRoom._id,
        name: rawRoom.name || `Classroom ${classroomCode}`,
        code: rawRoom.code || classroomCode,
        hostId: rawRoom.hostId || rawRoom.host?.id || rawRoom.host?._id || '',
        status: rawRoom.status || 'ACTIVE',
        createdAt: rawRoom.createdAt,
      };
      setClassroom(roomData);

      if (roomData.status === 'ENDED') {
        setError('This classroom has ended.');
        toast.warning('This classroom has ended.');
        return;
      }

      // Fetch participants list via REST
      try {
        const partRes = await api.get(`/classrooms/${classroomCode}/participants`);
        const partData = partRes.data?.data || partRes.data;
        if (Array.isArray(partData)) {
          setParticipants(partData);
        }
      } catch {
        // Non-blocking
      }

      // If user is host, fetch pending join requests via REST
      const userIsHost = roomData.hostId === currentUser?.id;
      if (userIsHost) {
        try {
          const reqRes = await api.get(`/classrooms/${classroomCode}/requests`);
          const reqData = reqRes.data?.data || reqRes.data;
          if (Array.isArray(reqData)) {
            setPendingRequests(reqData);
          }
        } catch {
          // Non-blocking
        }
      }

      if (rawRoom.activePdf) {
        setInitialPdf(rawRoom.activePdf);
        setActiveTab('pdf');
      } else if (data.pdf) {
        setInitialPdf(data.pdf);
        setActiveTab('pdf');
      }

      if (data.whiteboard && Array.isArray(data.whiteboard)) {
        setInitialWhiteboard(data.whiteboard);
      }

      if (data.activeTab) {
        setActiveTab(data.activeTab);
      }
    } catch (err: any) {
      console.error('Error fetching classroom:', err);
      const msg = err.message || 'Classroom not found';
      setError(msg);
      toast.error(msg, 'Classroom Error');
    } finally {
      setLoading(false);
    }
  }, [classroomCode, currentUser?.id]);

  const enableDemoMode = useCallback(() => {
    const isStudentUser = currentUser?.role === 'STUDENT';
    const hostId = isStudentUser ? 'demo_teacher_host' : (currentUser?.id || 'demo_host_101');

    const demoRoom: Classroom = {
      id: 'demo_' + classroomCode,
      name: classroomCode === 'DEMO101' ? 'Distributed Systems 101 (Demo Class)' : `Classroom (${classroomCode})`,
      code: classroomCode,
      hostId,
      status: 'ACTIVE',
    };
    setClassroom(demoRoom);

    // Populate realistic participants for demo
    const mockParticipants: Participant[] = isStudentUser
      ? [
          {
            userId: 'demo_teacher_host',
            name: 'Prof. Abhishek',
            role: 'HOST',
            status: 'ACCEPTED',
          },
          {
            userId: currentUser?.id || 'demo_student_me',
            name: currentUser?.name || 'Alex Kumar',
            role: 'STUDENT',
            status: 'ACCEPTED',
          },
          {
            userId: 'demo_student_sarah',
            name: 'Sarah Connor',
            role: 'STUDENT',
            status: 'ACCEPTED',
          },
          {
            userId: 'demo_student_dev',
            name: 'Dev Patel',
            role: 'STUDENT',
            status: 'ACCEPTED',
          },
          {
            userId: 'demo_student_priya',
            name: 'Priya Sharma',
            role: 'STUDENT',
            status: 'ACCEPTED',
          },
        ]
      : [
          {
            userId: currentUser?.id || 'demo_host_101',
            name: currentUser?.name || 'Prof. Abhishek',
            role: 'HOST',
            status: 'ACCEPTED',
          },
          {
            userId: 'demo_student_alex',
            name: 'Alex Kumar',
            role: 'STUDENT',
            status: 'ACCEPTED',
          },
          {
            userId: 'demo_student_sarah',
            name: 'Sarah Connor',
            role: 'STUDENT',
            status: 'ACCEPTED',
          },
          {
            userId: 'demo_student_dev',
            name: 'Dev Patel',
            role: 'STUDENT',
            status: 'ACCEPTED',
          },
        ];

    setParticipants(mockParticipants);

    // Initial mock PDF presentation
    setInitialPdf({
      fileName: 'Distributed-Systems-Architecture.pdf',
      fileUrl: '',
      totalPages: 10,
      currentPage: 1,
    });

    // Initial mock whiteboard welcoming strokes
    setInitialWhiteboard([
      { type: 'draw', x1: 0.2, y1: 0.25, x2: 0.8, y2: 0.25, color: '#2563eb', width: 4 },
      { type: 'draw', x1: 0.2, y1: 0.5, x2: 0.8, y2: 0.5, color: '#2563eb', width: 4 },
      { type: 'draw', x1: 0.2, y1: 0.25, x2: 0.2, y2: 0.5, color: '#2563eb', width: 4 },
      { type: 'draw', x1: 0.8, y1: 0.25, x2: 0.8, y2: 0.5, color: '#2563eb', width: 4 },
      { type: 'draw', x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.75, color: '#dc2626', width: 3 },
    ]);

    setError(null);
    toast.info(
      isStudentUser
        ? 'Welcome to Student Demo Mode! Viewing Prof. Abhishek\'s class.'
        : 'Welcome to Instructor Demo Mode! Whiteboard, PDF, and Screen Share are ready.',
      'Demo Classroom'
    );
  }, [classroomCode, currentUser]);

  useEffect(() => {
    if (classroomCode === 'DEMO101') {
      enableDemoMode();
      setLoading(false);
      return;
    }
    fetchClassroom();
  }, [classroomCode, enableDemoMode, fetchClassroom]);

  // 2. Connect Socket.IO and establish real-time listeners
  useEffect(() => {
    if (!currentUser || !classroomCode) return;

    const s = connectSocket();
    socketRef.current = s;
    setSocket(s);

    const onConnect = () => {
      // Join room & synchronize state
      s.emit('classroom:join', { classroomCode, code: classroomCode });
      s.emit('classroom:sync', { classroomCode, code: classroomCode });
    };

    const onDisconnect = () => {
      // Socket disconnected
    };

    const onConnectError = (err: any) => {
      console.warn('Socket connection error:', err?.message || err);
    };

    // Full state sync
    const handleClassroomState = (state: any) => {
      if (!state) return;
      if (state.classroom) {
        const raw = state.classroom;
        setClassroom((prev) => ({
          id: raw.id || raw._id || prev?.id || '',
          name: raw.name || prev?.name || `Classroom ${classroomCode}`,
          code: raw.code || prev?.code || classroomCode,
          hostId: raw.hostId || raw.host?.id || prev?.hostId || '',
          status: raw.status || prev?.status || 'ACTIVE',
        }));
      }
      if (state.participants && Array.isArray(state.participants)) {
        setParticipants(state.participants);
      }
      if (state.pendingRequests && Array.isArray(state.pendingRequests)) {
        setPendingRequests(state.pendingRequests);
      }
      if (state.activeTab) setActiveTab(state.activeTab);
      if (state.activePdf) {
        setInitialPdf(state.activePdf);
        setActiveTab('pdf');
      } else if (state.pdf) {
        setInitialPdf(state.pdf);
        setActiveTab('pdf');
      }
      if (state.whiteboard && Array.isArray(state.whiteboard)) {
        setInitialWhiteboard(state.whiteboard);
      }
    };

    // Participants updates
    const handleUserJoined = (data: { participant?: Participant; user?: any } | Participant) => {
      const p: Participant = 'participant' in data && data.participant ? data.participant : (data as Participant);
      if (!p || !p.userId) return;

      setParticipants((prev) => {
        const exists = prev.some((item) => item.userId === p.userId);
        if (exists) {
          return prev.map((item) => (item.userId === p.userId ? { ...item, ...p, status: 'ACCEPTED' } : item));
        }
        return [...prev, { ...p, status: 'ACCEPTED' }];
      });
      toast.info(`${p.name} joined the classroom`);
    };

    const handleUserLeft = (data: { userId?: string } | string) => {
      const uid = typeof data === 'string' ? data : data.userId;
      if (!uid) return;

      setParticipants((prev) => {
        const leaving = prev.find((p) => p.userId === uid);
        if (leaving) {
          toast.info(`${leaving.name} left the classroom`);
        }
        return prev.filter((p) => p.userId !== uid);
      });
    };

    const handleParticipantUpdated = (p: Participant) => {
      if (!p || !p.userId) return;
      setParticipants((prev) => prev.map((item) => (item.userId === p.userId ? { ...item, ...p } : item)));
    };

    // Join Requests (for Host)
    const handleNewRequest = (req: { request?: JoinRequest } | JoinRequest) => {
      const joinReq: JoinRequest = 'request' in req && req.request ? req.request : (req as JoinRequest);
      if (!joinReq || !joinReq.userId) return;

      setPendingRequests((prev) => {
        if (prev.some((item) => item.userId === joinReq.userId)) return prev;
        return [...prev, joinReq];
      });
      toast.info(`Join request from ${joinReq.name}`, 'New Student Request');
    };

    // Classroom Ended
    const handleClassroomEnded = () => {
      toast.warning('The host has ended this classroom session.', 'Classroom Ended');
      setClassroom((prev) => (prev ? { ...prev, status: 'ENDED' } : null));
      setTimeout(() => {
        navigate('/dashboard');
      }, 2500);
    };

    // Tab Change synchronization
    const handleTabChange = (data: { activeTab?: WorkspaceTab; tab?: WorkspaceTab } | WorkspaceTab) => {
      const newTab: WorkspaceTab =
        typeof data === 'string'
          ? (data as WorkspaceTab)
          : data.activeTab || data.tab || 'whiteboard';
      setActiveTab(newTab);
    };

    // PDF sync: when host shares a PDF, auto-switch non-host students to pdf tab
    const handlePdfShared = (payload: any) => {
      console.log('>>> [useClassroom] Received pdf:shared socket event:', payload);
      const incomingPdf = payload?.pdf || payload;
      if (incomingPdf?.fileName) {
        setInitialPdf(incomingPdf);
        setActiveTab('pdf');
        if (!isHost) {
          toast.info(`Host shared: ${incomingPdf.fileName}`, 'New PDF Presentation');
        }
      }
    };

    // PDF closed: switch back to whiteboard tab
    const handlePdfClosed = () => {
      setInitialPdf(null);
      setActiveTab('whiteboard');
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);
    s.on('classroom:state', handleClassroomState);
    s.on('classroom:user-joined', handleUserJoined);
    s.on('classroom:user-left', handleUserLeft);
    s.on('classroom:participant-updated', handleParticipantUpdated);
    s.on('classroom:request:new', handleNewRequest);
    s.on('classroom:ended', handleClassroomEnded);
    s.on('classroom:tab-change', handleTabChange);
    s.on('pdf:shared', handlePdfShared);
    s.on('pdf:share', handlePdfShared);
    s.on('pdf:closed', handlePdfClosed);
    s.on('pdf:close', handlePdfClosed);

    // If socket already connected, join room directly
    if (s.connected) {
      onConnect();
    } else {
      s.connect();
    }

    return () => {
      if (s) {
        s.emit('classroom:leave', { classroomCode });
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
        s.off('connect_error', onConnectError);
        s.off('classroom:state', handleClassroomState);
        s.off('classroom:user-joined', handleUserJoined);
        s.off('classroom:user-left', handleUserLeft);
        s.off('classroom:participant-updated', handleParticipantUpdated);
        s.off('classroom:request:new', handleNewRequest);
        s.off('classroom:ended', handleClassroomEnded);
        s.off('classroom:tab-change', handleTabChange);
        s.off('pdf:shared', handlePdfShared);
        s.off('pdf:share', handlePdfShared);
        s.off('pdf:closed', handlePdfClosed);
        s.off('pdf:close', handlePdfClosed);
      }
    };
  }, [classroomCode, currentUser?.id, navigate]);

  // Periodic poll for host pending requests (every 3 seconds)
  useEffect(() => {
    if (!isHost || classroomCode === 'DEMO101') return;

    const interval = setInterval(async () => {
      try {
        const reqRes = await api.get(`/classrooms/${classroomCode}/requests`);
        const reqData = reqRes.data?.data || reqRes.data;
        if (Array.isArray(reqData)) {
          setPendingRequests(reqData);
        }
      } catch {
        // Non-blocking
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isHost, classroomCode]);

  // Host Action: Accept Join Request
  const acceptJoinRequest = useCallback(
    async (targetUserId: string) => {
      try {
        await api.post(`/classrooms/${classroomCode}/requests/${targetUserId}/accept`);
        setPendingRequests((prev) => prev.filter((r) => r.userId !== targetUserId));
        if (socket && socket.connected) {
          socket.emit('classroom:request:accepted', { classroomCode, userId: targetUserId });
        }
        // Immediately fetch updated participants list
        try {
          const partRes = await api.get(`/classrooms/${classroomCode}/participants`);
          const partData = partRes.data?.data || partRes.data;
          if (Array.isArray(partData)) setParticipants(partData);
        } catch {}
        toast.success('Join request accepted');
      } catch (err: any) {
        toast.error(err.message || 'Failed to accept request');
      }
    },
    [classroomCode, socket]
  );

  // Host Action: Reject Join Request
  const rejectJoinRequest = useCallback(
    async (targetUserId: string) => {
      try {
        await api.post(`/classrooms/${classroomCode}/requests/${targetUserId}/reject`);
        setPendingRequests((prev) => prev.filter((r) => r.userId !== targetUserId));
        if (socket && socket.connected) {
          socket.emit('classroom:request:rejected', { classroomCode, userId: targetUserId });
        }
        toast.info('Join request rejected');
      } catch (err: any) {
        toast.error(err.message || 'Failed to reject request');
      }
    },
    [classroomCode, socket]
  );

  // Switch Workspace Tab (host broadcasts; student switches local view only)
  const switchTab = useCallback(
    (tab: WorkspaceTab) => {
      setActiveTab(tab);
      // Only the host broadcasts tab changes to students
      if (isHost && socket && socket.connected) {
        socket.emit('classroom:tab-change', { classroomCode, tab, activeTab: tab });
      }
    },
    [socket, classroomCode, isHost]
  );

  // Host Action: End Classroom
  const endClassroom = useCallback(async () => {
    try {
      await api.post(`/classrooms/${classroomCode}/end`);
      if (socket && socket.connected) {
        socket.emit('classroom:ended', { classroomCode });
      }
      disconnectSocket();
      toast.info('Classroom ended successfully');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to end classroom');
    }
  }, [classroomCode, socket, navigate]);

  // Leave Classroom
  const leaveClassroom = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit('classroom:leave', { classroomCode });
    }
    disconnectSocket();
    navigate('/dashboard');
  }, [socket, classroomCode, navigate]);

  return {
    socket,
    classroom,
    isHost,
    participants,
    pendingRequests,
    activeTab,
    initialPdf,
    initialWhiteboard,
    loading,
    error,
    switchTab,
    acceptJoinRequest,
    rejectJoinRequest,
    endClassroom,
    leaveClassroom,
    enableDemoMode,
    refreshClassroom: fetchClassroom,
  };
};
