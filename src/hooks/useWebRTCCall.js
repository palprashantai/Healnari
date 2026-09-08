import { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getTokens, apiFetch } from '../lib/apiClient.js';

const RAW_API_URL = import.meta.env.VITE_API_URL;
const SOCKET_URL = RAW_API_URL ? RAW_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000';

// Fallback if the backend's /telemedicine/ice-servers call fails outright —
// public STUN only, enough for most home/office networks. The backend
// always tries to add a TURN credential on top of this same STUN pair.
const FALLBACK_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/** Pulls candidate type (host / srflx / relay / prflx) out of candidate SDP */
function candidateType(candidate) {
  const str = candidate?.candidate || '';
  return str.match(/typ (\w+)/)?.[1] || 'unknown';
}

/**
 * Enterprise Production WebRTC Call Hook
 * Features:
 * - W3C Perfect Negotiation (polite vs impolite peer to eliminate glare/collisions)
 * - Automatic audio-only fallback if camera is unavailable or denied
 * - Reconnection grace window (120s) with non-alarming UI state
 * - Multi-tab single active session detection
 * - Authoritative server heartbeat & duration tracking
 * - Explicit distinction between transient disconnect and intentional consultation completion
 */
export function useWebRTCCall({ appointmentId, active }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  // idle | requesting-media | connecting | connected | reconnecting | peer-left | ended | failed
  const [connectionState, setConnectionState] = useState('idle');
  // good | fair | poor | null
  const [connectionQuality, setConnectionQuality] = useState(null);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerMuted, setPeerMuted] = useState(false);
  const [peerVideoOff, setPeerVideoOff] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState(null);
  const [duplicateSession, setDuplicateSession] = useState(false);
  const [isDoctorEnded, setIsDoctorEnded] = useState(false);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const qualityIntervalRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const isPoliteRef = useRef(true);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!active || !appointmentId) return undefined;
    let cancelled = false;

    const log = (...args) => console.log(`[WebRTC ${appointmentId}]`, ...args);

    const localCandidateStats = { host: 0, srflx: 0, relay: 0, prflx: 0, unknown: 0 };
    const remoteCandidateStats = { host: 0, srflx: 0, relay: 0, prflx: 0, unknown: 0 };

    setError(null);
    setDuplicateSession(false);
    setIsDoctorEnded(false);
    setConnectionState('requesting-media');

    const makeOffer = async (pc, socket, opts) => {
      try {
        makingOfferRef.current = true;
        const offer = await pc.createOffer(opts);
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        log(opts?.iceRestart ? 'ICE restart: sending new offer' : 'Sending SDP offer', offer.type);
        socket.emit('call:offer', { appointmentId, sdp: pc.localDescription });
      } catch (err) {
        log('Failed to create/send offer:', err);
      } finally {
        makingOfferRef.current = false;
      }
    };

    const flushPendingCandidates = async (pc) => {
      if (pendingCandidatesRef.current.length) {
        log(`Flushing ${pendingCandidatesRef.current.length} queued remote ICE candidate(s)`);
      }
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((e) => log('addIceCandidate (queued) failed', e));
      }
      pendingCandidatesRef.current = [];
    };

    const acquireMediaWithFallback = async () => {
      log('Requesting camera/mic...');
      try {
        const fullStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        return { stream: fullStream, audioOnly: false };
      } catch (err) {
        log('Video+audio acquisition failed, attempting audio-only fallback:', err?.message);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          log('Audio-only fallback acquired successfully');
          return { stream: audioStream, audioOnly: true };
        } catch (audioErr) {
          throw err;
        }
      }
    };

    Promise.all([
      acquireMediaWithFallback(),
      apiFetch('/telemedicine/ice-servers').catch((e) => {
        log('ICE server fetch failed, using public-STUN fallback', e?.message);
        return FALLBACK_ICE_SERVERS;
      }),
    ])
      .then(([{ stream, audioOnly }, iceServers]) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (audioOnly) {
          setIsAudioOnly(true);
          setIsVideoOff(true);
        }

        const servers = iceServers?.length ? iceServers : FALLBACK_ICE_SERVERS;
        const hasTurn = servers.some((s) =>
          (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u) => u?.startsWith('turn:') || u?.startsWith('turns:'))
        );
        log(
          `Got media (${stream.getTracks().map((t) => t.kind).join('+')}) and ${servers.length} ICE server(s) — TURN ${hasTurn ? 'AVAILABLE' : 'STUN-ONLY'}`,
        );

        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
        setLocalStream(stream);
        setConnectionState('connecting');

        const pc = new RTCPeerConnection({ iceServers: servers });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.onicecandidate = (e) => {
          if (!e.candidate) {
            log('ICE gathering complete. Local candidate tally:', { ...localCandidateStats });
            return;
          }
          const type = candidateType(e.candidate);
          localCandidateStats[type] = (localCandidateStats[type] || 0) + 1;
          socketRef.current?.emit('call:ice-candidate', { appointmentId, candidate: e.candidate });
        };

        pc.ontrack = (e) => {
          log('Remote track received:', e.track.kind);
          setRemoteStream(e.streams[0]);
        };

        pc.oniceconnectionstatechange = () => {
          if (!pcRef.current) return;
          log(`iceConnectionState -> ${pc.iceConnectionState}`);
          if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            log('ICE disconnected/failed — attempting ICE restart renegotiation');
            if (!isPoliteRef.current && socketRef.current) {
              makeOffer(pc, socketRef.current, { iceRestart: true });
            }
          }
        };

        pc.onconnectionstatechange = () => {
          if (!pcRef.current) return;
          log(`connectionState -> ${pc.connectionState}`);
          if (pc.connectionState === 'connected') {
            setConnectionState('connected');
            setReconnecting(false);
            setReconnectCountdown(null);
            socketRef.current?.emit('call:connected', { appointmentId });
            log('Candidate tally at connect — local:', { ...localCandidateStats }, 'remote:', { ...remoteCandidateStats });
          } else if (pc.connectionState === 'disconnected') {
            setConnectionState('reconnecting');
            setReconnecting(true);
          } else if (pc.connectionState === 'failed') {
            // Attempt recovery before declaring total failure
            setConnectionState('reconnecting');
            setReconnecting(true);
            if (socketRef.current) {
              makeOffer(pc, socketRef.current, { iceRestart: true });
            }
          }
        };

        // Network quality sampling (every 3s)
        let prevPacketStats = null;
        qualityIntervalRef.current = setInterval(async () => {
          if (!pcRef.current || pc.connectionState !== 'connected') {
            setConnectionQuality(null);
            return;
          }
          try {
            const stats = await pc.getStats();
            let rtt = null;
            let packetsLost = 0;
            let packetsReceived = 0;
            stats.forEach((report) => {
              if (report.type === 'candidate-pair' && report.state === 'succeeded' && typeof report.currentRoundTripTime === 'number') {
                rtt = report.currentRoundTripTime;
              }
              if (report.type === 'inbound-rtp' && !report.isRemote) {
                packetsLost += report.packetsLost || 0;
                packetsReceived += report.packetsReceived || 0;
              }
            });
            let lossRatio = 0;
            if (prevPacketStats) {
              const dLost = packetsLost - prevPacketStats.packetsLost;
              const dRecv = packetsReceived - prevPacketStats.packetsReceived;
              const total = dLost + dRecv;
              if (total > 0) lossRatio = dLost / total;
            }
            prevPacketStats = { packetsLost, packetsReceived };
            let quality = 'good';
            if ((rtt !== null && rtt > 0.4) || lossRatio > 0.08) quality = 'poor';
            else if ((rtt !== null && rtt > 0.15) || lossRatio > 0.02) quality = 'fair';
            setConnectionQuality(quality);
          } catch {
            // Ignore stats errors on teardown
          }
        }, 3000);

        // Server authoritative duration heartbeat (every 10s while connected)
        heartbeatIntervalRef.current = setInterval(() => {
          if (pcRef.current?.connectionState === 'connected') {
            elapsedRef.current += 10;
            apiFetch(`/telemedicine/${appointmentId}/session/heartbeat`, {
              method: 'POST',
              body: { elapsedSeconds: elapsedRef.current, isAudioOnly: audioOnly },
            }).catch(() => {});
          }
        }, 10000);

        const socket = io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          auth: { token: getTokens()?.accessToken || null },
          reconnection: true,
          reconnectionAttempts: 15,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          log('Signaling socket connected, joining room...');
          socket.emit('call:join', { appointmentId });
        });

        socket.on('call:error', (payload) => {
          log('call:error from server:', payload?.message);
          setError(payload?.message || 'Could not connect this call.');
          setConnectionState('failed');
        });

        socket.on('call:duplicate-session', ({ message }) => {
          log('Duplicate session notification received:', message);
          setError(message || 'Consultation was opened in another window or device.');
          setDuplicateSession(true);
          setConnectionState('failed');
        });

        socket.on('call:room-info', ({ peerPresent, isPolite }) => {
          isPoliteRef.current = !!isPolite;
          log(`call:room-info — peerPresent=${peerPresent} isPolite=${isPolite}`);
          if (peerPresent && !isPolite) {
            makeOffer(pc, socket);
          }
        });

        socket.on('call:peer-joined', () => {
          log('Peer (re)joined the room');
          setReconnecting(false);
          setReconnectCountdown(null);
          if (!isPoliteRef.current) {
            makeOffer(pc, socket, { iceRestart: true });
          }
        });

        // W3C Perfect Negotiation offer handler
        socket.on('call:offer', async ({ sdp }) => {
          if (!pcRef.current) return;
          try {
            const offerCollision = makingOfferRef.current || pcRef.current.signalingState !== 'stable';
            ignoreOfferRef.current = !isPoliteRef.current && offerCollision;
            if (ignoreOfferRef.current) {
              log('Collision: impolite peer ignoring remote offer');
              return;
            }

            if (offerCollision && isPoliteRef.current) {
              log('Collision: polite peer rolling back local description');
              await pcRef.current.setLocalDescription({ type: 'rollback' }).catch(() => {});
            }

            log('Received SDP offer, answering...');
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
            await flushPendingCandidates(pcRef.current);
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            socket.emit('call:answer', { appointmentId, sdp: pcRef.current.localDescription });
          } catch (err) {
            log('Error handling remote offer:', err);
          }
        });

        socket.on('call:answer', async ({ sdp }) => {
          if (!pcRef.current) return;
          try {
            log('Received SDP answer');
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
            await flushPendingCandidates(pcRef.current);
          } catch (err) {
            log('Error handling remote answer:', err);
          }
        });

        socket.on('call:ice-candidate', async ({ candidate }) => {
          if (!pcRef.current || !candidate) return;
          const type = candidateType(candidate);
          remoteCandidateStats[type] = (remoteCandidateStats[type] || 0) + 1;
          if (pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch((e) => log('addIceCandidate failed', e));
          } else {
            pendingCandidatesRef.current.push(candidate);
          }
        });

        socket.on('call:peer-disconnected', ({ reconnectWindowSeconds }) => {
          log(`call:peer-disconnected: peer temporarily lost connection. Starting ${reconnectWindowSeconds || 120}s countdown.`);
          setReconnecting(true);
          let remaining = reconnectWindowSeconds || 120;
          setReconnectCountdown(remaining);
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
              clearInterval(countdownIntervalRef.current);
              setReconnectCountdown(0);
              setConnectionState('peer-left');
            } else {
              setReconnectCountdown(remaining);
            }
          }, 1000);
        });

        socket.on('call:peer-connected', () => {
          log('call:peer-connected received from peer');
          setReconnecting(false);
          setReconnectCountdown(null);
          clearInterval(countdownIntervalRef.current);
          setConnectionState('connected');
        });

        socket.on('call:peer-left', ({ intentional }) => {
          log(`call:peer-left received (intentional=${intentional})`);
          clearInterval(countdownIntervalRef.current);
          setRemoteStream(null);
          setConnectionState('peer-left');
          setReconnecting(false);
        });

        socket.on('call:ended', () => {
          log('call:ended received (consultation completed)');
          clearInterval(countdownIntervalRef.current);
          setConnectionState('ended');
          setIsDoctorEnded(true);
        });

        socket.on('call:peer-media-state', ({ muted, videoOff }) => {
          if (muted !== undefined) setPeerMuted(muted);
          if (videoOff !== undefined) setPeerVideoOff(videoOff);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        log('Setup failed (media or ICE-server fetch):', err);
        setError(
          err?.name === 'NotAllowedError' || err?.message === 'Permission denied'
            ? 'Camera/microphone access was denied. Please allow camera and microphone in your browser settings.'
            : (err?.message || 'Could not access audio or video devices.')
        );
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
      clearInterval(qualityIntervalRef.current);
      clearInterval(heartbeatIntervalRef.current);
      clearInterval(countdownIntervalRef.current);
      qualityIntervalRef.current = null;
      heartbeatIntervalRef.current = null;
      countdownIntervalRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
      setConnectionState('idle');
      setConnectionQuality(null);
      setIsMuted(false);
      setIsVideoOff(false);
      setIsAudioOnly(false);
      setIsScreenSharing(false);
      setPeerMuted(false);
      setPeerVideoOff(false);
      setReconnecting(false);
      setReconnectCountdown(null);
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
      // Screen share cancelled
    }
  }, [isScreenSharing]);

  const hangUp = useCallback(() => {
    socketRef.current?.emit('call:leave', { appointmentId });
    setConnectionState('ended');
  }, [appointmentId]);

  /** Doctor explicitly concludes consultation */
  const endConsultation = useCallback(() => {
    socketRef.current?.emit('call:end', { appointmentId });
    setConnectionState('ended');
  }, [appointmentId]);

  return {
    localStream, remoteStream, connectionState, connectionQuality, error,
    isMuted, isVideoOff, isAudioOnly, isScreenSharing, peerMuted, peerVideoOff,
    reconnecting, reconnectCountdown, duplicateSession, isDoctorEnded,
    toggleMute, toggleVideo, toggleScreenShare, hangUp, endConsultation,
  };
}

export default useWebRTCCall;
