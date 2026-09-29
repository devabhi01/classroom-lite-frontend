import { useState, useRef, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { toast } from '@/components/ui/Toast';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export interface RemoteStream {
  userId: string;
  name: string;
  stream: MediaStream;
  audioMuted: boolean;
  videoMuted: boolean;
}

interface UseVoiceChatProps {
  socket: Socket | null;
  classroomCode: string;
  userId: string;
  userName: string;
  participants: Array<{ userId: string; name: string; status: string }>;
}

export const useVoiceChat = ({
  socket,
  classroomCode,
  userId,
  userName,
  participants,
}: UseVoiceChatProps) => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, RemoteStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const isActiveRef = useRef<boolean>(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // Helper to attach local stream tracks to a peer connection
  const addLocalTracksToPc = (pc: RTCPeerConnection, stream: MediaStream) => {
    const existingSenders = pc.getSenders();
    stream.getTracks().forEach((track) => {
      const alreadyAdded = existingSenders.some((s) => s.track?.id === track.id);
      if (!alreadyAdded) {
        pc.addTrack(track, stream);
      }
    });
  };

  // Create a peer connection for a specific remote peer
  const createPeerConnection = useCallback(
    (peerId: string, peerName: string): RTCPeerConnection => {
      const existing = peerConnectionsRef.current.get(peerId);
      if (existing) {
        if (existing.signalingState !== 'closed') {
          return existing;
        }
        existing.close();
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionsRef.current.set(peerId, pc);

      // Add local stream tracks if available
      if (localStreamRef.current) {
        addLocalTracksToPc(pc, localStreamRef.current);
      }

      // Receive remote tracks
      pc.ontrack = (event) => {
        const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          const prevEntry = updated.get(peerId);
          updated.set(peerId, {
            userId: peerId,
            name: peerName || prevEntry?.name || 'Participant',
            stream,
            audioMuted: prevEntry?.audioMuted ?? false,
            videoMuted: prevEntry?.videoMuted ?? false,
          });
          return updated;
        });
      };

      // Send ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket?.connected) {
          socket.emit('voicechat:ice-candidate', {
            classroomCode,
            targetUserId: peerId,
            fromUserId: userId,
            candidate: event.candidate,
          });
        }
      };

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          // Remove remote stream on permanent disconnect
          if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            setRemoteStreams((prev) => {
              const updated = new Map(prev);
              updated.delete(peerId);
              return updated;
            });
            peerConnectionsRef.current.delete(peerId);
          }
        }
      };

      return pc;
    },
    [socket, classroomCode, userId]
  );

  // Helper: initiate an offer to a peer
  const initiateOfferToPeer = useCallback(
    async (peerId: string, peerName: string) => {
      if (!socket?.connected || peerId === userId) return;

      try {
        const pc = createPeerConnection(peerId, peerName);
        if (localStreamRef.current) {
          addLocalTracksToPc(pc, localStreamRef.current);
        }

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });

        await pc.setLocalDescription(offer);

        socket.emit('voicechat:offer', {
          classroomCode,
          targetUserId: peerId,
          fromUserId: userId,
          fromUserName: userName,
          offer,
        });
      } catch (err) {
        console.error('Error initiating offer to peer:', peerId, err);
      }
    },
    [socket, classroomCode, userId, userName, createPeerConnection]
  );

  // Start the call — acquire media and signal all current participants
  const startVoiceChat = useCallback(
    async (withVideo = true) => {
      if (isActiveRef.current && localStreamRef.current) {
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: withVideo
              ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } }
              : false,
          });
        } catch (mediaErr: any) {
          // If video permission failed or no camera, try audio only
          if (withVideo) {
            console.warn('Video acquisition failed, falling back to audio only:', mediaErr);
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            withVideo = false;
          } else {
            throw mediaErr;
          }
        }

        localStreamRef.current = stream;
        isActiveRef.current = true;
        setLocalStream(stream);
        setIsActive(true);
        setAudioEnabled(true);
        setVideoEnabled(withVideo);

        // Attach local tracks to any already-created peer connections
        peerConnectionsRef.current.forEach((pc) => {
          addLocalTracksToPc(pc, stream);
        });

        // Announce to all participants that we joined voice/video chat
        if (socket?.connected) {
          socket.emit('voicechat:joined', {
            classroomCode,
            userId,
            userName,
            hasVideo: withVideo,
          });
        }

        toast.success(withVideo ? 'Camera & microphone connected' : 'Microphone connected');
      } catch (err: any) {
        console.error('getUserMedia error:', err);
        if (err.name === 'NotAllowedError') {
          toast.error('Permission denied for camera/microphone');
        } else if (err.name === 'NotFoundError') {
          toast.error('No camera or microphone found on your device');
        } else {
          toast.error('Media error: ' + (err.message || 'Could not start audio/video'));
        }
      }
    },
    [socket, classroomCode, userId, userName]
  );

  // Stop the call
  const stopVoiceChat = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();

    isActiveRef.current = false;
    setLocalStream(null);
    setRemoteStreams(new Map());
    setIsActive(false);

    if (socket?.connected) {
      socket.emit('voicechat:left', { classroomCode, userId });
    }

    toast.info('Left voice & video chat');
  }, [socket, classroomCode, userId]);

  // Toggle microphone
  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    const newState = !audioEnabled;
    audioTracks.forEach((t) => (t.enabled = newState));
    setAudioEnabled(newState);
    if (socket?.connected) {
      socket.emit('voicechat:mute-state', {
        classroomCode,
        userId,
        audioMuted: !newState,
        videoMuted: !videoEnabled,
      });
    }
  }, [audioEnabled, videoEnabled, socket, classroomCode, userId]);

  // Toggle camera
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    const newState = !videoEnabled;
    videoTracks.forEach((t) => (t.enabled = newState));
    setVideoEnabled(newState);
    if (socket?.connected) {
      socket.emit('voicechat:mute-state', {
        classroomCode,
        userId,
        audioMuted: !audioEnabled,
        videoMuted: !newState,
      });
    }
  }, [videoEnabled, audioEnabled, socket, classroomCode, userId]);

  // Host force mute
  const forceMuteUser = useCallback(
    (targetUserId: string) => {
      if (socket?.connected) {
        socket.emit('voicechat:force-mute', { classroomCode, targetUserId });
        toast.success('Mute command sent');
      }
    },
    [socket, classroomCode]
  );

  // Socket signaling setup
  useEffect(() => {
    if (!socket) return;

    // Server sends list of existing peers in this classroom
    const handleExistingPeers = async (data: { classroomCode: string; peers: Array<{ userId: string; userName: string; hasVideo: boolean }> }) => {
      if (!data?.peers) return;
      for (const peer of data.peers) {
        if (peer.userId === userId) continue;
        // Initiate connection to existing peer
        await initiateOfferToPeer(peer.userId, peer.userName);
      }
    };

    // A remote peer joined voice chat
    const handlePeerJoined = async (data: { userId: string; userName: string; hasVideo: boolean }) => {
      if (data.userId === userId) return;

      // Determine polite peer role: higher userId initiates
      const shouldInitiate = userId > data.userId;
      if (shouldInitiate) {
        await initiateOfferToPeer(data.userId, data.userName);
      }
    };

    // Received an offer from a peer
    const handleOffer = async (data: { fromUserId: string; fromUserName?: string; offer: RTCSessionDescriptionInit }) => {
      if (data.fromUserId === userId || !data.offer) return;

      try {
        const peerName = data.fromUserName || participants.find((p) => p.userId === data.fromUserId)?.name || 'Participant';
        const pc = createPeerConnection(data.fromUserId, peerName);

        if (localStreamRef.current) {
          addLocalTracksToPc(pc, localStreamRef.current);
        }

        // Handle collision (perfect negotiation)
        const isPolite = userId > data.fromUserId;
        const offerCollision = pc.signalingState !== 'stable';
        if (offerCollision) {
          if (!isPolite) {
            // Impolite peer ignores colliding offer
            return;
          }
          await pc.setLocalDescription({ type: 'rollback' } as any);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        // Flush any pending ICE candidates
        const pending = pendingCandidatesRef.current.get(data.fromUserId) || [];
        for (const c of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch {}
        }
        pendingCandidatesRef.current.delete(data.fromUserId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('voicechat:answer', {
          classroomCode,
          targetUserId: data.fromUserId,
          fromUserId: userId,
          answer,
        });
      } catch (err) {
        console.error('Error handling voicechat offer:', err);
      }
    };

    // Received an answer from a peer
    const handleAnswer = async (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnectionsRef.current.get(data.fromUserId);
      if (!pc || !data.answer) return;

      try {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

          // Flush any pending ICE candidates
          const pending = pendingCandidatesRef.current.get(data.fromUserId) || [];
          for (const c of pending) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            } catch {}
          }
          pendingCandidatesRef.current.delete(data.fromUserId);
        }
      } catch (err) {
        console.error('Error handling voicechat answer:', err);
      }
    };

    // Received ICE candidate
    const handleIceCandidate = async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      if (!data.candidate || data.fromUserId === userId) return;

      const pc = peerConnectionsRef.current.get(data.fromUserId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {}
      } else {
        const pending = pendingCandidatesRef.current.get(data.fromUserId) || [];
        pending.push(data.candidate);
        pendingCandidatesRef.current.set(data.fromUserId, pending);
      }
    };

    // Remote peer left
    const handlePeerLeft = (data: { userId: string }) => {
      const pc = peerConnectionsRef.current.get(data.userId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(data.userId);
      }
      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        updated.delete(data.userId);
        return updated;
      });
    };

    // Remote peer mute state changed
    const handleMuteState = (data: { userId: string; audioMuted: boolean; videoMuted: boolean }) => {
      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(data.userId);
        if (existing) {
          updated.set(data.userId, {
            ...existing,
            audioMuted: data.audioMuted,
            videoMuted: data.videoMuted,
          });
        }
        return updated;
      });
    };

    // Received force mute command from host
    const handleForceMute = () => {
      if (localStreamRef.current) {
        const audioTracks = localStreamRef.current.getAudioTracks();
        const videoTracks = localStreamRef.current.getVideoTracks();
        const isVideoOn = videoTracks.some((t) => t.enabled);

        if (audioTracks.some((t) => t.enabled)) {
          audioTracks.forEach((t) => (t.enabled = false));
          setAudioEnabled(false);
          socket.emit('voicechat:mute-state', {
            classroomCode,
            userId,
            audioMuted: true,
            videoMuted: !isVideoOn,
          });
          toast.warning('The host muted your microphone');
        }
      }
    };

    socket.on('voicechat:peers', handleExistingPeers);
    socket.on('voicechat:joined', handlePeerJoined);
    socket.on('voicechat:offer', handleOffer);
    socket.on('voicechat:answer', handleAnswer);
    socket.on('voicechat:ice-candidate', handleIceCandidate);
    socket.on('voicechat:left', handlePeerLeft);
    socket.on('voicechat:mute-state', handleMuteState);
    socket.on('voicechat:force-mute', handleForceMute);

    return () => {
      socket.off('voicechat:peers', handleExistingPeers);
      socket.off('voicechat:joined', handlePeerJoined);
      socket.off('voicechat:offer', handleOffer);
      socket.off('voicechat:answer', handleAnswer);
      socket.off('voicechat:ice-candidate', handleIceCandidate);
      socket.off('voicechat:left', handlePeerLeft);
      socket.off('voicechat:mute-state', handleMuteState);
      socket.off('voicechat:force-mute', handleForceMute);
    };
  }, [socket, userId, classroomCode, participants, createPeerConnection, initiateOfferToPeer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      pendingCandidatesRef.current.clear();
    };
  }, []);

  return {
    isActive,
    localStream,
    audioEnabled,
    videoEnabled,
    remoteStreams,
    startVoiceChat,
    stopVoiceChat,
    toggleAudio,
    toggleVideo,
    forceMuteUser,
  };
};
