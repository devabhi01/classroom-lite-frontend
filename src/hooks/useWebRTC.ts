import { useState, useRef, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { toast } from '@/components/ui/Toast';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface UseWebRTCProps {
  socket: Socket | null;
  classroomCode: string;
  userId: string;
  isHost: boolean;
}

export const useWebRTC = ({
  socket,
  classroomCode,
  userId,
  isHost,
}: UseWebRTCProps) => {
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  // Map of studentId -> RTCPeerConnection for the host
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  // Single RTCPeerConnection for the student receiving from host
  const studentPcRef = useRef<RTCPeerConnection | null>(null);

  // Stop sharing cleanup
  const stopScreenShare = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all host peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    setLocalStream(null);
    setIsSharing(false);

    if (socket && socket.connected) {
      socket.emit('webrtc:screen-stopped', { classroomCode });
      socket.emit('screenshare:stopped', { classroomCode });
    }

    toast.info('Screen sharing stopped');
  }, [socket, classroomCode]);

  // Host starts screen share
  const startScreenShare = useCallback(async () => {
    if (!isHost) {
      toast.error('Only the host can start screen sharing.');
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsSharing(true);

      // Listen for browser native stop share button
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      if (socket && socket.connected) {
        socket.emit('screenshare:started', { classroomCode, hostId: userId });
        socket.emit('webrtc:host-sharing', { classroomCode, hostId: userId });
      }

      toast.success('Screen sharing started');
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        toast.info('Screen share cancelled by user');
      } else {
        toast.error('Failed to start screen share: ' + (err.message || 'Unknown error'));
      }
    }
  }, [isHost, socket, classroomCode, userId, stopScreenShare]);

  // Socket signaling listener
  useEffect(() => {
    if (!socket) return;

    // STUDENT: Handle offer from host
    const handleOffer = async (data: {
      offer: RTCSessionDescriptionInit;
      fromUserId: string;
      classroomCode?: string;
    }) => {
      if (isHost) return; // Only students accept offers from host

      try {
        if (studentPcRef.current) {
          studentPcRef.current.close();
        }

        const pc = new RTCPeerConnection(RTC_CONFIG);
        studentPcRef.current = pc;

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
            setIsSharing(true);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc:ice-candidate', {
              classroomCode,
              candidate: event.candidate,
              targetUserId: data.fromUserId,
              fromUserId: userId,
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setRemoteStream(null);
            setIsSharing(false);
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc:answer', {
          classroomCode,
          answer,
          targetUserId: data.fromUserId,
          fromUserId: userId,
        });
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    };

    // HOST: Handle answer from a student
    const handleAnswer = async (data: {
      answer: RTCSessionDescriptionInit;
      fromUserId: string;
    }) => {
      if (!isHost) return;

      const pc = peerConnectionsRef.current.get(data.fromUserId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (err) {
          console.error('Error setting remote description for answer:', err);
        }
      }
    };

    // BOTH: Handle ICE candidate
    const handleIceCandidate = async (data: {
      candidate: RTCIceCandidateInit;
      fromUserId: string;
      targetUserId?: string;
    }) => {
      // If candidate has a specific target and it's not us, ignore
      if (data.targetUserId && data.targetUserId !== userId) return;

      try {
        const candidate = new RTCIceCandidate(data.candidate);
        if (isHost) {
          const pc = peerConnectionsRef.current.get(data.fromUserId);
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(candidate);
          }
        } else {
          if (studentPcRef.current && studentPcRef.current.remoteDescription) {
            await studentPcRef.current.addIceCandidate(candidate);
          }
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    // HOST: Student requests screen stream or announces readiness
    const handleStudentReadyForStream = async (data: { studentId: string }) => {
      if (!isHost || !localStreamRef.current) return;

      const studentId = data.studentId;
      try {
        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnectionsRef.current.set(studentId, pc);

        // Add screen tracks to peer connection
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc:ice-candidate', {
              classroomCode,
              candidate: event.candidate,
              targetUserId: studentId,
              fromUserId: userId,
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('webrtc:offer', {
          classroomCode,
          offer,
          targetUserId: studentId,
          fromUserId: userId,
        });
      } catch (err) {
        console.error('Error initiating WebRTC connection with student:', err);
      }
    };

    // STUDENT: Notification that host started sharing
    const handleHostSharing = () => {
      if (!isHost) {
        // Notify host that we are ready to receive stream
        socket.emit('webrtc:student-ready', { classroomCode, studentId: userId });
      }
    };

    // STUDENT: Notification that host stopped sharing
    const handleHostStoppedSharing = () => {
      if (!isHost) {
        if (studentPcRef.current) {
          studentPcRef.current.close();
          studentPcRef.current = null;
        }
        setRemoteStream(null);
        setIsSharing(false);
        toast.info('Host stopped screen sharing');
      }
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('webrtc:student-ready', handleStudentReadyForStream);
    socket.on('webrtc:host-sharing', handleHostSharing);
    socket.on('screenshare:started', handleHostSharing);
    socket.on('webrtc:screen-stopped', handleHostStoppedSharing);
    socket.on('screenshare:stopped', handleHostStoppedSharing);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('webrtc:student-ready', handleStudentReadyForStream);
      socket.off('webrtc:host-sharing', handleHostSharing);
      socket.off('screenshare:started', handleHostSharing);
      socket.off('webrtc:screen-stopped', handleHostStoppedSharing);
      socket.off('screenshare:stopped', handleHostStoppedSharing);
    };
  }, [socket, isHost, classroomCode, userId]);

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      if (studentPcRef.current) {
        studentPcRef.current.close();
      }
    };
  }, []);

  return {
    isSharing,
    localStream,
    remoteStream,
    startScreenShare,
    stopScreenShare,
  };
};
