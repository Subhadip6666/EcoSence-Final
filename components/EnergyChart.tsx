import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { EnergyStats } from '../types';

interface EnergyChartProps {
  data: EnergyStats[];
  isDark?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-2xl shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-8">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: entry.color }}></div>
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight">{entry.name}</span>
              </span>
              <span className="text-xs font-black text-white tabular-nums">{entry.value.toFixed(2)} kW</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const EnergyChart: React.FC<EnergyChartProps> = ({ data, isDark }) => {
  const currentConsumption = data.length > 0 ? data[data.length - 1].consumption : 0;
  const currentSavings = data.length > 0 ? data[data.length - 1].savings : 0;

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-6">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600/10 text-blue-600 px-4 py-2 rounded-2xl flex items-center gap-3 border border-blue-600/20 shadow-sm shadow-blue-50">
             <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Stream Telemetry</span>
          </div>
          <div>
            <h3 className={`text-sm font-black uppercase tracking-[0.1em] mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
              Campus Power Distribution
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
              Real-time load balancing vs active conservation
            </p>
          </div>
        </div>
        
        <div className={`flex items-center gap-10 p-4 px-8 rounded-3xl border shadow-sm transition-colors duration-500 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Current Consumption</span>
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"></div>
              <span className={`text-lg font-black tabular-nums tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentConsumption.toFixed(2)} <span className="text-[10px] text-slate-500 uppercase">kW</span></span>
            </div>
          </div>
          <div className={`w-px h-10 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Eco Mitigation</span>
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
              <span className={`text-lg font-black tabular-nums tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentSavings.toFixed(2)} <span className="text-[10px] text-slate-500 uppercase">kW</span></span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full h-[450px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={isDark ? 0.3 : 0.15}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={isDark ? 0.3 : 0.15}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="6 6" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
            <XAxis 
              dataKey="timestamp" 
              axisLine={false} 
              tickLine={false} 
              tick={{fontSize: 9, fill: isDark ? '#475569' : '#94a3b8', fontWeight: 800}} 
              dy={15}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fontSize: 9, fill: isDark ? '#475569' : '#94a3b8', fontWeight: 800}}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: isDark ? '#334155' : '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area 
              type="monotone" 
              dataKey="consumption" 
              name="Power Consumption" 
              stroke="#3b82f6" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#usageGradient)" 
              isAnimationActive={false}
              activeDot={{ r: 6, strokeWidth: 2, stroke: isDark ? '#1e293b' : '#fff', fill: '#3b82f6' }}
            />
            <Area 
              type="monotone" 
              dataKey="savings" 
              name="AI Energy Savings" 
              stroke="#10b981" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#savingsGradient)" 
              isAnimationActive={false}
              activeDot={{ r: 6, strokeWidth: 2, stroke: isDark ? '#1e293b' : '#fff', fill: '#10b981' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};