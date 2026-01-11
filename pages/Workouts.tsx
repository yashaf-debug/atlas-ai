
import React, { useMemo, useEffect, useState } from 'react';
import { Dumbbell, Calendar, ChevronRight, BarChart3, TrendingUp, CalendarDays, Clock, ChevronDown, ChevronUp, Layers, Loader2, Trash2, AlertCircle, Activity } from 'lucide-react';
import { useWorkout } from '../context/WorkoutContext';
import { StorageService } from '../services/storage';
import { WeeklyPlanDay } from '../services/gemini';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const Workouts: React.FC = () => {
  const { history, getWeeklyStats, deleteSession } = useWorkout();
  const { totalWorkouts, totalVolume } = getWeeklyStats();
  
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanDay[] | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      setIsLoadingPlan(true);
      try {
        const plan = await StorageService.getWeeklyPlan();
        setWeeklyPlan(plan);
      } catch (e) {
        console.error("Failed to load plan", e);
      } finally {
        setIsLoadingPlan(false);
      }
    };
    fetchPlan();
  }, [activeTab]); // Refresh when switching tabs just in case

  const chartData = useMemo(() => {
    const last7Days = new Map<string, number>();
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('ru-RU', { weekday: 'short' });
      last7Days.set(dayStr, 0);
    }

    history.forEach(session => {
      const date = new Date(session.date);
      if ((now.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000) {
        const dayStr = date.toLocaleDateString('ru-RU', { weekday: 'short' });
        if (last7Days.has(dayStr)) {
          last7Days.set(dayStr, (last7Days.get(dayStr) || 0) + session.volume);
        }
      }
    });

    return Array.from(last7Days).map(([name, volume]) => ({ name, volume }));
  }, [history]);

  const toggleSessionDetails = (id: string) => {
    setExpandedSessionId(expandedSessionId === id ? null : id);
  };

  const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm("Вы уверены? Это удалит запись о тренировке из истории.")) {
          await deleteSession(id);
      }
  };

  const handleDeleteSchedule = async (id: string | undefined) => {
      if (!id) return;
      if (window.confirm("Удалить эту запланированную тренировку из расписания?")) {
          // Optimistic local update
          setWeeklyPlan(prev => prev ? prev.filter(p => p.id !== id) : []);
          await StorageService.deleteScheduledWorkout(id);
      }
  };

  return (
    <div className="pb-24 md:pb-0 h-full overflow-y-auto">
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-display font-bold mb-6">Дневник тренировок</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Тренировки (Нед)', value: totalWorkouts.toString(), unit: 'Выполнено', icon: Dumbbell },
            { label: 'Объем (Нед)', value: (totalVolume / 1000).toFixed(1) + 'k', unit: 'Кг Поднято', icon: TrendingUp },
            { label: 'Всего записей', value: history.length.toString(), unit: 'За всё время', icon: Calendar },
            { label: 'Статус', value: 'Активен', unit: 'Система', active: true, icon: BarChart3 },
          ].map((stat, i) => (
            <div key={i} className={`p-4 rounded-xl border relative overflow-hidden group ${stat.active ? 'bg-neon-lime/10 border-neon-lime/30' : 'bg-zinc-900/50 border-zinc-800'}`}>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-zinc-400 text-xs uppercase tracking-wider">{stat.label}</p>
                  <stat.icon size={16} className={stat.active ? 'text-neon-lime' : 'text-zinc-600'} />
                </div>
                <p className={`text-2xl font-bold font-display mt-1 ${stat.active ? 'text-neon-lime' : 'text-white'}`}>{stat.value}</p>
                <p className="text-zinc-500 text-xs">{stat.unit}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-900/50 p-1 rounded-xl mb-6 border border-zinc-800">
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2
              ${activeTab === 'schedule' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <CalendarDays size={16} /> Расписание
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2
              ${activeTab === 'history' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Layers size={16} /> История
          </button>
        </div>

        {/* Content Area */}
        <AnimatePresence mode='wait'>
          {activeTab === 'schedule' ? (
            <motion.div 
              key="schedule"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {isLoadingPlan ? (
                 <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                    <Loader2 className="animate-spin mb-2 text-neon-lime" size={32} />
                    <p>Синхронизация расписания...</p>
                 </div>
              ) : weeklyPlan && weeklyPlan.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {weeklyPlan.map((dayPlan, i) => (
                    <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 hover:border-neon-blue/50 transition-colors group relative">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-lg text-white">{dayPlan.day}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-neon-blue bg-neon-blue/10 border border-neon-blue/20 px-2 py-1 rounded-full uppercase tracking-wider font-bold shadow-[0_0_10px_rgba(0,255,255,0.1)]">
                            {dayPlan.focus}
                            </span>
                            <button 
                                onClick={() => handleDeleteSchedule(dayPlan.id)}
                                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-colors border border-transparent hover:border-red-900/30"
                                title="Удалить из расписания"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                      </div>
                      
                      {dayPlan.description && (
                        <div className="mb-4 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
                           <p className="text-xs text-zinc-400 italic">"{dayPlan.description}"</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        {Array.isArray(dayPlan.exercises) && dayPlan.exercises.length > 0 ? (
                          dayPlan.exercises.map((ex, j) => {
                            // Fallback for missing name/sets/reps to prevent invisible rows
                            const name = ex.name || (ex as any).exercise || "Упражнение";
                            const sets = ex.sets || 3;
                            const reps = ex.reps || 12;

                            return (
                              <div key={j} className="flex items-center justify-between text-sm p-2 bg-black/40 border border-zinc-800/50 rounded-lg">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-1.5 h-1.5 rounded-full bg-neon-lime/70 shrink-0" />
                                    <span className="text-zinc-200 font-medium truncate">{name}</span>
                                </div>
                                <span className="text-zinc-400 font-mono bg-zinc-900 px-2 py-0.5 rounded text-xs shrink-0 border border-zinc-800">
                                    {sets}×{reps}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 text-zinc-600 gap-2">
                             <div className="w-8 h-8 rounded-full bg-zinc-800/50 flex items-center justify-center"><Dumbbell size={14} /></div>
                             <span className="text-xs italic">Отдых или Кардио</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl">
                  <CalendarDays size={48} className="mx-auto text-zinc-700 mb-4" />
                  <h3 className="text-xl font-bold text-zinc-300">Расписание не найдено</h3>
                  <p className="text-zinc-500 mt-2">Попроси Atlas составить программу тренировок в чате.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Chart Section */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-zinc-200">
                  <TrendingUp size={18} className="text-neon-lime" />
                  Аналитика Объема (Последние 7 дней)
                </h2>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis 
                        dataKey="name" 
                        stroke="#52525b" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
                        itemStyle={{ color: '#ccff00' }}
                      />
                      <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.volume > 0 ? '#ccff00' : '#27272a'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* History List */}
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
                    <Dumbbell className="mx-auto mb-3 opacity-20" size={48} />
                    <p>История пуста.</p>
                    <p className="text-xs mt-1">Завершите первую тренировку, чтобы увидеть её здесь.</p>
                  </div>
                ) : (
                  history.map((session) => (
                    <div key={session.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden transition-all hover:border-zinc-700 group">
                      <div 
                        onClick={() => toggleSessionDetails(session.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-800/30"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <Dumbbell size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-xs text-neon-lime font-mono border border-neon-lime/20 bg-neon-lime/5 px-1.5 rounded">
                                  {new Date(session.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                </span>
                               <h3 className="font-bold text-white">{session.title}</h3>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              <span className="flex items-center gap-1"><TrendingUp size={10}/> {session.volume} кг</span>
                              <span className="flex items-center gap-1"><Clock size={10}/> {session.duration}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={(e) => handleDeleteHistory(e, session.id)}
                                className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-950/30 rounded-full transition-colors"
                                title="Удалить из истории"
                            >
                                <Trash2 size={18} />
                            </button>
                            <button className="text-zinc-500 hover:text-white transition-colors p-2">
                                {expandedSessionId === session.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      <AnimatePresence>
                        {expandedSessionId === session.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-black/20 border-t border-zinc-800"
                          >
                            <div className="p-4 space-y-2">
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2">Выполненные упражнения</p>
                                {session.exercises.map((ex, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-zinc-800/50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${ex.completed ? 'bg-neon-lime' : 'bg-red-500'}`} />
                                            <span className="text-zinc-300">{ex.name}</span>
                                        </div>
                                        <div className="font-mono text-zinc-400 text-xs bg-zinc-900 px-2 py-1 rounded">
                                            {ex.weight} × {ex.sets} × {ex.reps}
                                        </div>
                                    </div>
                                ))}
                                {session.rpe && session.rpe > 0 && (
                                   <div className="flex items-center gap-2 mt-4 pt-2 border-t border-zinc-800">
                                       <Activity size={12} className={session.rpe >= 8 ? 'text-red-500' : 'text-neon-lime'} />
                                       <span className="text-xs text-zinc-400">RPE: <span className="text-white font-bold">{session.rpe}/10</span></span>
                                   </div>
                                )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Workouts;
