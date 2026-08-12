import { useState, useEffect, useRef } from 'react';

/**
 * Camera/mic self-test shown before a call actually connects. Requests its
 * own short-lived preview stream (stopped as soon as the user proceeds or
 * this unmounts) so device problems surface here, up front, instead of
 * arriving mid-connection as an opaque "requesting media" spinner that the
 * other party is also sitting through.
 */
export function PreJoinCheck({ dark = false }) {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        setStream(s);
        setChecking(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.name === 'NotAllowedError'
            ? 'Camera/microphone access was denied. Check your browser permissions, or continue and try audio only.'
            : (err?.message || 'Could not access your camera or microphone.'),
        );
        setChecking(false);
      });
    return () => {
      cancelled = true;
      setStream((s) => { s?.getTracks().forEach((t) => t.stop()); return null; });
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream]);

  const hasVideo = !!stream?.getVideoTracks().length;
  const hasAudio = !!stream?.getAudioTracks().length;

  return (
    <div className="space-y-3">
      <div className={`relative aspect-video rounded-2xl overflow-hidden border flex items-center justify-center ${dark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
        {hasVideo ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        ) : (
          <div className={`text-center text-xs px-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            {checking ? (
              <><i className="fas fa-circle-notch fa-spin mr-1.5"></i>Checking camera & microphone…</>
            ) : (
              <><i className="fas fa-video-slash mr-1.5"></i>No camera preview available</>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-4 text-xs font-bold">
        <span className={`flex items-center gap-1.5 ${hasVideo ? 'text-emerald-500' : checking ? (dark ? 'text-slate-500' : 'text-slate-400') : 'text-rose-500'}`}>
          <i className={`fas ${checking ? 'fa-circle-notch fa-spin' : hasVideo ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i> Camera {checking ? 'checking' : hasVideo ? 'ready' : 'unavailable'}
        </span>
        <span className={`flex items-center gap-1.5 ${hasAudio ? 'text-emerald-500' : checking ? (dark ? 'text-slate-500' : 'text-slate-400') : 'text-rose-500'}`}>
          <i className={`fas ${checking ? 'fa-circle-notch fa-spin' : hasAudio ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i> Microphone {checking ? 'checking' : hasAudio ? 'ready' : 'unavailable'}
        </span>
      </div>
      {error && (
        <div className={`rounded-xl p-3 text-[11px] font-semibold ${dark ? 'bg-rose-950/40 border border-rose-900/50 text-rose-300' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
          <i className="fas fa-triangle-exclamation mr-1.5"></i>{error}
        </div>
      )}
    </div>
  );
}

export default PreJoinCheck;
