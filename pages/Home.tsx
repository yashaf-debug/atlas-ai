
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Check, Timer, Weight, AlertCircle, Loader2, Save, RotateCcw, Hash, Info, X, Play, Bell, Battery, Zap, Trophy, Star, ChevronDown, ChevronUp, Flame, Paperclip, Image as ImageIcon, ArrowUp, Droplet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { sendMessageToGemini } from '../services/gemini';
import { useWorkout, ExerciseLog } from '../context/WorkoutContext';
import { useProfile } from '../context/ProfileContext';
import { StorageService } from '../services/storage';
import { StatisticsService } from '../services/StatisticsService';
import DailyCheckInModal from '../components/DailyCheckInModal';

// --- Types ---
// NOTE: Exercise type is now aligned with WorkoutContext types to ensure consistency

type WorkoutWidgetData = {
  title: string;
  duration: string;
  exercises: ExerciseLog[];
};

type Message = {
  id: string;
  role: 'user' | 'ai';
  text?: string;
  image?: string; // Base64 or URL
  widget?: {
    type: 'workout_plan' | 'weekly_plan' | 'nutrition_plan';
    data: any;
  };
  timestamp: Date;
  isError?: boolean;
  isHidden?: boolean;
};

// Simple Beep Sound (Base64)
const BEEP_SOUND = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU";

// --- Sub-Components ---

// 1. Floating Timer Component
interface FloatingTimerProps {
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
  onStop: () => void;
}

const FloatingTimer: React.FC<FloatingTimerProps> = ({ timeLeft, totalTime, isActive, onStop }) => {
  if (!isActive && timeLeft === 0) return null;

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / totalTime;
  const dashoffset = circumference * (1 - progress);

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-900/90 backdrop-blur-md border border-neon-lime/30 pl-3 pr-4 py-2 rounded-full shadow-[0_0_20px_rgba(204,255,0,0.2)]"
    >
      <div className="relative w-10 h-10 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="20" cy="20" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" className="text-zinc-800" />
          <circle cx="20" cy="20" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={circumference} strokeDashoffset={dashoffset} strokeLinecap="round" className="text-neon-lime transition-all duration-1000 ease-linear" />
        </svg>
        <span className="absolute text-[10px] font-bold font-mono text-white">{timeLeft}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Отдых</span>
        <span className="text-xs font-bold text-white">Таймер активен</span>
      </div>
      <button onClick={onStop} className="ml-2 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-red-900 hover:text-red-200 transition-colors"><X size={14} /></button>
    </motion.div>
  );
};

// 2. XP Modal Component
interface XpModalProps {
  xpGained: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const XpModal: React.FC<XpModalProps> = ({ xpGained, isOpen, onClose, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="bg-zinc-900 border border-neon-lime rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(204,255,0,0.2)] max-w-sm w-full relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-0 left-0 w-full h-1 bg-neon-lime shadow-[0_0_20px_#ccff00]"></div>
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-neon-lime/10 rounded-full blur-[50px]"></div>
        <div className="flex justify-center mb-4"><div className="w-20 h-20 rounded-full bg-neon-lime/10 border-2 border-neon-lime flex items-center justify-center shadow-[0_0_20px_#ccff00]"><Trophy size={40} className="text-neon-lime" /></div></div>
        <h2 className="text-2xl font-display font-bold text-white mb-2">{title || "Задание выполнено!"}</h2>
        <p className="text-zinc-400 text-sm mb-6">Прогресс синхронизирован.</p>
        <div className="text-5xl font-display font-bold text-neon-lime mb-8 drop-shadow-[0_0_10px_rgba(204,255,0,0.5)]">+{xpGained} <span className="text-lg">XP</span></div>
        <button onClick={onClose} className="w-full py-3 bg-neon-lime text-black font-bold rounded-xl hover:bg-white hover:shadow-[0_0_20px_#ccff00] transition-all">ПРОДОЛЖИТЬ</button>
      </motion.div>
    </div>
  );
};

// 3. RPE Modal Component
interface RpeModalProps {
  isOpen: boolean;
  onConfirm: (rpe: number) => void;
}

const RpeModal: React.FC<RpeModalProps> = ({ isOpen, onConfirm }) => {
  const [value, setValue] = useState(7);

  if (!isOpen) return null;

  const getColor = (v: number) => {
    if (v >= 9) return 'text-red-500';
    if (v >= 7) return 'text-orange-500';
    if (v >= 4) return 'text-neon-lime';
    return 'text-blue-400';
  };

  const getText = (v: number) => {
    if (v === 10) return "Отказ / Максимум";
    if (v >= 8) return "Очень тяжело";
    if (v >= 6) return "Тяжело, но с запасом";
    if (v >= 4) return "Умеренно";
    return "Легко / Разминка";
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-xl font-bold text-white mb-2 text-center">Оценка Нагрузки (RPE)</h3>
        <p className="text-zinc-400 text-xs text-center mb-6">Насколько тяжелой была эта тренировка по шкале от 1 до 10?</p>

        <div className="flex justify-center items-end mb-8 gap-2">
          <span className={`text-6xl font-display font-bold ${getColor(value)}`}>{value}</span>
          <span className="text-zinc-600 text-lg font-bold mb-2">/10</span>
        </div>

        <input
          type="range" min="1" max="10" step="1"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white mb-4"
        />

        <p className={`text-center font-bold text-sm mb-8 ${getColor(value)}`}>{getText(value)}</p>

        <button onClick={() => onConfirm(value)} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors">
          ОТПРАВИТЬ ОТЧЕТ
        </button>
      </motion.div>
    </div>
  );
};

// 4. Workout Card (Complex)
interface WorkoutCardProps {
  data: WorkoutWidgetData;
  onStartTimer: (seconds: number) => void;
  onComplete: (xp: number, results: any[], rpe: number) => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ data, onStartTimer, onComplete }) => {
  const { activeWorkout, activeWorkoutTitle, updateActiveWorkout, logWorkout } = useWorkout();

  // Use global persisted state if titles match, otherwise use fresh data
  const isPersisted = activeWorkout.length > 0 && activeWorkoutTitle === data.title;

  const [exercises, setExercises] = useState<ExerciseLog[]>(() => {
    if (isPersisted) return activeWorkout;
    return data.exercises.map(ex => ({
      ...ex,
      actualSets: ex.actualSets ?? ex.sets,
      actualReps: ex.actualReps ?? ex.reps,
      actualWeight: ex.actualWeight ?? ex.weight
    }));
  });

  const [isLogged, setIsLogged] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // RPE Flow
  const [showRpe, setShowRpe] = useState(false);

  // Sync state to global Context/LocalStorage on every change
  useEffect(() => {
    if (!isLogged) {
      updateActiveWorkout(exercises, data.title);
    }
  }, [exercises, isLogged, data.title]);

  const toggleExercise = (id: string) => {
    if (isLogged) return;
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, completed: !ex.completed } : ex));
  };

  const handleInputChange = (id: string, field: keyof ExerciseLog, value: string | number) => {
    if (isLogged) return;
    setExercises(prev => prev.map(ex => {
      if (ex.id === id) {
        return { ...ex, [field]: value };
      }
      return ex;
    }));
  };

  const handleFinishClick = () => {
    setShowRpe(true);
  };

  const handleRpeConfirm = (rpe: number) => {
    setShowRpe(false);

    // Calculate final stats
    let totalVolume = 0;
    exercises.forEach(ex => {
      if (ex.completed) {
        const w = parseInt(String(ex.actualWeight || 0)) || 0;
        const s = Number(ex.actualSets) || 0;
        const r = parseInt(String(ex.actualReps || 0)) || 0;
        totalVolume += (w * s * r);
      }
    });

    logWorkout(data.title, data.duration, exercises, rpe);
    setIsLogged(true);
    setIsCollapsed(true); // Auto collapse on finish

    let xp = 100;
    if (exercises.filter(e => e.completed).length === exercises.length) xp += 50;

    onComplete(xp, exercises, rpe);
  };

  const progress = exercises.length > 0 ? Math.round((exercises.filter(e => e.completed).length / exercises.length) * 100) : 0;

  // Calculate Volume for completed summary
  const currentVolume = exercises.reduce((acc, ex) => {
    if (!ex.completed) return acc;
    const w = parseInt(String(ex.actualWeight || 0)) || 0;
    const s = Number(ex.actualSets) || 0;
    const r = parseInt(String(ex.actualReps || 0)) || 0;
    return acc + (w * s * r);
  }, 0);

  if (isCollapsed) {
    return (
      <div className="w-full bg-zinc-900 border border-neon-lime/30 rounded-xl p-4 my-2 shadow-lg flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <Check size={18} className="text-neon-lime" /> Тренировка завершена
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Объем: {currentVolume} кг • Упражнений: {exercises.filter(e => e.completed).length}/{exercises.length}
          </p>
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="text-xs bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded hover:bg-zinc-700 transition-colors"
        >
          Показать детали
        </button>
      </div>
    );
  }

  return (
    <>
      <RpeModal isOpen={showRpe} onConfirm={handleRpeConfirm} />

      <div className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl overflow-hidden my-2 shadow-lg">
        <div className="bg-zinc-800/80 p-4 border-b border-zinc-700 flex justify-between items-center">
          <div>
            <h3 className="font-display font-bold text-white text-lg">{data.title}</h3>
            <p className="text-zinc-400 text-xs flex items-center gap-1"><Timer size={12} /> {data.duration} • {exercises.length} упражнений</p>
          </div>
          <div className="flex items-center gap-2">
            {isLogged && (
              <button onClick={() => setIsCollapsed(true)} className="p-2 text-zinc-500 hover:text-white"><ChevronUp size={20} /></button>
            )}
            <div className="relative">
              <button onClick={() => setShowTimerMenu(!showTimerMenu)} className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-neon-blue hover:text-white hover:border-neon-blue transition-all"><Timer size={20} /></button>
              {showTimerMenu && (<div className="absolute right-0 top-12 z-20 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 flex flex-col gap-1 w-24">{[30, 60, 90, 120].map(sec => (<button key={sec} onClick={() => { onStartTimer(sec); setShowTimerMenu(false); }} className="px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-neon-lime rounded text-left transition-colors">{sec} сек</button>))}</div>)}
            </div>
          </div>
        </div>
        <div className="divide-y divide-zinc-800">
          {exercises.map((ex) => (
            <div key={ex.id} className={`p-4 transition-colors ${ex.completed ? 'bg-neon-lime/5' : ''}`}>

              {/* Header Row: Checkbox, Name, Info */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleExercise(ex.id)} disabled={isLogged} className={`w-6 h-6 rounded border flex items-center justify-center transition-all shrink-0 ${ex.completed ? 'bg-neon-lime border-neon-lime text-black' : 'border-zinc-600 hover:border-neon-lime'} ${isLogged ? 'opacity-50 cursor-not-allowed' : ''}`}>{ex.completed && <Check size={14} strokeWidth={3} />}</button>
                  <div className="flex flex-col">
                    <h4 className={`font-bold text-sm ${ex.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{ex.name}</h4>
                    {ex.target_muscle && (
                      <span className="text-[10px] text-black bg-neon-blue font-bold px-1.5 py-0.5 rounded w-fit mt-1 opacity-80">{ex.target_muscle}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => setExpandedExercise(expandedExercise === ex.id ? null : ex.id)} className="text-zinc-500 hover:text-white p-1"><Info size={16} /></button>
              </div>

              {/* Inputs Grid */}
              <div className="grid grid-cols-3 gap-3 mb-2">
                {/* Sets */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold text-center">Подходы</label>
                  <input
                    type="number"
                    value={ex.actualSets ?? ''}
                    onChange={(e) => handleInputChange(ex.id, 'actualSets', e.target.value)}
                    placeholder={String(ex.sets)}
                    disabled={isLogged}
                    className="w-full bg-black border border-zinc-700 rounded-lg py-2 px-1 text-center text-white font-mono text-sm focus:border-neon-lime focus:outline-none focus:ring-1 focus:ring-neon-lime transition-all min-h-[40px]"
                  />
                </div>
                {/* Reps */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold text-center">Повторы</label>
                  <input
                    type="text"
                    value={ex.actualReps ?? ''}
                    onChange={(e) => handleInputChange(ex.id, 'actualReps', e.target.value)}
                    placeholder={String(ex.reps || '')}
                    disabled={isLogged}
                    className="w-full bg-black border border-zinc-700 rounded-lg py-2 px-1 text-center text-white font-mono text-sm focus:border-neon-lime focus:outline-none focus:ring-1 focus:ring-neon-lime transition-all min-h-[40px]"
                  />
                </div>
                {/* Weight */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold text-center">Вес (кг)</label>
                  <input
                    type="text"
                    value={ex.actualWeight ?? ''}
                    onChange={(e) => handleInputChange(ex.id, 'actualWeight', e.target.value)}
                    placeholder={String(ex.weight || '')}
                    disabled={isLogged}
                    className="w-full bg-black border border-zinc-700 rounded-lg py-2 px-1 text-center text-white font-mono text-sm focus:border-neon-lime focus:outline-none focus:ring-1 focus:ring-neon-lime transition-all min-h-[40px]"
                  />
                </div>
              </div>

              {/* Expanded Info */}
              <AnimatePresence>
                {expandedExercise === ex.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 pt-3 border-t border-zinc-800 overflow-hidden text-xs text-zinc-400 space-y-2">
                    {ex.technique && <p><strong className="text-neon-blue">Техника:</strong> {ex.technique}</p>}
                    {ex.tips && <p><strong className="text-neon-lime">Совет:</strong> {ex.tips}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        {isLogged ? (
          <div className="p-4 bg-zinc-900 border-t border-zinc-800 text-center"><span className="text-neon-lime font-bold text-sm flex items-center justify-center gap-2"><Check size={16} /> ТРЕНИРОВКА ЗАВЕРШЕНА</span></div>
        ) : (
          <div className="p-4 bg-zinc-900 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-2"><span className="text-xs text-zinc-500">Прогресс</span><span className="text-xs font-bold text-white">{progress}%</span></div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-4"><div className="bg-neon-lime h-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
            <button onClick={handleFinishClick} disabled={progress === 0} className="w-full bg-zinc-800 hover:bg-neon-lime hover:text-black text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Save size={18} /> ЗАВЕРШИТЬ ТРЕНИРОВКУ</button>
          </div>
        )}
      </div>
    </>
  );
};

// --- MAIN PAGE COMPONENT ---
const Home: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination State
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const MSG_PAGE_SIZE = 10;

  const [showXpModal, setShowXpModal] = useState(false);
  const [xpGained, setXpGained] = useState(0);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [totalTimerSeconds, setTotalTimerSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Contexts
  const { profile, dailyStatus, addXp, needsCheckIn, submitDailyCheckIn, updateProfile } = useProfile();
  const { activeWorkout, history } = useWorkout(); // Access history for memory injection
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoadRef = useRef(true); // Track initial scroll
  const lastMsgIdRef = useRef<string | null>(null); // To detect if new message added at bottom

  // Initialize Audio for Timer Beep
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Image Upload State
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  // --- INITIAL LOAD: FETCH HISTORY ---
  useEffect(() => {
    const loadChat = async () => {
      // 1. Get history from Supabase (Limit 10, Offset 0)
      const history = await StorageService.getChatHistory(MSG_PAGE_SIZE, 0);

      if (history.length < MSG_PAGE_SIZE) {
        setHasMore(false);
      }

      if (history.length > 0) {
        setMessages(history);
      } else {
        // 2. If empty, create initial Welcome Message & SAVE IT to DB
        if (profile) {
          const initialMsg: Message = {
            id: 'init_' + Date.now(),
            role: 'ai',
            text: `С возвращением, ${profile.name}. \n\nЗаряд батарей: ${dailyStatus.bodyBattery}%. \nГотов к работе.`,
            timestamp: new Date()
          };
          setMessages([initialMsg]);
          // Persist immediately
          await StorageService.addChatMessage({ role: 'ai', text: initialMsg.text });
        }
      }
    };

    // Check if profile exists before loading to ensure we have a User ID implicitly via auth context
    if (profile) {
      loadChat();
    }

    // Init Audio
    audioRef.current = new Audio(BEEP_SOUND);
  }, [profile, dailyStatus.bodyBattery]);

  // --- PAGINATION HANDLER ---
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    // Calculate current offset based on loaded messages
    const currentCount = messages.length;

    const olderMessages = await StorageService.getChatHistory(MSG_PAGE_SIZE, currentCount);

    if (olderMessages.length < MSG_PAGE_SIZE) {
      setHasMore(false);
    }

    if (olderMessages.length > 0) {
      setMessages(prev => [...olderMessages, ...prev]);
    }

    setIsLoadingMore(false);
  };

  // Aggressive Scroll Logic (Modified to not scroll on load more)
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    const currentLastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    const isNewMessage = currentLastMsg && currentLastMsg.id !== lastMsgIdRef.current;

    // Only scroll if initial load OR if a *new* message was added at the bottom
    // This prevents scrolling when loading older messages at the top
    if ((isInitialLoadRef.current || isNewMessage || isLoading) && !isLoadingMore) {
      if (isInitialLoadRef.current) {
        scrollToBottom('auto');
        setTimeout(() => scrollToBottom('auto'), 50);
        isInitialLoadRef.current = false;
      } else {
        scrollToBottom('smooth');
      }
    }

    // Explicitly scroll if the last message has a widget (forces view on new workouts)
    if (currentLastMsg && currentLastMsg.widget) {
      setTimeout(() => scrollToBottom('smooth'), 100);
    }

    if (currentLastMsg) {
      lastMsgIdRef.current = currentLastMsg.id;
    }
  }, [messages, isLoading, isLoadingMore]);

  // Timer Logic
  useEffect(() => {
    if (timerSeconds > 0) {
      timerRef.current = window.setTimeout(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && totalTimerSeconds > 0) {
      // Timer finished
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log("Audio play failed", e));
      }
      // Reset total to stop loop but keep 0 visible for a moment if needed
      setTimeout(() => setTotalTimerSeconds(0), 2000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerSeconds, totalTimerSeconds]);

  const handleStartTimer = (seconds: number) => {
    setTotalTimerSeconds(seconds);
    setTimerSeconds(seconds);
  };

  const handleStopTimer = () => {
    setTimerSeconds(0);
    setTotalTimerSeconds(0);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleWorkoutComplete = async (xp: number, results: any[], rpe: number) => {
    const result = await addXp(xp);
    setXpGained(xp);
    setShowXpModal(true);

    // Auto-Send Feedback Request to AI
    const report = `[СИСТЕМНЫЙ ОТЧЕТ]
    Пользователь завершил тренировку.
    RPE: ${rpe}/10.
    Выполненные упражнения:
    ${results.filter((e: any) => e.completed).map((e: any) => `- ${e.name}: ${e.actualWeight}кг x ${e.actualReps} повт x ${e.actualSets} подх`).join('\n')}
    
    Задача: Дай краткий фидбек по RPE и 2 совета по восстановлению.`;

    handleSend(report, true);
  };

  // Image Handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPendingImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSend = async (textOverride?: string, isSystemReport: boolean = false) => {
    const textToSend = textOverride || input;
    // Allow empty text if sending image
    if (!textToSend.trim() && !pendingImage) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: isSystemReport ? "✅ Тренировка завершена. Отчет отправлен." : textToSend, // Mask system reports in UI
      image: isSystemReport ? undefined : pendingImage || undefined,
      timestamp: new Date(),
      isHidden: isSystemReport
    };

    // 1. Optimistic Update (Show what user typed, or a confirmation for system reports)
    setMessages(prev => [...prev, userMsg]);
    if (!isSystemReport) {
      setInput('');
      setPendingImage(null);
    }
    setIsLoading(true);

    // 2. Persist User Message (Actual content for AI context)
    StorageService.addChatMessage({ role: 'user', text: textToSend, image: userMsg.image });

    // Prepare context
    const userContext = JSON.stringify({
      name: profile?.name,
      bodyBattery: dailyStatus.bodyBattery,
      currentDate: new Date().toLocaleDateString(),
      INJURIES: profile?.injuries || "Нет",
      EQUIPMENT: profile?.equipment || "Стандартный зал",
      GOAL: profile?.fitness_goal
    });

    // Prepare History Context (Memory of Weights)
    const recentHistory = history.slice(0, 3).map(s => `
      [${new Date(s.date).toLocaleDateString()}] ${s.title}:
      ${s.exercises.filter(e => e.completed).map(e => `${e.name} (${e.actualWeight || e.weight}kg x ${e.actualReps || e.reps})`).join(', ')}
    `).join('\n');

    let currentWorkoutState = "";
    if (activeWorkout.length > 0) {
      currentWorkoutState = JSON.stringify(activeWorkout);
    }

    // --- NEW: FETCH STATS FOR AI ---
    let statsContext = "";
    if (profile) {
      try {
        const [wData, vData, consistency] = await Promise.all([
          StatisticsService.getWeightHistory(profile.id || ''),
          StatisticsService.getWorkoutVolumeHistory(profile.id || ''),
          StatisticsService.getConsistencyData(profile.id || '')
        ]);

        const currentWeight = wData.length > 0 ? wData[wData.length - 1].value : 0;
        const startWeight = wData.length > 0 ? wData[0].value : 0;
        const weeklyVolume = vData.length > 0 ? vData.reduce((acc, curr) => acc + curr.value, 0) : 0;
        const workoutsThisWeek = consistency.length > 0 ? consistency[3].value : 0;

        statsContext = `
        STATS:
        - Current Weight: ${currentWeight}kg (Start: ${startWeight}kg)
        - Workouts this week: ${workoutsThisWeek}
        - Recent Volumes: ${vData.slice(-3).map(v => v.value + 'kg').join(', ')}
        `;
      } catch (e) {
        console.log("Failed to fetch stats for AI context");
      }
    }

    // --- NEW: FETCH SCHEDULE FOR AI (CONTEXT INJECTION) ---
    let scheduleContext = "";
    try {
      const upcomingSchedule = await StorageService.getUpcomingSchedule();
      if (upcomingSchedule.length > 0) {
        scheduleContext = upcomingSchedule.map(s =>
          `[${s.date}] ${s.title}: ${s.exercises ? s.exercises.map((e: any) => e.name).join(', ') : 'No Details'}`
        ).join('\n');
      } else {
        scheduleContext = "Нет запланированных тренировок.";
      }
    } catch (e) {
      console.log("Failed to fetch schedule context");
    }

    // Call Gemini
    const response = await sendMessageToGemini(
      // Only send last 15 messages to context to save tokens and keep context fresh
      messages.slice(-15).map(m => ({ role: m.role, text: m.text, widget: m.widget })),
      textToSend,
      userContext,
      currentWorkoutState,
      recentHistory, // Pass history
      userMsg.image, // Pass image
      statsContext, // Pass stats
      scheduleContext // Pass schedule
    );

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      text: response.text,
      widget: response.widget,
      timestamp: new Date(),
      isError: response.isError
    };

    // 3. Update UI
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);

    // 4. Persist AI Message
    await StorageService.addChatMessage({
      role: 'ai',
      text: aiMsg.text,
      widget: aiMsg.widget
    });

    // 5. AUTO-SAVE Handlers
    if (aiMsg.widget) {
      if (aiMsg.widget.type === 'workout_plan') {
        console.log("Saving single workout...", aiMsg.widget.data);
        await StorageService.saveScheduledWorkout({
          title: aiMsg.widget.data.title,
          exercises: aiMsg.widget.data.exercises,
        });
      }

      if (aiMsg.widget.type === 'weekly_plan') {
        console.log("📅 Processing weekly plan...", aiMsg.widget.data);

        // Extract the plan array - AI might return {plan: [...]} or just [...]
        let planArray = aiMsg.widget.data;
        if (!Array.isArray(planArray) && planArray.plan) {
          planArray = planArray.plan;
        }
        if (!Array.isArray(planArray) && planArray.days) {
          planArray = planArray.days;
        }

        if (Array.isArray(planArray)) {
          await StorageService.saveWeeklyPlan(planArray);
          console.log(`✅ Saved ${planArray.length} workouts to weekly schedule`);
        } else {
          console.error("❌ Weekly plan data is not in expected format:", aiMsg.widget.data);
        }
      }

      // --- NEW: Handle Nutrition Plan ---
      if (aiMsg.widget.type === 'nutrition_plan') {
        console.log("Updating nutrition targets...", aiMsg.widget.data);
        const targets = aiMsg.widget.data;
        await updateProfile({
          target_calories: targets.calories,
          target_protein: targets.protein_grams,
          target_fat: targets.fat_grams,
          target_carbs: targets.carb_grams
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Daily Check In Modal */}
      <DailyCheckInModal
        isOpen={needsCheckIn}
        onConfirm={(data) => submitDailyCheckIn({
          sleep_hours: data.sleepHours,
          sleep_quality: data.sleepQuality,
          energy_level: data.energyLevel,
          weight: data.weight,
          stress_level: data.stressLevel
        })}
      />

      {/* Timer Overlay */}
      <AnimatePresence>
        <FloatingTimer
          timeLeft={timerSeconds}
          totalTime={totalTimerSeconds}
          isActive={timerSeconds > 0}
          onStop={handleStopTimer}
        />
      </AnimatePresence>

      {/* XP Modal */}
      <AnimatePresence>
        <XpModal
          isOpen={showXpModal}
          onClose={() => setShowXpModal(false)}
          xpGained={xpGained}
        />
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth pb-24">

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs py-2 px-4 rounded-full flex items-center gap-2 transition-all shadow-lg"
            >
              {isLoadingMore ? <Loader2 size={12} className="animate-spin" /> : <ArrowUp size={12} />}
              {isLoadingMore ? "ЗАГРУЗКА..." : "ЗАГРУЗИТЬ РАННИЕ СООБЩЕНИЯ"}
            </button>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex flex-col max-w-[95%] md:max-w-[85%] gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

              {/* Bubble */}
              <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-1 shadow-lg ${msg.role === 'ai' ? 'bg-zinc-900 border-neon-lime/50 text-neon-lime' : 'bg-zinc-800 border-neon-blue/50 text-neon-blue'}`}>
                  {msg.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
                </div>

                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-md overflow-hidden ${msg.role === 'ai'
                  ? 'bg-zinc-900/90 text-zinc-100 rounded-tl-none border border-zinc-800'
                  : 'bg-zinc-800 text-white rounded-tr-none border border-zinc-700'
                  } ${msg.isError ? 'border-red-500/50 text-red-200 bg-red-950/20' : ''}`}>

                  {/* Render Image if exists */}
                  {msg.image && (
                    <div className="mb-3 rounded-lg overflow-hidden border border-zinc-600/50 max-w-[200px]">
                      <img src={msg.image} alt="Attachment" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  <ReactMarkdown
                    className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-strong:text-neon-lime prose-ul:my-2 prose-li:my-0"
                  >
                    {msg.text || ''}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Widget Attachment */}
              {msg.widget && msg.widget.type === 'workout_plan' && (
                <div className="w-full pl-0 md:pl-11 pr-0 md:pr-2">
                  <WorkoutCard
                    key={`workout-${msg.id}`}
                    data={msg.widget.data}
                    onStartTimer={handleStartTimer}
                    onComplete={handleWorkoutComplete}
                  />
                </div>
              )}

              {msg.widget && msg.widget.type === 'weekly_plan' && (
                <div className="w-full pl-0 md:pl-11 pr-0 md:pr-2">
                  <div className="bg-zinc-900/80 border border-neon-lime/30 rounded-xl p-4">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Check size={16} className="text-neon-lime" /> План сохранен в Дневник</h3>
                    <p className="text-xs text-zinc-400">Расписание успешно добавлено.</p>
                  </div>
                </div>
              )}

              {msg.widget && msg.widget.type === 'nutrition_plan' && (
                <div className="w-full pl-0 md:pl-11 pr-0 md:pr-2">
                  <div className="bg-zinc-900/80 border border-orange-500/30 rounded-xl p-4">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                      <Flame size={16} className="text-orange-500" /> Цели обновлены
                    </h3>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Калории</p>
                        <p className="text-lg font-display text-white">{msg.widget.data.calories}</p>
                      </div>
                      <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Белки</p>
                        <p className="text-lg font-display text-neon-lime">{msg.widget.data.protein_grams}г</p>
                      </div>
                      <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Жиры</p>
                        <p className="text-lg font-display text-red-400">{msg.widget.data.fat_grams}г</p>
                      </div>
                      <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Углеводы</p>
                        <p className="text-lg font-display text-neon-blue">{msg.widget.data.carb_grams}г</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 italic">Данные сохранены в ваш профиль.</p>
                  </div>
                </div>
              )}

              <span className="text-[10px] text-zinc-600 px-12">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start w-full pl-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-900 border border-neon-lime/30 flex items-center justify-center">
                <Loader2 size={16} className="text-neon-lime animate-spin" />
              </div>
              <span className="text-xs text-neon-lime font-mono animate-pulse">АНАЛИЗ_ДАННЫХ...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 absolute bottom-0 w-full z-10">

        {/* Pending Image Preview */}
        {pendingImage && (
          <div className="absolute top-[-80px] left-4 bg-zinc-900 border border-zinc-700 p-2 rounded-xl flex items-start gap-2 shadow-xl">
            <img src={pendingImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg" />
            <button
              onClick={() => setPendingImage(null)}
              className="p-1 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
          {/* File Input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-zinc-800 text-zinc-400 hover:text-neon-blue rounded-xl hover:bg-zinc-700 transition-colors border border-transparent hover:border-neon-blue/50"
          >
            <Paperclip size={20} />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder="Сообщение..."
            className="w-full bg-black/50 border border-zinc-700 rounded-xl py-4 pl-5 pr-14 text-white focus:outline-none focus:border-neon-lime focus:ring-1 focus:ring-neon-lime transition-all placeholder:text-zinc-600 shadow-inner"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && !pendingImage) || isLoading}
            className="absolute right-2 p-2.5 bg-neon-lime text-black rounded-lg hover:bg-white hover:shadow-[0_0_15px_#ccff00] transition-all disabled:opacity-50 disabled:hover:bg-neon-lime disabled:hover:shadow-none"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
