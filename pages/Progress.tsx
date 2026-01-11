
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Plus, TrendingUp, Activity, Moon, Trophy, Scale, X, Check, Loader2, Dumbbell } from 'lucide-react';
import { StatisticsService, ChartDataPoint, PersonalRecord } from '../services/StatisticsService';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../services/storage';
import { motion, AnimatePresence } from 'framer-motion';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        <p className="text-zinc-400 text-xs font-mono mb-1">{label}</p>
        <p className="text-white font-bold font-display text-sm">
          {payload[0].value} {payload[0].payload.unit || ''}
        </p>
      </div>
    );
  }
  return null;
};

const Progress: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [weightData, setWeightData] = useState<ChartDataPoint[]>([]);
  const [volumeData, setVolumeData] = useState<ChartDataPoint[]>([]);
  const [bestLift, setBestLift] = useState<PersonalRecord | null>(null);
  
  // Stats
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [avgSleep, setAvgSleep] = useState(0); 
  
  // Weight Modal
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [newWeight, setNewWeight] = useState('');

  const loadData = async () => {
    if (!user) return;
    try {
      const [wData, vData, consistency, pr] = await Promise.all([
        StatisticsService.getWeightHistory(user.id),
        StatisticsService.getWorkoutVolumeHistory(user.id),
        StatisticsService.getConsistencyData(user.id),
        StatisticsService.getPersonalRecord(user.id)
      ]);
      
      setWeightData(wData);
      setVolumeData(vData);
      setBestLift(pr);
      
      const workoutsCount = consistency.reduce((acc, curr) => acc + curr.value, 0);
      setTotalWorkouts(workoutsCount);
      
      setAvgSleep(7.2); // Placeholder kept as requested changes didn't specify sleep removal

    } catch (e) {
      console.error("Error loading stats", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSaveWeight = async () => {
    if (!newWeight || isNaN(Number(newWeight))) return;
    
    await StorageService.saveBodyMeasurement(Number(newWeight));
    setIsWeightModalOpen(false);
    setNewWeight('');
    // Refresh chart
    await loadData();
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neon-lime">
        <Loader2 size={32} className="animate-spin mb-2" />
        <span className="font-mono text-xs animate-pulse">COMPILING_DATA...</span>
      </div>
    );
  }

  // Calculate current weight display
  const currentWeight = weightData.length > 0 ? weightData[weightData.length - 1].value : 0;
  // Calculate diff only if we have at least 2 points
  let weightDiff = "0";
  if (weightData.length > 1) {
      const start = weightData[0].value;
      const end = weightData[weightData.length - 1].value;
      weightDiff = (end - start).toFixed(1);
  }

  return (
    <div className="h-full overflow-y-auto pb-24 md:pb-0 p-4 md:p-8 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide">Аналитика</h1>
          <p className="text-zinc-500 text-xs font-mono uppercase">Neural Link Established</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
           <Activity size={14} className="text-neon-lime animate-pulse" />
           <span className="text-xs text-neon-lime font-bold">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* --- SECTION 1: BODY WEIGHT --- */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow-lg backdrop-blur-sm relative overflow-hidden group">
           <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                  <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                     <Scale size={14} className="text-neon-cyan" /> Динамика Веса
                  </h2>
                  <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-display font-bold text-white">{currentWeight > 0 ? currentWeight : '--'}</span>
                      <span className="text-sm text-zinc-500">кг</span>
                      {weightData.length > 1 && (
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${Number(weightDiff) <= 0 ? 'bg-neon-lime/10 text-neon-lime' : 'bg-red-500/10 text-red-400'}`}>
                             {Number(weightDiff) > 0 ? '+' : ''}{weightDiff} с начала
                          </span>
                      )}
                  </div>
              </div>
              <button 
                onClick={() => setIsWeightModalOpen(true)}
                className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white hover:bg-neon-lime hover:text-black hover:border-neon-lime transition-all shadow-lg"
              >
                  <Plus size={20} />
              </button>
           </div>
           
           <div className="h-64 w-full relative z-10 flex items-center justify-center">
              {weightData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={weightData}>
                        <defs>
                          <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#27272a" strokeDasharray="3 3" opacity={0.5} />
                        <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                        <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                        <Tooltip content={<CustomTooltip />} cursor={{stroke: '#06b6d4', strokeWidth: 1, strokeDasharray: '4 4'}} />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            unit="кг"
                            stroke="#06b6d4" 
                            strokeWidth={3}
                            fill="url(#weightGradient)" 
                            animationDuration={1500}
                        />
                     </AreaChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="text-center text-zinc-600">
                      <Scale className="mx-auto mb-2 opacity-20" size={48} />
                      <p className="text-sm">Недостаточно данных для графика.</p>
                      <p className="text-xs">Добавьте больше записей веса.</p>
                  </div>
              )}
           </div>
           {/* Cyberpunk Decor */}
           <div className="absolute bottom-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px] pointer-events-none" />
        </div>

        {/* --- SECTION 2: VOLUME LOAD --- */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow-lg backdrop-blur-sm relative overflow-hidden">
           <div className="mb-6 relative z-10">
              <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                 <TrendingUp size={14} className="text-neon-lime" /> Тренировочный Объем
              </h2>
              <div className="flex items-baseline gap-2 mt-1">
                 <span className="text-3xl font-display font-bold text-white">
                    {(volumeData.length > 0 ? volumeData[volumeData.length-1].value : 0) / 1000}k
                 </span>
                 <span className="text-sm text-zinc-500">тоннаж (посл. трен)</span>
              </div>
           </div>

           <div className="h-64 w-full relative z-10 flex items-center justify-center">
              {volumeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={volumeData}>
                        <CartesianGrid vertical={false} stroke="#27272a" strokeDasharray="3 3" opacity={0.5} />
                        <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                        <Bar 
                            dataKey="value" 
                            unit="кг"
                            fill="#ccff00" 
                            radius={[4, 4, 0, 0]}
                            barSize={20}
                            animationDuration={1500}
                        />
                     </BarChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="text-center text-zinc-600">
                      <TrendingUp className="mx-auto mb-2 opacity-20" size={48} />
                      <p className="text-sm">История пуста.</p>
                  </div>
              )}
           </div>
           <div className="absolute bottom-0 left-0 w-32 h-32 bg-lime-500/10 rounded-full blur-[50px] pointer-events-none" />
        </div>

      </div>

      {/* --- SECTION 3: SUMMARY CARDS --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold">Тренировки (мес)</span>
                  <Activity size={16} className="text-neon-lime" />
              </div>
              <div>
                  <span className="text-2xl font-bold font-display text-white">{totalWorkouts}</span>
                  <span className="text-xs text-zinc-500 ml-1">сессий</span>
              </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold">Средний сон</span>
                  <Moon size={16} className="text-purple-400" />
              </div>
              <div>
                  <span className="text-2xl font-bold font-display text-white">{avgSleep}</span>
                  <span className="text-xs text-zinc-500 ml-1">часов</span>
              </div>
          </div>

          {/* BEST LIFT (PERSONAL RECORD) */}
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between col-span-2 md:col-span-2 relative overflow-hidden">
               <div className="relative z-10 flex justify-between items-start w-full">
                   <div className="flex flex-col justify-between h-full w-full">
                       <span className="text-zinc-500 text-[10px] uppercase font-bold flex items-center gap-1 mb-2">
                           <Trophy size={12} className="text-yellow-500" /> Лучший результат
                       </span>
                       
                       {bestLift ? (
                           <div className="flex justify-between items-end w-full">
                               <p className="text-lg font-bold text-white leading-tight max-w-[60%] truncate">{bestLift.exercise}</p>
                               <div className="text-right">
                                   <span className="text-2xl font-bold font-display text-neon-blue">{bestLift.weight}</span>
                                   <span className="text-xs text-zinc-500">кг</span>
                               </div>
                           </div>
                       ) : (
                           <div className="flex items-center gap-3 mt-1 opacity-50">
                               <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                   <Dumbbell size={16} className="text-zinc-500"/>
                               </div>
                               <p className="text-xs text-zinc-400">Скоро здесь появится твой первый рекорд.</p>
                           </div>
                       )}
                   </div>
               </div>
               <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-yellow-500/10 rounded-full blur-[30px]" />
          </div>
      </div>

      {/* --- WEIGHT MODAL --- */}
      <AnimatePresence>
        {isWeightModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsWeightModalOpen(false)}>
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               onClick={(e) => e.stopPropagation()}
               className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl"
             >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Записать вес</h3>
                    <button onClick={() => setIsWeightModalOpen(false)}><X size={20} className="text-zinc-500 hover:text-white"/></button>
                </div>
                
                <div className="relative mb-6">
                    <input 
                      type="number" 
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      placeholder="0.0"
                      autoFocus
                      className="w-full bg-black border border-zinc-700 rounded-xl py-4 px-4 text-center text-3xl font-display font-bold text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">КГ</span>
                </div>

                <button 
                  onClick={handleSaveWeight}
                  disabled={!newWeight}
                  className="w-full bg-neon-cyan text-black font-bold py-3.5 rounded-xl hover:bg-white hover:shadow-[0_0_20px_#06b6d4] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={18} /> СОХРАНИТЬ
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Progress;
