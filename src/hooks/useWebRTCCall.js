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

/** Pulls the candidate type (host / srflx / relay / prflx) out of an ICE
 * candidate's SDP string — the single most useful piece of information for
 * diagnosing "why won't this call connect": if no `relay` candidates ever
 * appear on either side, TURN isn't reachable/configured, and calls will
 * fail for any pair of peers whose NATs (or router's lack of NAT
 * hairpinning — a common same-WiFi failure) can't be bridged by STUN alone. */
function candidateType(candidate) {
  const str = candidate?.candidate || '';
  return str.match(/typ (\w+)/)?.[1] || 'unknown';
}

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

    const log = (...args) => console.log(`[WebRTC ${appointmentId}]`, ...args);

    const localCandidateStats = { host: 0, srflx: 0, relay: 0, prflx: 0, unknown: 0 };
    const remoteCandidateStats = { host: 0, srflx: 0, relay: 0, prflx: 0, unknown: 0 };
    const isOffererRef = { current: false };
    const restartAttemptedRef = { current: false };

    setError(null);
    setConnectionState('requesting-media');

    const makeOffer = async (pc, socket, opts) => {
      isOffererRef.current = true;
      const offer = await pc.createOffer(opts);
      await pc.setLocalDescription(offer);
      log(opts?.iceRestart ? 'ICE restart: sending new offer' : 'Sending SDP offer', offer.type);
      socket.emit('call:offer', { appointmentId, sdp: pc.localDescription });
    };

    const flushPendingCandidates = async (pc) => {
      if (pendingCandidatesRef.current.length) {
        log(`Flushing ${pendingCandidatesRef.current.length} queued remote ICE candidate(s)`);
      }
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(candidate).catch((e) => log('addIceCandidate (queued) failed', e));
      }
      pendingCandidatesRef.current = [];
    };

    log('Requesting camera/mic and ICE server config...');

    Promise.all([
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }),
      apiFetch('/telemedicine/ice-servers').catch((e) => {
        log('ICE server fetch failed, using public-STUN fallback', e?.message);
        return FALLBACK_ICE_SERVERS;
      }),
    ])
      .then(([stream, iceServers]) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const servers = iceServers?.length ? iceServers : FALLBACK_ICE_SERVERS;
        const hasTurn = servers.some((s) => (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u) => u?.startsWith('turn:') || u?.startsWith('turns:')));
        log(
          `Got media (${stream.getTracks().map((t) => t.kind).join('+')}) and ${servers.length} ICE server(s) — TURN relay ${hasTurn ? 'AVAILABLE' : 'NOT CONFIGURED (STUN-only — calls between peers behind symmetric NATs, or on routers without NAT hairpinning, will likely fail)'}`,
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
          log(`Local ICE candidate gathered: type=${type}`, e.candidate.candidate);
          socketRef.current?.emit('call:ice-candidate', { appointmentId, candidate: e.candidate });
        };

        pc.onicecandidateerror = (e) => {
          // Fires when a specific STUN/TURN server itself errors (wrong
          // credentials, unreachable, etc.) — this is the single most
          // direct signal for "TURN server is misconfigured".
          log(`ICE candidate ERROR — url=${e.url} errorCode=${e.errorCode} errorText="${e.errorText}"`);
        };

        pc.ontrack = (e) => {
          log('Remote track received:', e.track.kind);
          setRemoteStream(e.streams[0]);
        };

        pc.onicegatheringstatechange = () => log(`iceGatheringState -> ${pc.iceGatheringState}`);

        pc.oniceconnectionstatechange = () => {
          if (!pcRef.current) return;
          log(`iceConnectionState -> ${pc.iceConnectionState}`);
          if (pc.iceConnectionState === 'failed' && isOffererRef.current && !restartAttemptedRef.current) {
            // Only the original offerer restarts, mirroring the "second
            // joiner offers" convention — avoids both sides racing to
            // renegotiate at once. One attempt only, to avoid loops.
            restartAttemptedRef.current = true;
            log('ICE failed — attempting one ICE restart...');
            makeOffer(pc, socketRef.current, { iceRestart: true }).catch((e) => log('ICE restart failed to (re)send offer', e));
          }
        };

        pc.onconnectionstatechange = () => {
          if (!pcRef.current) return; // torn down already — ignore late events
          log(`connectionState -> ${pc.connectionState}`);
          if (pc.connectionState === 'connected') {
            setConnectionState('connected');
            log('Candidate tally at connect — local:', { ...localCandidateStats }, 'remote:', { ...remoteCandidateStats });
          } else if (pc.connectionState === 'failed') {
            // Most often two peers whose NAT/router combination pure STUN
            // can't bridge (symmetric NAT, or — notably — a router that
            // doesn't support NAT hairpinning even when BOTH peers are on
            // the same WiFi) with no usable TURN relay to fall back on.
            setConnectionState('failed');
            setError('Could not establish a stable connection. Please check your internet and try again.');
          }
        };

        const socket = io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          auth: { token: getTokens()?.accessToken || null },
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

        // Only the participant who joins a non-empty room offers — the
        // gateway is the single source of truth on who was there first.
        socket.on('call:room-info', ({ peerPresent }) => {
          log(`call:room-info — peerPresent=${peerPresent} (${peerPresent ? 'we offer' : 'waiting to receive an offer'})`);
          if (peerPresent) makeOffer(pc, socket);
        });

        socket.on('call:offer', async ({ sdp }) => {
          if (!pcRef.current) return;
          log('Received SDP offer, answering...');
          await pcRef.current.setRemoteDescription(sdp);
          await flushPendingCandidates(pcRef.current);
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          log('Sending SDP answer');
          socket.emit('call:answer', { appointmentId, sdp: pcRef.current.localDescription });
        });

        socket.on('call:answer', async ({ sdp }) => {
          if (!pcRef.current) return;
          log('Received SDP answer');
          await pcRef.current.setRemoteDescription(sdp);
          await flushPendingCandidates(pcRef.current);
        });

        socket.on('call:ice-candidate', async ({ candidate }) => {
          if (!pcRef.current) return;
          const type = candidateType(candidate);
          remoteCandidateStats[type] = (remoteCandidateStats[type] || 0) + 1;
          if (pcRef.current.remoteDescription) {
            log(`Remote ICE candidate received: type=${type} (adding now)`);
            await pcRef.current.addIceCandidate(candidate).catch((e) => log('addIceCandidate failed', e));
          } else {
            log(`Remote ICE candidate received: type=${type} (queued — no remote description yet)`);
            pendingCandidatesRef.current.push(candidate);
          }
        });

        socket.on('call:peer-left', () => {
          // The server fires this on ANY socket disconnect, not just an
          // intentional hangup — a brief WiFi drop or a mobile network
          // handoff (WiFi<->cellular) disconnects the *signaling* socket
          // (Socket.IO auto-reconnects it a moment later) without
          // necessarily touching the underlying WebRTC media connection at
          // all. If our own pc still reports "connected", trust that over
          // the signaling blip instead of falsely declaring the call over —
          // and don't leave the UI stuck on "peer left" forever once they
          // reconnect (call:peer-joined below clears it).
          if (pcRef.current?.connectionState === 'connected') {
            log('call:peer-left received but our RTCPeerConnection is still connected — treating as a transient signaling blip, not a real hangup');
            return;
          }
          log('Peer left the call');
          setRemoteStream(null);
          setConnectionState('peer-left');
        });

        socket.on('call:peer-joined', () => {
          log('Peer (re)joined the room');
          // Recovers from the transient-disconnect case above: if we'd
          // shown "peer-left" but the underlying connection is fine, or
          // recovers shortly after, reflect that instead of staying stuck.
          setConnectionState((prev) => {
            if (prev !== 'peer-left') return prev;
            return pcRef.current?.connectionState === 'connected' ? 'connected' : 'connecting';
          });
        });

        socket.on('call:peer-media-state', ({ muted, videoOff }) => {
          if (muted !== undefined) setPeerMuted(muted);
          if (videoOff !== undefined) setPeerVideoOff(videoOff);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        log('Setup failed (media or ICE-server fetch):', err);
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
