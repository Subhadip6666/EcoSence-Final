import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RoomData, RoomStatus, EnergyStats, DeviceStatus } from './types';
import { INITIAL_ROOMS } from './constants';
import { geminiService } from './services/geminiService';
import { RoomCard } from './components/RoomCard';
import { EnergyChart } from './components/EnergyChart';
import { WebcamMonitor } from './components/WebcamMonitor';

interface ActionLog {
  id: string;
  time: string;
  room: string;
  action: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING';
}

function App() {
  const [rooms, setRooms] = useState<RoomData[]>(INITIAL_ROOMS);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [energyHistory, setEnergyHistory] = useState<EnergyStats[]>([]);
  const [totalSaved, setTotalSaved] = useState(142.5);
  const [cctvRoomId, setCctvRoomId] = useState<string | null>(rooms[0]?.id || null);
  const [autoDetection, setAutoDetection] = useState(false);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('ecosense-theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  const autoDetectTimerRef = useRef<number | null>(null);
  const cooldownTimerRef = useRef<number | null>(null);
  const energyTickerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('ecosense-theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const addLog = useCallback((room: string, action: string, type: 'INFO' | 'SUCCESS' | 'WARNING' = 'INFO') => {
    const newLog: ActionLog = {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      room,
      action,
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 10));
  }, []);

  const updateEnergyTelemetry = useCallback(() => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const currentConsumption = rooms.reduce((acc, room) => acc + room.devices.reduce((dAcc, d) => dAcc + (d.isOn ? d.powerConsumption : 0), 0), 0) / 1000; 
    const currentSavings = rooms.reduce((acc, room) => {
      if (room.status === RoomStatus.EMPTY) return acc + room.devices.reduce((dAcc, d) => dAcc + (!d.isOn ? d.powerConsumption : 0), 0);
      return acc;
    }, 0) / 1000;

    setEnergyHistory(prev => {
      if (prev.length > 0 && prev[prev.length - 1].timestamp === timestamp) return prev;
      return [...prev, { timestamp, consumption: Number(currentConsumption.toFixed(2)), savings: Number(currentSavings.toFixed(2)) }].slice(-30);
    });
  }, [rooms]);

  useEffect(() => {
    const history: EnergyStats[] = [];
    const now = new Date();
    for (let i = 0; i < 20; i++) {
      const time = new Date(now.getTime() - (20 - i) * 30000); 
      history.push({
        timestamp: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        consumption: Number((Math.random() * 1.5 + 2).toFixed(2)),
        savings: Number((Math.random() * 0.4 + 0.1).toFixed(2))
      });
    }
    setEnergyHistory(history);
    addLog('System', 'EcoSense Grid Node Connected', 'SUCCESS');
  }, [addLog]);

  useEffect(() => {
    updateEnergyTelemetry();
    energyTickerRef.current = window.setInterval(updateEnergyTelemetry, 5000);
    return () => { if (energyTickerRef.current) clearInterval(energyTickerRef.current); };
  }, [updateEnergyTelemetry]);

  const handleAnalyze = async (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room || analyzingIds.has(roomId)) return;

    setAnalyzingIds(prev => new Set(prev).add(roomId));
    
    try {
      let result;
      if (quotaExceeded) {
        // Strict Fallback Logic
        await new Promise(r => setTimeout(r, 1500)); 
        const isOccupied = Math.random() > 0.4;
        const temp = room.temperature;
        
        result = {
          occupied: isOccupied,
          personCount: isOccupied ? Math.floor(Math.random() * 20) + 1 : 0,
          lightRecommendation: (isOccupied && room.brightness < 60) ? 'ON' as const : 'OFF' as const,
          // If Temp > 26: AC ON, Fan OFF. 24-26: AC OFF, Fan Speed 4. < 24: Both OFF.
          acRecommendation: (isOccupied && temp > 26) ? 'ON' as const : 'OFF' as const,
          fanRecommendation: (isOccupied && temp >= 24 && temp <= 26) ? 'ON' as const : 'OFF' as const,
          fanSpeed: (isOccupied && temp >= 24 && temp <= 26) ? 4 : 0,
          targetTemp: 23
        };
      } else {
        let source = room.imageUrl;
        let isBase64 = false;
        if (roomId === cctvRoomId) {
          const liveFrame = (window as any).captureCCTVFrame ? (window as any).captureCCTVFrame() : null;
          if (liveFrame) { source = liveFrame; isBase64 = true; }
        }
        result = await geminiService.analyzeRoomImage(source, Math.round(room.temperature), Math.round(room.brightness), isBase64);
      }

      setRooms(prevRooms => prevRooms.map(r => {
        if (r.id === roomId) {
          const updatedDevices = r.devices.map(d => {
            if (d.type === 'LIGHT') return { ...d, isOn: result.lightRecommendation === 'ON' };
            if (d.type === 'AC') return { ...d, isOn: result.acRecommendation === 'ON' };
            if (d.type === 'FAN') {
              const fanState = result.fanRecommendation === 'ON';
              return { ...d, isOn: fanState, speed: fanState ? result.fanSpeed : 0 };
            }
            return d;
          });

          return {
            ...r,
            status: result.occupied ? RoomStatus.OCCUPIED : RoomStatus.EMPTY,
            occupancyCount: result.personCount,
            temperature: result.acRecommendation === 'ON' ? result.targetTemp : r.temperature,
            devices: updatedDevices,
            lastUpdate: new Date().toISOString(),
          };
        }
        return r;
      }));

      if (!result.occupied && room.devices.some(d => d.isOn)) {
        const energySaved = room.devices.reduce((acc, d) => acc + (d.isOn ? d.powerConsumption : 0), 0) / 1000;
        setTotalSaved(s => s + energySaved * 0.1);
        addLog(room.name, `Eco-Lock: Node Secure. High-Power Assets Terminated.`, 'SUCCESS');
      } else if (result.occupied) {
        addLog(room.name, `Optimized: ${result.personCount} Detected. Temp: ${room.temperature}°C.`, 'INFO');
      }
    } catch (err: any) {
      if (err.message?.includes('429')) {
        setQuotaExceeded(true);
        setCooldownSeconds(90);
        addLog('System', 'Traffic Warning: Local Override Active', 'WARNING');
        if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = window.setInterval(() => {
          setCooldownSeconds(prev => {
            if (prev <= 1) {
              clearInterval(cooldownTimerRef.current!);
              setQuotaExceeded(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } finally {
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(roomId);
        return next;
      });
    }
  };

  useEffect(() => {
    if (autoDetection) {
      const cycleInterval = 15000;
      const cycleRooms = () => {
        setRooms(currentRooms => {
          setCctvRoomId(prevId => {
            const currentIndex = currentRooms.findIndex(r => r.id === prevId);
            const nextIndex = (currentIndex + 1) % currentRooms.length;
            const nextRoom = currentRooms[nextIndex];
            handleAnalyze(nextRoom.id);
            return nextRoom.id;
          });
          return currentRooms;
        });
      };
      cycleRooms();
      autoDetectTimerRef.current = window.setInterval(cycleRooms, cycleInterval);
    } else {
      if (autoDetectTimerRef.current) clearInterval(autoDetectTimerRef.current);
    }
    return () => { if (autoDetectTimerRef.current) clearInterval(autoDetectTimerRef.current); };
  }, [autoDetection, quotaExceeded]);

  const totalCurrentConsumption = rooms.reduce((acc, room) => acc + room.devices.reduce((dAcc, d) => dAcc + (d.isOn ? d.powerConsumption : 0), 0), 0);
  const cctvRoom = rooms.find(r => r.id === cctvRoomId);

  return (
    <div className={`min-h-screen transition-colors duration-500 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#f8fafc] text-slate-900'}`}>
      <header className={`backdrop-blur-2xl border-b transition-colors duration-500 sticky top-0 z-50 h-20 flex items-center ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 dark:shadow-blue-900/40">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C10 14.5 10.5 13.5 10.5 11"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-black leading-none tracking-tight uppercase">EcoSense <span className="text-blue-600">AI</span></h1>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Industrial Energy Hub</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 md:gap-10">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2.5 rounded-xl border transition-all duration-300 active:scale-95 group relative ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
              aria-label="Toggle Theme"
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              )}
            </button>

            <div className="hidden sm:flex flex-col items-end">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Active Grid Load</span>
              <span className={`text-xl font-black transition-colors ${totalCurrentConsumption > 4000 ? 'text-amber-500' : 'text-blue-600'}`}>
                {totalCurrentConsumption}W
              </span>
            </div>
            <div className={`h-10 w-px hidden sm:block ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
            <div className="text-right">
              <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Grid Stability</p>
              <div className="flex items-center gap-2 justify-end mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${quotaExceeded ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></span>
                <span className={`text-xs font-black uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                  {quotaExceeded ? 'Rate Limited' : 'Nominal'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 space-y-12">
        {quotaExceeded && (
          <div className="bg-amber-600 text-white p-5 rounded-[2rem] shadow-2xl border border-amber-500 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              </div>
              <div>
                <p className="text-base font-black uppercase tracking-tight leading-none mb-1.5">Traffic Congestion: Local Override</p>
                <p className="text-xs font-bold opacity-90">Hardware-level logic active for {cooldownSeconds}s until API restores.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          <div className="xl:col-span-8">
            <div className={`p-8 rounded-[3rem] border transition-colors duration-500 h-full flex flex-col relative overflow-hidden group ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 relative z-10">
                <div>
                  <h3 className={`text-base font-black flex items-center gap-3 uppercase tracking-widest ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    Vision Command Center
                  </h3>
                  <p className={`text-[10px] font-bold tracking-[0.2em] uppercase mt-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Active Node: {cctvRoom?.name}</p>
                </div>
                
                <div className={`flex items-center gap-3 p-2.5 rounded-2xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200/50'}`}>
                  <select 
                    value={cctvRoomId || ''} 
                    onChange={(e) => setCctvRoomId(e.target.value)}
                    className={`text-[11px] font-black border rounded-xl px-4 py-2.5 outline-none shadow-sm focus:ring-2 ring-blue-500/20 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-blue-400' : 'bg-white border-slate-200 text-blue-600'}`}
                  >
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <div className={`flex items-center gap-4 px-3 border-l ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Auto Audit</label>
                    <button 
                      onClick={() => setAutoDetection(!autoDetection)}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all duration-500 ease-in-out ${autoDetection ? 'bg-blue-600' : isDarkMode ? 'bg-slate-800' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xl transition-all duration-500 ${autoDetection ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <WebcamMonitor 
                isActive={!!cctvRoomId} 
                onCapture={() => {}} 
                isProcessing={analyzingIds.has(cctvRoomId || '')}
                lastCount={cctvRoom?.occupancyCount ?? null}
              />
              
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6 relative z-10">
                <CCTVStat isDark={isDarkMode} label="Audit Status" value={autoDetection ? 'CYCLING' : 'IDLE'} sub="Scan Mode" />
                <CCTVStat isDark={isDarkMode} label="AI Compute" value={quotaExceeded ? 'HARDWARE' : 'GEMINI'} sub="Decision Hub" />
                <CCTVStat isDark={isDarkMode} label="Density" value={cctvRoom?.occupancyCount.toString() || '0'} sub="Occupants" />
                <CCTVStat isDark={isDarkMode} label="Link Status" value="100%" sub="Node Ping" />
              </div>
            </div>
          </div>

          <div className="xl:col-span-4 h-full">
            <div className={`rounded-[3rem] p-8 shadow-2xl border h-full flex flex-col font-mono text-xs relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[80px] pointer-events-none"></div>
              <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6 relative z-10">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${quotaExceeded ? 'bg-amber-500' : 'bg-blue-500'} animate-pulse`}></span>
                  Grid Event Stream
                </span>
                <span className="text-[10px] text-slate-600 uppercase font-black">Live</span>
              </div>
              <div className="space-y-5 overflow-y-auto max-h-[400px] xl:max-h-none custom-scrollbar pr-3 flex-1 relative z-10">
                {logs.length === 0 ? (
                  <p className="text-slate-700 italic font-sans text-sm py-10 text-center">Initializing secure telemetry link...</p>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="flex gap-5 animate-in fade-in slide-in-from-left-4 duration-500 pb-4 border-b border-slate-800/50 last:border-0">
                      <span className="text-slate-600 shrink-0 font-black">[{log.time}]</span>
                      <div className="flex flex-col gap-1">
                        <span className="text-blue-500 font-black uppercase tracking-widest text-[10px]">{log.room}</span>
                        <span className={`leading-relaxed ${log.type === 'SUCCESS' ? 'text-emerald-400 font-bold' : log.type === 'WARNING' ? 'text-amber-400' : 'text-slate-400'}`}>
                          {log.action}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className={`text-2xl font-black tracking-tight flex items-center gap-4 uppercase ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              Facility Nodes Grid
            </h2>
            <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Multi-Node Management</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {rooms.map(room => (
              <RoomCard 
                key={room.id} 
                room={room} 
                onAnalyze={handleAnalyze} 
                isAnalyzing={analyzingIds.has(room.id)}
                isLinkedToCCTV={room.id === cctvRoomId}
              />
            ))}
          </div>
        </div>

        <div className="space-y-8 pt-6 pb-16">
          <h2 className={`text-2xl font-black tracking-tight flex items-center gap-4 uppercase ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            Sustainability Core
          </h2>
          <div className={`p-10 sm:p-16 rounded-[4rem] border transition-all duration-700 overflow-hidden relative min-h-[700px] flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-sm shadow-blue-50 hover:shadow-2xl'}`}>
            <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none opacity-60 ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50/60'}`}></div>
            <div className={`absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none opacity-60 ${isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-50/60'}`}></div>
            
            <div className="relative z-10 flex-1 flex flex-col h-full">
              <EnergyChart data={energyHistory} isDark={isDarkMode} />
              
              <div className={`mt-16 pt-16 border-t grid grid-cols-1 md:grid-cols-3 gap-16 items-center ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="text-center md:text-left">
                  <p className={`text-[11px] font-black uppercase tracking-[0.3em] mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total Grid Savings</p>
                  <div className="flex items-baseline gap-2 justify-center md:justify-start">
                    <span className={`text-6xl font-black tracking-tighter tabular-nums leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {totalSaved.toFixed(1)}
                    </span>
                    <span className={`text-xl font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>kWh</span>
                  </div>
                  <p className="text-[12px] text-emerald-600 font-black uppercase mt-6 flex items-center justify-center md:justify-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                    Grid Efficiency Rating A+
                  </p>
                </div>
                
                <div className="flex flex-col items-center gap-5">
                  <div className={`w-full max-w-[320px] p-8 rounded-[2.5rem] border shadow-2xl flex items-center gap-6 group/box transition-all hover:scale-[1.03] ${isDarkMode ? 'bg-slate-950 border-slate-800 hover:shadow-blue-500/5' : 'bg-slate-900 border-slate-800 hover:shadow-blue-500/10'}`}>
                    <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10"/><path d="M18.4 4.6a9 9 0 1 1-12.8 0"/></svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">CO2 Mitigated</p>
                      <p className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none">{(totalSaved * 0.4).toFixed(1)} <span className="text-sm text-slate-600 font-black uppercase tracking-widest">KG</span></p>
                    </div>
                  </div>
                </div>

                <div className="text-center md:text-right">
                  <div className={`inline-block border-[3px] px-10 py-6 rounded-[2.5rem] transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-2xl' : 'bg-white border-slate-900 shadow-xl shadow-slate-200/50'}`}>
                    <p className={`text-[11px] font-black uppercase tracking-[0.3em] mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Compliance Tier</p>
                    <p className={`text-4xl font-black tracking-tight uppercase ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Platinum</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className={`transition-colors duration-500 border-t py-16 px-10 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-[11px] font-black uppercase tracking-[0.4em] gap-12 text-slate-400">
          <div className="flex items-center gap-5">
             <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black shadow-2xl ring-1 ring-slate-800">ES</div>
             <span className={`text-xl tracking-tighter font-black transition-colors ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>EcoSense AI</span>
          </div>
          <p className="text-center md:text-left max-w-sm font-bold opacity-70">Distributed Infrastructure Management powered by Google Gemini Multi-Modal Logic.</p>
          <div className="flex gap-12">
            <a href="#" className="hover:text-blue-600 transition-colors">Safety Protocols</a>
            <a href="#" className="hover:text-blue-600 transition-colors">API Console</a>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; border: 2px solid transparent; }
      `}</style>
    </div>
  );
}

const CCTVStat = ({ label, value, sub, isDark }: { label: string, value: string, sub: string, isDark: boolean }) => (
  <div className={`p-6 rounded-[2rem] border text-center transition-all group cursor-default border-b-4 hover:shadow-xl ${isDark ? 'bg-slate-950/50 border-slate-800 border-b-slate-900 hover:border-b-blue-600' : 'bg-slate-50 border-slate-100 border-b-slate-100 hover:border-b-blue-500 hover:bg-white hover:shadow-slate-100'}`}>
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block group-hover:text-blue-600 transition-colors">{label}</span>
    <span className={`text-xl font-black leading-none mb-1.5 block tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</span>
    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sub}</span>
  </div>
);

export default App;