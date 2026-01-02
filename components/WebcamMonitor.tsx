
import React, { useRef, useEffect, useState } from 'react';

interface WebcamMonitorProps {
  onCapture: (base64: string) => void;
  isActive: boolean;
  isProcessing: boolean;
  lastCount: number | null;
}

export const WebcamMonitor: React.FC<WebcamMonitorProps> = ({ isActive, isProcessing, lastCount }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<{title: string, message: string} | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  useEffect(() => {
    if (isActive && permissionState === 'granted') {
      startCamera();
    } else if (!isActive) {
      stopCamera();
    }
    return () => stopCamera();
  }, [isActive, permissionState]);

  const startCamera = async () => {
    setError(null);
    try {
      // Requesting Ultra HD (4K) constraints to get the highest possible hardware resolution
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', 
          width: { ideal: 3840, min: 1280 }, 
          height: { ideal: 2160, min: 720 },
          frameRate: { ideal: 30 }
        }, 
        audio: false 
      });
      setStream(mediaStream);
      setPermissionState('granted');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Error accessing webcam:", err);
      
      let errorData = {
        title: "Link Error",
        message: "Unable to establish video uplink. Please check hardware connection."
      };

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        errorData = {
          title: "Access Restricted",
          message: "Camera permission denied. The AI Vision system requires visual input to function. Please enable camera access in browser settings."
        };
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorData = {
          title: "Hardware Missing",
          message: "No imaging device detected. Ensure a compatible camera is connected to the grid node."
        };
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorData = {
          title: "Node Conflict",
          message: "The camera is currently reserved by another process. Please close other applications using the video feed."
        };
      }

      setError(errorData);
    }
  };

  const handleRequestPermission = () => {
    setPermissionState('granted'); 
    startCamera();
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    (window as any).captureCCTVFrame = () => {
      if (videoRef.current && canvasRef.current && stream) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Use intrinsic video resolution for the canvas to maintain 1:1 pixel quality
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          // Improve image smoothing for high-res captures
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Use high quality (0.95) to preserve details for the AI model
          return canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
        }
      }
      return null;
    };
  }, [stream]);

  if (!isActive) return null;

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl group flex flex-col items-center justify-center">
      {(!stream || error) ? (
        <div className="flex flex-col items-center gap-6 p-8 text-center max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-2 transition-colors duration-500 ${error ? 'bg-red-500/10 text-red-500' : 'bg-slate-900 text-slate-500'}`}>
            {error ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            )}
          </div>
          <div className="space-y-3">
            <h4 className={`font-black uppercase tracking-[0.2em] text-sm ${error ? 'text-red-400' : 'text-white'}`}>
              {error ? error.title : 'CCTV Feed Authorization'}
            </h4>
            <p className="text-slate-500 text-xs font-medium leading-relaxed">
              {error ? error.message : 'Establish a secure video uplink for real-time occupancy monitoring and AI grid optimization.'}
            </p>
          </div>
          <button 
            onClick={handleRequestPermission}
            className={`mt-4 w-full sm:w-auto text-[11px] font-black uppercase tracking-[0.2em] px-10 py-4 rounded-2xl transition-all shadow-xl active:scale-95 ${
              error 
                ? 'bg-white text-slate-900 hover:bg-slate-100' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-900/40'
            }`}
          >
            {error ? 'Attempt System Re-Link' : 'Initialize Feed'}
          </button>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className={`w-full h-full object-cover grayscale brightness-[0.55] contrast-[1.3] transition-all duration-700 ${isProcessing ? 'blur-[2px] scale-[1.02]' : ''}`}
          />
          
          {/* Scanning Line */}
          {isProcessing && (
            <div className="absolute inset-0 pointer-events-none z-30">
              <div className="absolute left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_20px_#3b82f6,0_0_40px_#3b82f6] animate-scan"></div>
              <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>
            </div>
          )}

          {/* Digital Grid */}
          <div className="absolute inset-0 pointer-events-none opacity-10 animate-grid" 
               style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
          </div>

          {/* HUD Overlays */}
          <div className="absolute top-8 left-8 flex flex-col gap-3 z-20 animate-flicker">
            <div className="flex items-center gap-3 bg-black/70 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/10 shadow-2xl">
              <span className={`flex h-2.5 w-2.5 rounded-full ${isProcessing ? 'bg-blue-500 animate-ping' : 'bg-red-600 animate-pulse'}`}></span>
              <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
                {isProcessing ? 'SCANNING GRID NODE' : 'UPLINK STABLE'}
              </span>
            </div>
            {isProcessing && (
              <div className="flex items-center gap-2 ml-1">
                <div className="flex gap-1.5 items-end h-4">
                  <div className="w-1 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_100ms]"></div>
                  <div className="w-1 h-4 bg-blue-500 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                  <div className="w-1 h-3 bg-blue-500 rounded-full animate-[bounce_1s_infinite_300ms]"></div>
                </div>
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Analyzing...</span>
              </div>
            )}
          </div>

          <div className="absolute top-8 right-8 z-20">
            <div className="bg-black/70 backdrop-blur-2xl border border-white/10 px-4 py-2 rounded-2xl text-right shadow-2xl">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Encrypted Link</p>
              <p className="text-xs font-black text-blue-500 font-mono tracking-tighter uppercase leading-none">NODE_S_102</p>
            </div>
          </div>

          {lastCount !== null && !isProcessing && (
            <div className="absolute bottom-8 left-8 bg-blue-600/95 backdrop-blur-2xl px-6 py-4 rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(37,99,235,0.4)] z-20 flex items-center gap-4 transition-all animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white ring-1 ring-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-blue-100 uppercase tracking-[0.3em] leading-none mb-1.5">Node Audit</span>
                <span className="text-xl font-black text-white tabular-nums leading-none tracking-tight">{lastCount} Peoples</span>
              </div>
            </div>
          )}

          {/* Vignette & Corner Decals */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,1)] opacity-70"></div>
          <div className="absolute top-0 left-0 w-12 h-12 border-t-[3px] border-l-[3px] border-blue-500/40 rounded-tl-[2.5rem] pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-12 h-12 border-t-[3px] border-r-[3px] border-blue-500/40 rounded-tr-[2.5rem] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[3px] border-l-[3px] border-blue-500/40 rounded-bl-[2.5rem] pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[3px] border-r-[3px] border-blue-500/40 rounded-br-[2.5rem] pointer-events-none"></div>
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
