import React from 'react';
import { RoomData, RoomStatus } from '../types';

interface RoomCardProps {
  room: RoomData;
  onAnalyze: (roomId: string) => void;
  isAnalyzing: boolean;
  isLinkedToCCTV: boolean;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onAnalyze, isAnalyzing, isLinkedToCCTV }) => {
  const isOccupied = room.status === RoomStatus.OCCUPIED;
  
  const totalPower = room.devices.reduce((acc, d) => acc + (d.isOn ? d.powerConsumption : 0), 0);

  return (
    <div className={`rounded-3xl shadow-sm border overflow-hidden flex flex-col h-full group hover:shadow-xl transition-all duration-300 ${
      isLinkedToCCTV 
        ? 'ring-2 ring-blue-500 border-transparent shadow-blue-100 dark:shadow-blue-900/20' 
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
    }`}>
      <div className="relative h-44 overflow-hidden">
        <img 
          src={room.imageUrl} 
          alt={room.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
               <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg ${
                 isOccupied ? 'bg-green-500 text-white' : 'bg-slate-600 text-white'
               }`}>
                 {room.status}
               </span>
               {isLinkedToCCTV && (
                 <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse flex items-center gap-1.5 shadow-lg">
                   <span className="w-2 h-2 bg-white rounded-full"></span>
                   LIVE MONITOR
                 </span>
               )}
             </div>
             <span className="text-white text-[10px] font-black tracking-widest uppercase opacity-80">
                T: {new Date(room.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </span>
          </div>
        </div>
        {isAnalyzing && (
          <div className="absolute inset-0 bg-blue-600/30 backdrop-blur-[3px] flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span className="text-white text-[10px] font-black uppercase tracking-[0.3em] drop-shadow-md">AI Sync In Progress</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="mb-5">
          <h3 className="font-black text-slate-800 dark:text-slate-100 text-xl leading-tight mb-2 uppercase tracking-tight">{room.name}</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {isOccupied ? `${room.occupancyCount} Occupants Active` : 'Scanning for Occupancy'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Ambient Temp</p>
            <p className="font-black text-slate-800 dark:text-slate-200 text-lg tabular-nums">{room.temperature}°C</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Lux Intensity</p>
            <p className="font-black text-slate-800 dark:text-slate-200 text-lg tabular-nums">{room.brightness}%</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            <span>Grid I/O Status</span>
            <span className="text-blue-500">{totalPower}W Load</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {room.devices.map(device => (
              <div 
                key={device.id} 
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border flex items-center gap-2 transition-all duration-300 ${
                  device.isOn 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${device.isOn ? 'bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                {device.name}
                {device.type === 'FAN' && device.isOn && (
                  <span className="bg-blue-500/20 px-1.5 rounded-md text-[8px] border border-blue-500/20">S{device.speed}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <button 
            onClick={() => onAnalyze(room.id)}
            disabled={isAnalyzing}
            className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 active:scale-95 shadow-xl ${
              isAnalyzing 
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700' 
              : isLinkedToCCTV 
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/20'
                : 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-black dark:hover:bg-blue-700 shadow-slate-900/20 dark:shadow-blue-900/20'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M2 12h20"/><path d="m16.24 7.76-8.48 8.48"/><path d="m7.76 7.76 8.48 8.48"/></svg>
            {isLinkedToCCTV ? 'Live Capture & Scan' : 'Audit Node'}
          </button>
        </div>
      </div>
    </div>
  );
};