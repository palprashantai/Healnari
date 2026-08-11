import { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getTokens, apiFetch } from '../lib/apiClient.js';

const RAW_API_URL = import.meta.env.VITE_API_URL;
const SOCKET_URL = RAW_API_URL ? RAW_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000';

// Fallback if the backend's /telemedicine/ice-servers call fails outright —
// public STUN only, enough for most home/office networks. The backend
// always tries to add a TURN credential on top of this same STUN pair (see
// TelemedicineService.getIceServers) for peers behind restrictive NATs.
const FALLBACK_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Peer-to-peer WebRTC video call, signaled over the appointment's
 * `call:<appointmentId>` Socket.IO room (see vision's CallGateway).
 *
 * Lifecycle is driven entirely by `active`: turning it on acquires the
 * camera/mic, connects the signaling socket, joins the room, and negotiates
 * a connection; turning it off (or unmounting) tears everything down. The
 * room's second joiner always creates the SDP offer — the gateway tells a
 * joining client whether a peer is already present, and that's the sole
 * signal used to decide who offers, so both sides can never offer at once.
 *
 * `hangUp()` only tells the other side you're leaving — actual camera/mic
 * release and connection teardown happens when the caller flips `active`
 * to false or unmounts, so there's exactly one place resources get freed.
 */
export function useWebRTCCall({ appointmentId, active }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  // idle | requesting-media | connecting | connected | peer-left | ended | failed
  const [connectionState, setConnectionState] = useState('idle');
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerMuted, setPeerMuted] = useState(false);
  const [peerVideoOff, setPeerVideoOff] = useState(false);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const cameraTrackRef = useRef(null); // held aside during screen share so we can revert to it
  const pendingCandidatesRef = useRef([]);

  useEffect(() => {
    if (!active || !appointmentId) return undefined;
    let cancelled = false;

    setError(null);
    setConnectionState('requesting-media');

    const makeOffer = async (pc, socket) => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call:offer', { appointmentId, sdp: pc.localDescription });
    };

    const flushPendingCandidates = async (pc) => {
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(candidate).catch(() => {});
      }
      pendingCandidatesRef.current = [];
    };

    Promise.all([
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }),
      apiFetch('/telemedicine/ice-servers').catch(() => FALLBACK_ICE_SERVERS),
    ])
      .then(([stream, iceServers]) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
        setLocalStream(stream);
        setConnectionState('connecting');

        const pc = new RTCPeerConnection({ iceServers: iceServers?.length ? iceServers : FALLBACK_ICE_SERVERS });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.onicecandidate = (e) => {
          if (e.candidate) socketRef.current?.emit('call:ice-candidate', { appointmentId, candidate: e.candidate });
        };
        pc.ontrack = (e) => setRemoteStream(e.streams[0]);
        pc.onconnectionstatechange = () => {
          if (!pcRef.current) return; // torn down already — ignore late events
          if (pc.connectionState === 'connected') setConnectionState('connected');
          else if (pc.connectionState === 'failed') {
            // Most often two peers on different networks (e.g. patient on
            // mobile data, doctor on WiFi) with no usable TURN relay — pure
            // STUN can't punch through that combination of NATs.
            setConnectionState('failed');
            setError('Could not establish a stable connection. Please check your internet and try again.');
          }
        };

        const socket = io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          auth: { token: getTokens()?.accessToken || null },
        });
        socketRef.current = socket;

        socket.on('connect', () => socket.emit('call:join', { appointmentId }));

        socket.on('call:error', (payload) => {
          setError(payload?.message || 'Could not connect this call.');
          setConnectionState('failed');
        });

        // Only the participant who joins a non-empty room offers — the
        // gateway is the single source of truth on who was there first.
        socket.on('call:room-info', ({ peerPresent }) => {
          if (peerPresent) makeOffer(pc, socket);
        });

        socket.on('call:offer', async ({ sdp }) => {
          if (!pcRef.current) return;
          await pcRef.current.setRemoteDescription(sdp);
          await flushPendingCandidates(pcRef.current);
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socket.emit('call:answer', { appointmentId, sdp: pcRef.current.localDescription });
        });

        socket.on('call:answer', async ({ sdp }) => {
          if (!pcRef.current) return;
          await pcRef.current.setRemoteDescription(sdp);
          await flushPendingCandidates(pcRef.current);
        });

        socket.on('call:ice-candidate', async ({ candidate }) => {
          if (!pcRef.current) return;
          if (pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(candidate).catch(() => {});
          } else {
            pendingCandidatesRef.current.push(candidate);
          }
        });

        socket.on('call:peer-left', () => {
          setRemoteStream(null);
          setConnectionState('peer-left');
        });

        socket.on('call:peer-media-state', ({ muted, videoOff }) => {
          if (muted !== undefined) setPeerMuted(muted);
          if (videoOff !== undefined) setPeerVideoOff(videoOff);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message === 'Permission denied' ? 'Camera/microphone access was denied.' : (err?.message || 'Could not access camera/microphone.'));
        setConnectionState('failed');
      });

    return () => {
      cancelled = true;
      socketRef.current?.emit('call:leave', { appointmentId });
      socketRef.current?.disconnect();
      socketRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      cameraTrackRef.current = null;
      pendingCandidatesRef.current = [];
      setLocalStream(null);
      setRemoteStream(null);
      setConnectionState('idle');
      setIsMuted(false);
      setIsVideoOff(false);
      setIsScreenSharing(false);
      setPeerMuted(false);
      setPeerVideoOff(false);
    };
  }, [active, appointmentId]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    setIsMuted((prev) => {
      const next = !prev;
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !next; });
      socketRef.current?.emit('call:media-state', { appointmentId, muted: next });
      return next;
    });
  }, [appointmentId]);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    setIsVideoOff((prev) => {
      const next = !prev;
      localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = !next; });
      socketRef.current?.emit('call:media-state', { appointmentId, videoOff: next });
      return next;
    });
  }, [appointmentId]);

  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !localStreamRef.current) return;

    if (isScreenSharing) {
      const camTrack = cameraTrackRef.current;
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && camTrack) await sender.replaceTrack(camTrack);
      if (camTrack) {
        const audioTracks = localStreamRef.current.getAudioTracks();
        const rebuilt = new MediaStream([camTrack, ...audioTracks]);
        localStreamRef.current = rebuilt;
        setLocalStream(rebuilt);
      }
      setIsScreenSharing(false);
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(screenTrack);

      const audioTracks = localStreamRef.current.getAudioTracks();
      const rebuilt = new MediaStream([screenTrack, ...audioTracks]);
      localStreamRef.current = rebuilt;
      setLocalStream(rebuilt);
      setIsScreenSharing(true);

      // Browser's native "Stop sharing" control ends the track directly —
      // catch that to revert to the camera instead of freezing on a dead frame.
      screenTrack.onended = () => {
        const camTrack = cameraTrackRef.current;
        const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender && camTrack) videoSender.replaceTrack(camTrack);
        if (camTrack && localStreamRef.current) {
          const audio = localStreamRef.current.getAudioTracks();
          const back = new MediaStream([camTrack, ...audio]);
          localStreamRef.current = back;
          setLocalStream(back);
        }
        setIsScreenSharing(false);
      };
    } catch {
      // User cancelled the screen-share picker — no-op.
    }
  }, [isScreenSharing]);

  const hangUp = useCallback(() => {
    socketRef.current?.emit('call:leave', { appointmentId });
    setConnectionState('ended');
  }, [appointmentId]);

  return {
    localStream, remoteStream, connectionState, error,
    isMuted, isVideoOff, isScreenSharing, peerMuted, peerVideoOff,
    toggleMute, toggleVideo, toggleScreenShare, hangUp,
  };
}

export default useWebRTCCall;
