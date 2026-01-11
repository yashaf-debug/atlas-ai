
import React, { useState, useRef } from 'react';
import { Camera, Plus, Loader2, Check, Flame, X, ScanLine, Edit3, Trophy, ChevronLeft, ChevronRight, Droplet, Trash2, Calendar, FileText, Scale, Minus, PlusCircle, FlaskConical, Zap, Clock, ChefHat, BookOpen } from 'lucide-react';
import { analyzeFoodImage, analyzeFoodText, FoodAnalysisResult } from '../services/gemini';
import { useNutrition, FoodLog } from '../context/NutritionContext';
import { useProfile } from '../context/ProfileContext';
import { MealType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const MEAL_SECTIONS: { id: MealType; label: string }[] = [
  { id: 'breakfast', label: 'Завтрак' },
  { id: 'lunch', label: 'Обед' },
  { id: 'dinner', label: 'Ужин' },
  { id: 'snack', label: 'Перекусы' },
];

const Nutrition: React.FC = () => {
  const { logs, waterIntake, selectedDate, changeDate, logFood, removeFoodLog, logWater, getDailyStats, supplements, generateSupplementsStack } = useNutrition();
  const { addXp, profile } = useProfile();
  const dailyStats = getDailyStats();
  const navigate = useNavigate();
  
  // Use Profile Targets (or default safe fallbacks)
  const TARGET_CALORIES = profile?.target_calories || 2500;
  const TARGET_PROTEIN = profile?.target_protein || 150;
  const TARGET_FAT = profile?.target_fat || 80;
  const TARGET_CARBS = profile?.target_carbs || 300;
  
  // State for Add Food Flow
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [targetMealType, setTargetMealType] = useState<MealType | null>(null);
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  
  // Review/Draft Modal State
  const [reviewData, setReviewData] = useState<FoodAnalysisResult | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  
  // Dynamic Weight State
  const [draftWeight, setDraftWeight] = useState(100);
  const [baseRatios, setBaseRatios] = useState<{cals: number, prot: number, fat: number, carbs: number} | null>(null);

  // Stack Generation State
  const [isGeneratingStack, setIsGeneratingStack] = useState(false);

  // XP Toast
  const [showXpToast, setShowXpToast] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Date Navigation ---
  const handleDateChange = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    changeDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const displayDate = new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });

  // --- Handlers ---

  const handleOpenAddMenu = (type: MealType) => {
    setTargetMealType(type);
    setShowAddMenu(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        setShowAddMenu(false); // Close menu
        startImageAnalysis(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const initializeDraft = (result: FoodAnalysisResult) => {
    setReviewData(result);
    const weight = result.estimated_weight_grams || 100;
    setDraftWeight(weight);
    
    // Calculate base ratios per 1g
    setBaseRatios({
        cals: result.calories / weight,
        prot: result.protein / weight,
        fat: result.fat / weight,
        carbs: result.carbs / weight
    });
    
    setIsReviewOpen(true);
  };

  const startImageAnalysis = async (base64: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeFoodImage(base64);
      initializeDraft(result);
    } catch (error) {
      alert("Ошибка Vision AI. Попробуйте более четкое фото.");
      setSelectedImage(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTextSubmit = async () => {
      setShowAddMenu(false);
      setIsAnalyzing(true);
      try {
        const result = await analyzeFoodText(textInput);
        initializeDraft(result);
        setTextInput('');
      } catch (error) {
        alert("Не удалось распознать текст.");
      } finally {
        setIsAnalyzing(false);
      }
  };

  const handleWeightChange = (newWeight: number) => {
    if (newWeight < 0) return;
    setDraftWeight(newWeight);
    if (reviewData && baseRatios) {
      setReviewData({
        ...reviewData,
        calories: Math.round(baseRatios.cals * newWeight),
        protein: Math.round(baseRatios.prot * newWeight),
        fat: Math.round(baseRatios.fat * newWeight),
        carbs: Math.round(baseRatios.carbs * newWeight),
        estimated_weight_grams: newWeight,
        advice: reviewData.advice,
        dish_name: reviewData.dish_name
      });
    }
  };

  const handleConfirmEat = () => {
    if (reviewData && targetMealType) {
      logFood({
        dish_name: reviewData.dish_name,
        calories: reviewData.calories,
        protein: reviewData.protein,
        fat: reviewData.fat,
        carbs: reviewData.carbs,
        image: selectedImage || undefined
      }, targetMealType);
      
      // Award XP
      addXp(15);
      setShowXpToast(true);
      setTimeout(() => setShowXpToast(false), 3000);

      // Reset
      setReviewData(null);
      setIsReviewOpen(false);
      setSelectedImage(null);
      setTargetMealType(null);
      setBaseRatios(null);
    }
  };

  const updateReviewField = (field: keyof FoodAnalysisResult, value: string | number) => {
    if (reviewData) {
      setReviewData({ ...reviewData, [field]: value } as FoodAnalysisResult);
    }
  };

  const handleGenerateStack = async () => {
      setIsGeneratingStack(true);
      await generateSupplementsStack();
      setIsGeneratingStack(false);
  };

  return (
    <div className="h-full overflow-y-auto pb-20 md:pb-0 relative bg-black">
      {/* XP Toast */}
      <AnimatePresence>
        {showXpToast && (
            <motion.div 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-900 border border-neon-lime px-4 py-2 rounded-full shadow-[0_0_15px_#ccff00] flex items-center gap-2"
            >
                <Trophy size={16} className="text-neon-lime" />
                <span className="text-white font-bold text-sm">+15 XP</span>
            </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER & DATE NAV */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-md z-20 pb-4 border-b border-zinc-800">
          <div className="flex items-center justify-between px-4 py-3">
             <button onClick={() => handleDateChange(-1)} className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg">
                <ChevronLeft size={20} />
             </button>
             <div className="flex flex-col items-center">
                 <h2 className="text-lg font-bold text-white capitalize flex items-center gap-2">
                    <Calendar size={16} className="text-neon-lime" />
                    {isToday ? 'Сегодня' : displayDate}
                 </h2>
                 {!isToday && <span className="text-xs text-zinc-500 font-mono uppercase tracking-tighter">АРХИВ_ИСТОРИИ</span>}
             </div>
             <button onClick={() => handleDateChange(1)} disabled={isToday} className={`p-2 rounded-lg ${isToday ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white bg-zinc-900'}`}>
                <ChevronRight size={20} />
             </button>
          </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Quick Actions Bar */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            <button 
                onClick={() => navigate('/chef')}
                className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-4 py-3 rounded-2xl text-white font-bold hover:border-neon-lime transition-all shrink-0 shadow-lg"
            >
                <ChefHat size={18} className="text-neon-lime" />
                <span>Neural Chef</span>
            </button>
            <button 
                onClick={() => {
                    navigate('/chef');
                    // We can't pass state directly to trigger a tab change easily without more complex state,
                    // but usually, users who click "My Recipes" expect to see the library.
                    // For now, let's just go to the Chef page.
                }}
                className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-4 py-3 rounded-2xl text-white font-bold hover:border-neon-blue transition-all shrink-0 shadow-lg"
            >
                <BookOpen size={18} className="text-neon-blue" />
                <span>Мои Рецепты</span>
            </button>
        </div>

        {/* 2. DASHBOARD */}
        <div className="grid grid-cols-1 gap-4">
             {/* Calories Summary */}
             <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
                 <div className="flex justify-between items-end mb-4 relative z-10">
                     <div>
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Энергия_Сводка</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-display font-bold text-white">{dailyStats.calories}</span>
                            <span className="text-zinc-600 text-sm font-mono">/ {TARGET_CALORIES} ККАЛ</span>
                        </div>
                     </div>
                     <Flame className="text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]" size={32} />
                 </div>
                 <div className="w-full h-3 bg-zinc-800/50 rounded-full overflow-hidden relative z-10 border border-zinc-700/30 shadow-inner">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((dailyStats.calories / TARGET_CALORIES) * 100, 100)}%` }}
                        className="h-full bg-gradient-to-r from-orange-600 to-red-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]" 
                    />
                 </div>
                 {/* Decorative */}
                 <div className="absolute top-[-40px] right-[-40px] w-48 h-48 bg-orange-500/5 rounded-full blur-[80px]" />
             </div>

             {/* Macros & Water Grid */}
             <div className="grid grid-cols-2 gap-4">
                 {/* Macros */}
                 <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-5 flex flex-col justify-center gap-4 shadow-xl">
                     {[
                         { label: 'БЕЛКИ', val: dailyStats.protein, max: TARGET_PROTEIN, col: 'bg-neon-lime', shadow: 'shadow-[0_0_8px_rgba(204,255,0,0.3)]' },
                         { label: 'ЖИРЫ', val: dailyStats.fat, max: TARGET_FAT, col: 'bg-red-500', shadow: 'shadow-[0_0_8px_rgba(239,68,68,0.3)]' },
                         { label: 'УГЛИ', val: dailyStats.carbs, max: TARGET_CARBS, col: 'bg-neon-blue', shadow: 'shadow-[0_0_8px_rgba(0,255,255,0.3)]' },
                     ].map(m => (
                         <div key={m.label}>
                             <div className="flex justify-between text-[9px] font-black text-zinc-500 mb-1.5 tracking-wider">
                                 <span>{m.label}</span>
                                 <span>{m.val}/{m.max}Г</span>
                             </div>
                             <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-zinc-800/50">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((m.val / m.max) * 100, 100)}%` }}
                                    className={`h-full ${m.col} ${m.shadow}`} 
                                 />
                             </div>
                         </div>
                     ))}
                 </div>

                 {/* Water Tracker */}
                 <div className="bg-blue-950/20 border border-blue-900/30 rounded-3xl p-5 flex flex-col items-center justify-between relative overflow-hidden shadow-xl">
                     <div className="absolute inset-0 bg-blue-500/5 z-0" />
                     <div className="z-10 text-center">
                         <Droplet className="text-blue-400 mx-auto mb-2 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" size={32} fill="currentColor" />
                         <span className="text-3xl font-display font-bold text-white block leading-none">{waterIntake}</span>
                         <span className="text-[10px] text-blue-400 font-mono uppercase tracking-widest mt-1 block">/ 2500 МЛ</span>
                     </div>
                     <button 
                        onClick={() => logWater(250)}
                        className="z-10 mt-3 w-full py-2.5 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-lg active:scale-95"
                     >
                        +250 МЛ
                     </button>
                 </div>
             </div>
        </div>

        {/* 3. SUPPLEMENTS STACK */}
        <div className="bg-purple-900/10 border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px] pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-5 relative z-10">
                 <h3 className="text-xs font-black text-purple-200 flex items-center gap-2 uppercase tracking-[0.2em]">
                    <FlaskConical size={16} className="text-purple-400" /> БИО_СТЕК
                 </h3>
                 {supplements.length === 0 && !isGeneratingStack && (
                     <button 
                        onClick={handleGenerateStack}
                        className="text-[10px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg hover:bg-purple-500 hover:text-white transition-all flex items-center gap-1 uppercase tracking-widest"
                     >
                        <Zap size={12} /> Анализ
                     </button>
                 )}
            </div>
            
            {isGeneratingStack ? (
                 <div className="flex flex-col items-center justify-center py-8 text-purple-400">
                    <Loader2 size={28} className="animate-spin mb-3" />
                    <span className="text-[10px] font-mono animate-pulse uppercase tracking-[0.3em]">АНАЛИЗ_МЕТАБОЛИЗМА...</span>
                 </div>
            ) : supplements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
                    {supplements.map((item, idx) => (
                        <div key={idx} className="bg-black/40 backdrop-blur-md border border-purple-500/10 rounded-2xl p-4 flex flex-col gap-2 hover:border-purple-500/30 transition-colors">
                             <div className="flex justify-between items-start">
                                 <h4 className="font-bold text-white text-sm tracking-tight">{item.name}</h4>
                                 <span className="text-[9px] font-black bg-purple-900/40 text-purple-200 px-2 py-1 rounded-lg border border-purple-500/20">{item.dosage}</span>
                             </div>
                             <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                                 <Clock size={12} className="text-purple-500/50" /> {item.timing}
                             </div>
                             <p className="text-[10px] text-zinc-500 leading-relaxed italic border-l-2 border-purple-500/20 pl-3 mt-1">
                                 "{item.reason}"
                             </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-zinc-600 text-[10px] font-mono uppercase tracking-widest border border-dashed border-zinc-800 rounded-2xl bg-black/20">
                    СТЕК_ПУСТ
                </div>
            )}
        </div>

        {/* 4. MEAL LOG SECTIONS */}
        <div className="space-y-8">
            {MEAL_SECTIONS.map((section) => {
                const sectionLogs = logs.filter(l => l.meal_type === section.id);
                const sectionCals = sectionLogs.reduce((acc, curr) => acc + curr.calories, 0);

                return (
                    <div key={section.id} className="space-y-4">
                        {/* Section Header */}
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-baseline gap-3">
                                <h3 className="text-xl font-display font-bold text-white tracking-tight">{section.label}</h3>
                                <span className="text-xs text-zinc-600 font-mono tracking-tighter uppercase">{sectionCals} ККАЛ</span>
                            </div>
                            <button 
                                onClick={() => handleOpenAddMenu(section.id)}
                                className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-neon-lime hover:bg-neon-lime hover:text-black hover:border-neon-lime transition-all shadow-xl active:scale-90"
                            >
                                <Plus size={22} />
                            </button>
                        </div>

                        {/* List Items */}
                        <div className="space-y-3">
                            {sectionLogs.length === 0 ? (
                                <div className="p-6 border border-dashed border-zinc-800 rounded-[2rem] text-center bg-zinc-900/5">
                                    <p className="text-[10px] text-zinc-700 font-mono uppercase tracking-widest">НЕТ_ДАННЫХ</p>
                                </div>
                            ) : (
                                sectionLogs.map(item => (
                                    <motion.div 
                                        key={item.id} 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-4 flex items-center justify-between group hover:border-zinc-700 transition-all shadow-lg"
                                    >
                                        <div className="flex items-center gap-4">
                                            {item.image ? (
                                                <div className="relative">
                                                    <img src={item.image} alt="Food" className="w-12 h-12 rounded-2xl object-cover border border-zinc-700" />
                                                    <div className="absolute inset-0 rounded-2xl border border-neon-lime/10 group-hover:border-neon-lime/30 transition-all" />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-600">
                                                    <Flame size={20} />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-base text-zinc-100 group-hover:text-neon-lime transition-colors">{item.dish_name}</p>
                                                <p className="text-[11px] text-zinc-600 font-mono uppercase tracking-tight">
                                                    {item.calories} ККАЛ • Б:{item.protein} Ж:{item.fat} У:{item.carbs}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => removeFoodLog(item.id)}
                                            className="p-2.5 text-zinc-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 bg-black/40 rounded-xl hover:bg-red-950/20"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* 5. MODALS & MENUS */}

      {/* Add Menu (Scan vs Text) */}
      <AnimatePresence>
        {showAddMenu && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setShowAddMenu(false)}>
                <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-2xl font-display font-bold text-white tracking-tight">Добавить_Лог</h3>
                            <p className="text-xs text-zinc-500 uppercase font-mono">{MEAL_SECTIONS.find(s => s.id === targetMealType)?.label}</p>
                        </div>
                        <button onClick={() => setShowAddMenu(false)} className="p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded-xl"><X size={20}/></button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div onClick={() => fileInputRef.current?.click()} className="bg-black/40 hover:bg-zinc-800/60 border border-zinc-800 hover:border-neon-lime rounded-3xl p-6 flex flex-col items-center gap-4 cursor-pointer transition-all group shadow-inner">
                             <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(204,255,0,0.3)] border border-zinc-800 transition-all">
                                 <ScanLine size={28} className="text-neon-lime" />
                             </div>
                             <span className="text-xs font-black text-white uppercase tracking-widest">Визуальный Анализ</span>
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                        </div>
                        
                        <div className="bg-black/40 hover:bg-zinc-800/60 border border-zinc-800 hover:border-neon-blue rounded-3xl p-6 flex flex-col items-center gap-4 cursor-pointer transition-all group shadow-inner">
                             <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] border border-zinc-800 transition-all">
                                 <FileText size={28} className="text-neon-blue" />
                             </div>
                             <span className="text-xs font-black text-white uppercase tracking-widest">Текст</span>
                        </div>
                    </div>

                    {/* Inline Text Input Area */}
                    <div className="relative">
                        <input 
                            type="text"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Напр: '2 яйца и протеин'..."
                            className="w-full bg-black/60 border border-zinc-700 rounded-2xl py-4 pl-5 pr-14 text-white focus:border-neon-blue focus:outline-none transition-all placeholder:text-zinc-700 shadow-inner"
                            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                        />
                         <button 
                             onClick={handleTextSubmit}
                             disabled={!textInput.trim()}
                             className="absolute right-2.5 top-2.5 p-2 bg-zinc-800 rounded-xl text-neon-blue hover:bg-neon-blue hover:text-black disabled:opacity-50 transition-all shadow-lg"
                         >
                             <Check size={20} />
                         </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Analyzing Loader Overlay */}
      {isAnalyzing && (
          <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center">
              <div className="relative">
                  <Loader2 size={64} className="text-neon-lime animate-spin mb-6" />
                  <div className="absolute inset-0 blur-2xl bg-neon-lime/20 rounded-full animate-pulse" />
              </div>
              <p className="text-neon-lime font-mono text-sm tracking-[0.5em] animate-pulse uppercase">АНАЛИЗ_ПИТАНИЯ...</p>
          </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {isReviewOpen && reviewData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
             >
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/95 sticky top-0 z-10">
                   <div>
                        <h2 className="text-xl font-display font-bold text-white flex items-center gap-2 tracking-tight">
                            <Edit3 size={18} className="text-neon-blue" /> ЧЕРНОВИК_ДАННЫХ
                        </h2>
                        <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">ПРОВЕРКА_ПЕРЕД_ЗАПИСЬЮ</p>
                   </div>
                   <button onClick={() => setIsReviewOpen(false)} className="p-3 text-zinc-500 hover:text-white bg-zinc-800 rounded-2xl transition-all shadow-lg"><X size={18}/></button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-8">
                   {selectedImage && (
                     <div className="h-48 w-full rounded-3xl overflow-hidden border border-zinc-800 relative shadow-2xl">
                        <img src={selectedImage} className="w-full h-full object-cover" alt="Scan" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end p-5">
                           <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-neon-blue/20">
                               <ScanLine size={12} className="text-neon-blue" />
                               <span className="text-[10px] font-black font-mono text-neon-blue uppercase tracking-widest">СКАН_ЗАВЕРШЕН</span>
                           </div>
                        </div>
                     </div>
                   )}
                   
                   <div className="space-y-6">
                      {/* Name Input */}
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-2 px-1">Название блюда</label>
                        <input 
                          type="text" 
                          value={reviewData.dish_name}
                          onChange={(e) => updateReviewField('dish_name', e.target.value)}
                          className="w-full bg-black/60 border border-zinc-700 rounded-2xl p-4 text-white font-bold focus:border-neon-lime outline-none shadow-inner transition-all"
                        />
                      </div>

                      {/* Weight Control & Total Cals */}
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-zinc-800/40 p-4 rounded-3xl border border-zinc-800 shadow-inner">
                              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-3 px-1 flex items-center gap-1.5">
                                  <Scale size={12} className="text-neon-blue"/> Вес (г)
                              </label>
                              <div className="flex items-center gap-3">
                                  <input 
                                      type="number"
                                      value={draftWeight}
                                      onChange={(e) => handleWeightChange(Number(e.target.value))}
                                      className="w-full bg-black/60 border border-zinc-700 rounded-xl p-3 text-white font-mono font-bold focus:border-neon-lime outline-none text-center shadow-inner"
                                  />
                              </div>
                              <div className="flex gap-2 mt-3">
                                  <button onClick={() => handleWeightChange(draftWeight - 10)} className="flex-1 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-400 text-[10px] font-black uppercase tracking-tighter">-10</button>
                                  <button onClick={() => handleWeightChange(draftWeight + 10)} className="flex-1 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-400 text-[10px] font-black uppercase tracking-tighter">+10</button>
                              </div>
                          </div>

                          <div className="bg-black/60 p-4 rounded-3xl border border-zinc-800 flex flex-col justify-center items-center shadow-inner">
                             <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-2 flex items-center gap-1.5"><Flame size={12} className="text-orange-500"/> Калории</label>
                             <div className="flex items-baseline gap-1">
                                 <span className="text-4xl font-display font-bold text-white leading-none">{reviewData.calories}</span>
                                 <span className="text-[10px] text-zinc-600 font-mono uppercase">ККАЛ</span>
                             </div>
                          </div>
                      </div>

                      {/* Macros Display */}
                      <div className="bg-zinc-800/20 rounded-[2rem] p-5 border border-zinc-800 shadow-inner">
                         <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-4 px-1 text-center">Распределение_Макросов</label>
                         <div className="grid grid-cols-3 gap-4">
                            {[
                                { l: 'Белки', v: reviewData.protein, c: 'text-neon-lime', bc: 'border-neon-lime/20' },
                                { l: 'Жиры', v: reviewData.fat, c: 'text-red-500', bc: 'border-red-500/20' },
                                { l: 'Угли', v: reviewData.carbs, c: 'text-neon-blue', bc: 'border-neon-blue/20' }
                            ].map(m => (
                                <div key={m.l} className={`bg-black/40 border ${m.bc} rounded-2xl p-3 text-center shadow-md`}>
                                    <label className={`text-[9px] ${m.c} block mb-1 uppercase font-black tracking-widest`}>{m.l}</label>
                                    <span className="text-xl font-bold text-white font-mono">{m.v}г</span>
                                </div>
                            ))}
                         </div>
                      </div>
                      
                      {/* AI Advice */}
                      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex gap-3 relative overflow-hidden">
                            <div className="shrink-0 w-8 h-8 rounded-lg bg-neon-lime/10 flex items-center justify-center text-neon-lime border border-neon-lime/20">
                                <Zap size={16} />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">ВЕРДИКТ_ATLAS</p>
                                <p className="text-xs text-zinc-300 italic leading-relaxed">"{reviewData.advice}"</p>
                            </div>
                            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-neon-lime/5 rounded-full blur-xl" />
                      </div>
                   </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-black/40 border-t border-zinc-800 grid grid-cols-1 gap-4">
                   <button 
                     onClick={handleConfirmEat}
                     className="w-full bg-neon-lime text-black font-black py-4 rounded-2xl hover:bg-white hover:shadow-[0_0_30px_#ccff00] transition-all flex items-center justify-center gap-3 uppercase tracking-widest shadow-2xl"
                   >
                     <Check size={22} /> ПОДТВЕРДИТЬ ЛОГ
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Nutrition;
