
import React, { useState, useEffect } from 'react';
import { ChefHat, Sparkles, Clock, Flame, Trash2, Check, Loader2, Save, ChevronRight, BookOpen, Utensils, Timer, Activity, Heart, ShoppingBag, PlusCircle, Scale, Brain, ArrowLeft, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateRecipe } from '../services/gemini';
import { StorageService } from '../services/storage';
import { useProfile } from '../context/ProfileContext';
import { useNutrition } from '../context/NutritionContext';
import { Recipe, MealType, PortionSize } from '../types';

const AiChef: React.FC = () => {
  const { profile, addXp } = useProfile();
  const nutrition = useNutrition();
  const dailyStats = nutrition.getDailyStats();
  
  // Generator State
  const [ingredients, setIngredients] = useState('');
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [prepTime, setPrepTime] = useState(30);
  const [portionSize, setPortionSize] = useState<PortionSize>('standard');
  const [fitToMacros, setFitToMacros] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'generate' | 'library'>('generate');

  // Interactive Checklist
  const [checkedIngredients, setCheckedIngredients] = useState<number[]>([]);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);

  // Notifications
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    loadSavedRecipes();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSavedRecipes = async () => {
    setIsLoading(true);
    try {
      const data = await StorageService.getSavedRecipes();
      setSavedRecipes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!ingredients.trim()) return;
    setIsGenerating(true);
    setGeneratedRecipe(null);
    setCheckedIngredients([]);
    setCheckedSteps([]);
    
    try {
      let remainingMacros = undefined;
      if (fitToMacros && profile) {
          remainingMacros = {
              calories: Math.max(0, (profile.target_calories || 2000) - dailyStats.calories),
              protein: Math.max(0, (profile.target_protein || 150) - dailyStats.protein),
              fat: Math.max(0, (profile.target_fat || 70) - dailyStats.fat),
              carbs: Math.max(0, (profile.target_carbs || 250) - dailyStats.carbs),
          };
      }

      const recipe = await generateRecipe(ingredients, mealType, prepTime, portionSize, remainingMacros);
      setGeneratedRecipe(recipe);
    } catch (e) {
      showToast("Ошибка Нейросвязи. Попробуйте еще раз.", 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (recipe: Recipe) => {
    try {
      const saved = await StorageService.saveRecipe(recipe);
      setSavedRecipes(prev => [saved, ...prev]);
      addXp(25);
      showToast("Рецепт сохранен в базу!");
    } catch (e) {
      showToast("Ошибка при сохранении.", 'error');
    }
  };

  const handleLogToDiary = async (recipe: Recipe) => {
    try {
        await nutrition.logFood({
            dish_name: `Neural: ${recipe.name}`,
            calories: recipe.macros.calories,
            protein: recipe.macros.protein,
            fat: recipe.macros.fat,
            carbs: recipe.macros.carbs
        }, mealType);
        addXp(15);
        showToast("Рецепт добавлен в дневник!");
    } catch (e) {
        showToast("Ошибка логирования.", 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Удалить этот рецепт из памяти?")) return;
    await StorageService.deleteRecipe(id);
    setSavedRecipes(prev => prev.filter(r => r.id !== id));
    showToast("Удалено.");
  };

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const toggleStep = (idx: number) => {
    setCheckedSteps(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const openInGenerator = (recipe: Recipe) => {
    setGeneratedRecipe(recipe);
    setActiveTab('generate');
    setCheckedIngredients([]);
    setCheckedSteps([]);
  };

  return (
    <div className="h-full overflow-y-auto pb-24 md:pb-8 bg-black">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-zinc-900 border-neon-lime text-neon-lime' : 'bg-red-950 border-red-500 text-red-500'
            }`}
          >
            {toast.type === 'success' ? <Check size={18} /> : <Activity size={18} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 md:p-8">
        
        {/* Title Section */}
        <div className="flex items-center gap-5 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-neon-lime flex items-center justify-center text-black shadow-[0_0_20px_rgba(204,255,0,0.5)] rotate-3">
            <ChefHat size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-display font-bold text-white tracking-tighter">NEURAL <span className="text-neon-lime">CHEF</span></h1>
            <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.2em] animate-pulse">КУЛИНАРНЫЙ_МОДУЛЬ_АКТИВЕН</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl mb-8 border border-zinc-800 max-w-md mx-auto backdrop-blur-md">
          <button 
            onClick={() => setActiveTab('generate')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
              ${activeTab === 'generate' ? 'bg-zinc-800 text-neon-lime shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Sparkles size={16} /> Синтез
          </button>
          <button 
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
              ${activeTab === 'library' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <BookOpen size={16} /> Библиотека ({savedRecipes.length})
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'generate' ? (
            <motion.div 
              key="generate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              {/* Main Generator Glass Form */}
              <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-lime/5 rounded-full blur-3xl" />
                
                <div className="space-y-8 relative z-10">
                  {/* Inputs Row */}
                  <div>
                    <label className="text-xs text-zinc-500 uppercase font-black tracking-widest block mb-4 flex items-center gap-2">
                        <ShoppingBag size={14} className="text-neon-lime" /> Что в твоем холодильнике?
                    </label>
                    <textarea
                      value={ingredients}
                      onChange={(e) => setIngredients(e.target.value)}
                      placeholder="Куриное филе, шпинат, кускус, томаты..."
                      className="w-full bg-black/50 border border-zinc-700 rounded-2xl p-5 text-white focus:border-neon-lime focus:outline-none h-36 transition-all shadow-inner placeholder:text-zinc-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Meal Type Select */}
                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-black tracking-widest block mb-4 flex items-center gap-2">
                           <Utensils size={14} className="text-neon-blue" /> Тип синтеза
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'breakfast', label: 'Завтрак' },
                                { id: 'lunch', label: 'Обед' },
                                { id: 'dinner', label: 'Ужин' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setMealType(type.id as MealType)}
                                    className={`px-5 py-2.5 rounded-full text-xs font-bold border transition-all ${
                                        mealType === type.id 
                                        ? 'bg-neon-blue/10 border-neon-blue text-neon-blue shadow-[0_0_15px_rgba(0,255,255,0.3)]' 
                                        : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-600'
                                    }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time Range */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-xs text-zinc-500 uppercase font-black tracking-widest flex items-center gap-2">
                                <Timer size={14} className="text-purple-500" /> Лимит времени
                            </label>
                            <span className="text-xs font-mono text-white bg-zinc-800 px-2 py-1 rounded">{prepTime} мин</span>
                        </div>
                        <input 
                            type="range" min="10" max="60" step="5"
                            value={prepTime}
                            onChange={(e) => setPrepTime(Number(e.target.value))}
                            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-neon-lime"
                        />
                        <div className="flex justify-between mt-2 text-[10px] text-zinc-700 font-mono">
                            <span>10М</span>
                            <span>60М</span>
                        </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Portion Size Select */}
                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-black tracking-widest block mb-4 flex items-center gap-2">
                           <Maximize2 size={14} className="text-purple-400" /> Размер порции
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'snack', label: 'Легкий перекус' },
                                { id: 'standard', label: 'Стандарт' },
                                { id: 'hearty', label: 'Сытный обед' },
                                { id: 'bulking', label: 'Набор массы' }
                            ].map(size => (
                                <button
                                    key={size.id}
                                    onClick={() => setPortionSize(size.id as PortionSize)}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                        portionSize === size.id 
                                        ? 'bg-purple-900/20 border-purple-500 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' 
                                        : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-600'
                                    }`}
                                >
                                    {size.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Fit to Macros Toggle */}
                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-black tracking-widest block mb-4 opacity-0">Hidden</label>
                        <div className="flex items-center justify-between p-5 bg-black/40 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-colors h-[54px] md:h-[64px]">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl transition-colors ${fitToMacros ? 'bg-neon-lime/10 text-neon-lime shadow-[0_0_10px_rgba(204,255,0,0.2)]' : 'bg-zinc-800 text-zinc-600'}`}>
                                    <Brain size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white uppercase tracking-tight">Учесть остаток КБЖУ</p>
                                    <p className="text-[10px] text-zinc-500 font-mono">АВТО_РАСЧЕТ_ОСТАТКА</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setFitToMacros(!fitToMacros)}
                                className={`w-14 h-7 rounded-full relative transition-colors ${fitToMacros ? 'bg-neon-lime' : 'bg-zinc-700'} shrink-0`}
                            >
                                <motion.div 
                                    animate={{ x: fitToMacros ? 28 : 4 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg" 
                                />
                            </button>
                        </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !ingredients.trim()}
                    className="w-full bg-neon-lime text-black font-black py-5 rounded-2xl hover:bg-white hover:shadow-[0_0_40px_rgba(204,255,0,0.6)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group text-sm uppercase tracking-widest"
                  >
                    {isGenerating ? (
                        <>
                            <Loader2 size={24} className="animate-spin" />
                            ОБРАБОТКА_ДАННЫХ...
                        </>
                    ) : (
                        <>
                            <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
                            СИНТЕЗИРОВАТЬ РЕЦЕПТ
                        </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generated Recipe Card */}
              <AnimatePresence>
                {generatedRecipe && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-zinc-900 border border-neon-lime/30 rounded-[2.5rem] overflow-hidden shadow-2xl"
                    >
                        {/* Recipe Header */}
                        <div className="bg-gradient-to-br from-neon-lime/10 via-black to-black p-8 border-b border-zinc-800">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] bg-neon-lime text-black px-2 py-0.5 rounded font-black uppercase">Результат</span>
                                        <h2 className="text-3xl font-display font-bold text-white tracking-tight">{generatedRecipe.name}</h2>
                                    </div>
                                    <p className="text-zinc-400 text-sm max-w-xl leading-relaxed italic">"{generatedRecipe.description}"</p>
                                    <div className="flex items-center gap-4 pt-2">
                                        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700">
                                            <Clock size={14} className="text-neon-lime" /> {generatedRecipe.prep_time} мин
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700">
                                            <Flame size={14} className="text-orange-500" /> {generatedRecipe.macros.calories} ккал
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleSave(generatedRecipe)} 
                                        className="p-4 bg-zinc-800 text-white rounded-2xl hover:bg-white hover:text-black transition-all border border-zinc-700 group shadow-lg"
                                        title="Сохранить в избранное"
                                    >
                                        <Heart size={20} className="group-hover:fill-current" />
                                    </button>
                                    <button 
                                        onClick={() => handleLogToDiary(generatedRecipe)} 
                                        className="p-4 bg-neon-lime text-black rounded-2xl hover:shadow-[0_0_20px_#ccff00] transition-all shadow-lg"
                                        title="Добавить в дневник"
                                    >
                                        <PlusCircle size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Macro Badges Grid */}
                            <div className="grid grid-cols-4 gap-4 mt-10">
                                {[
                                    { l: 'БЕЛКИ', v: generatedRecipe.macros.protein, c: 'text-neon-lime', border: 'border-neon-lime/20' },
                                    { l: 'ЖИРЫ', v: generatedRecipe.macros.fat, c: 'text-orange-400', border: 'border-orange-500/20' },
                                    { l: 'УГЛИ', v: generatedRecipe.macros.carbs, c: 'text-neon-blue', border: 'border-neon-blue/20' },
                                    { l: 'ККАЛ', v: generatedRecipe.macros.calories, c: 'text-white', border: 'border-white/10' }
                                ].map(m => (
                                    <div key={m.l} className={`bg-black/50 border ${m.border} p-4 rounded-3xl text-center shadow-inner`}>
                                        <p className="text-[10px] text-zinc-500 font-black mb-1">{m.l}</p>
                                        <p className={`text-xl font-display font-bold ${m.c}`}>{m.v}{m.l !== 'ККАЛ' ? 'г' : ''}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Ingredients Column */}
                            <div>
                                <h3 className="text-xs font-black text-neon-lime uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                    <ShoppingBag size={18} /> Ингредиенты
                                </h3>
                                <div className="space-y-3">
                                    {generatedRecipe.ingredients.map((ing, i) => (
                                        <motion.div 
                                            key={i} 
                                            initial={{ x: -10, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${
                                                checkedIngredients.includes(i) ? 'bg-zinc-800/30 border-neon-lime/10 opacity-40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                                            }`}
                                            onClick={() => toggleIngredient(i)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                    checkedIngredients.includes(i) ? 'bg-neon-lime border-neon-lime text-black' : 'border-zinc-700 group-hover:border-neon-lime'
                                                }`}>
                                                    {checkedIngredients.includes(i) && <Check size={14} strokeWidth={4} />}
                                                </div>
                                                <span className={`text-sm ${checkedIngredients.includes(i) ? 'text-zinc-500 line-through' : 'text-zinc-200 font-medium'}`}>{ing.name}</span>
                                            </div>
                                            <span className="text-xs font-mono text-zinc-500 bg-black px-2 py-1 rounded">{ing.amount} {ing.unit}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Steps Column */}
                            <div>
                                <h3 className="text-xs font-black text-neon-blue uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                    <Activity size={18} /> Инструкция
                                </h3>
                                <div className="space-y-8">
                                    {generatedRecipe.steps.map((step, i) => (
                                        <div 
                                            key={i} 
                                            className={`flex gap-5 group cursor-pointer transition-all ${checkedSteps.includes(i) ? 'opacity-40' : ''}`}
                                            onClick={() => toggleStep(i)}
                                        >
                                            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                                                checkedSteps.includes(i) ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-zinc-950 border-zinc-800 text-neon-blue group-hover:border-neon-blue shadow-lg'
                                            }`}>
                                                {checkedSteps.includes(i) ? <Check size={14}/> : i+1}
                                            </div>
                                            <p className={`text-sm leading-relaxed pt-2.5 transition-colors ${checkedSteps.includes(i) ? 'text-zinc-600 line-through' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Action Bar Footer */}
                        <div className="p-8 bg-black/50 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                onClick={() => handleLogToDiary(generatedRecipe)}
                                className="flex items-center justify-center gap-3 bg-zinc-800 text-white font-bold py-4 rounded-2xl hover:bg-zinc-700 transition-all border border-zinc-700"
                            >
                                <Utensils size={20} /> ДОБАВИТЬ В ДНЕВНИК ПИТАНИЯ
                            </button>
                            <button 
                                onClick={() => handleSave(generatedRecipe)}
                                className="flex items-center justify-center gap-3 bg-neon-lime text-black font-bold py-4 rounded-2xl hover:bg-white transition-all shadow-xl"
                            >
                                <Save size={20} /> СОХРАНИТЬ В ИЗБРАННОЕ
                            </button>
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div 
              key="library"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {isLoading ? (
                <div className="col-span-full py-20 text-center">
                    <Loader2 size={40} className="animate-spin text-neon-lime mx-auto mb-4" />
                    <p className="text-zinc-500 font-mono text-xs uppercase animate-pulse">ЗАГРУЗКА_АРХИВА...</p>
                </div>
              ) : savedRecipes.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-[3rem] bg-zinc-900/10">
                  <ChefHat size={64} className="mx-auto text-zinc-800 mb-6" />
                  <h3 className="text-xl font-bold text-zinc-400">Пустая база данных</h3>
                  <p className="text-zinc-600 mt-2 text-sm">Сгенерируй свои первые рецепты в нейро-синтезаторе.</p>
                </div>
              ) : (
                savedRecipes.map(recipe => (
                  <div 
                    key={recipe.id} 
                    onClick={() => openInGenerator(recipe)}
                    className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-[2rem] p-6 hover:border-neon-lime/30 transition-all group relative overflow-hidden flex flex-col justify-between h-full cursor-pointer"
                  >
                    <div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                        <h3 className="font-bold text-xl text-white group-hover:text-neon-lime transition-colors leading-tight pr-6">{recipe.name}</h3>
                        <button 
                            onClick={(e) => { e.stopPropagation(); recipe.id && handleDelete(recipe.id); }} 
                            className="text-zinc-600 hover:text-red-500 p-2 bg-black/40 rounded-xl hover:bg-red-950/20 transition-all absolute top-0 right-0"
                        >
                            <Trash2 size={16}/>
                        </button>
                        </div>

                        <div className="flex gap-4 mb-6 relative z-10">
                            {[
                                { l: 'Б', v: recipe.macros.protein, c: 'text-neon-lime' },
                                { l: 'Ж', v: recipe.macros.fat, c: 'text-orange-400' },
                                { l: 'У', v: recipe.macros.carbs, c: 'text-neon-blue' }
                            ].map(m => (
                                <div key={m.l} className="flex flex-col">
                                <span className="text-[10px] text-zinc-600 font-black mb-0.5">{m.l}</span>
                                <span className={`text-sm font-mono font-bold ${m.c}`}>{m.v}г</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-600 border-t border-zinc-800/50 pt-5 relative z-10">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Clock size={12}/> {recipe.prep_time}м</span>
                        <span className="flex items-center gap-1"><Flame size={12}/> {recipe.macros.calories} ккал</span>
                      </div>
                      <button className="text-neon-lime font-black uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        ОТКРЫТЬ <ChevronRight size={14}/>
                      </button>
                    </div>
                    {/* Background glow for library cards */}
                    <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-neon-lime/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AiChef;
