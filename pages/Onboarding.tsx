
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { StorageService } from '../services/storage';
import { NutritionCalculator } from '../services/calculations';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '../types';

type Message = { id: string; role: 'ai' | 'user'; text: string; };
type Step = 'NAME' | 'AGE' | 'GENDER' | 'WEIGHT' | 'HEIGHT' | 'GOAL' | 'INJURIES' | 'EQUIPMENT' | 'EXPERIENCE' | 'FREQUENCY' | 'FINISHING';

const Onboarding: React.FC = () => {
  const { createProfile } = useProfile();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentStep, setCurrentStep] = useState<Step>('NAME');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [profileData, setProfileData] = useState<UserProfile>({ 
    name: '', 
    age: 0, 
    gender: 'male',
    weight: 0, 
    height: 0, 
    fitness_goal: '', 
    injuries: '', 
    equipment: '', 
    workout_frequency: 3, 
    experience_level: 'Новичок' 
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  useEffect(() => {
    addAiMessage("Системы активированы. Я Atlas, твой Нейро-Тренер. \n\nЧтобы составить программу, мне нужно откалибровать твой профиль. \n\nКак к тебе обращаться (Имя)?");
  }, []);

  const addAiMessage = (text: string) => {
    setIsAiTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text }]);
      setIsAiTyping(false);
    }, 600);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text }]);
  };

  const processInput = async (input: string) => {
    const text = input.trim();
    if (!text) return;

    addUserMessage(text);
    setInputValue('');

    switch (currentStep) {
      case 'NAME': 
        setProfileData(p => ({ ...p, name: text })); 
        setCurrentStep('AGE'); 
        addAiMessage(`Принято, ${text}. \n\nСколько тебе полных лет?`); 
        break;
      
      case 'AGE': 
        setProfileData(p => ({ ...p, age: parseInt(text) || 25 })); 
        setCurrentStep('GENDER'); 
        addAiMessage("Твой биологический пол? \n(Нужен для расчета метаболизма)"); 
        break;

      case 'GENDER':
        const gender = text.toLowerCase().includes('жен') || text.toLowerCase() === 'female' ? 'female' : 'male';
        setProfileData(p => ({ ...p, gender }));
        setCurrentStep('WEIGHT');
        addAiMessage("Принято. Твой текущий вес (кг)?");
        break;

      case 'WEIGHT': 
        setProfileData(p => ({ ...p, weight: parseFloat(text) || 70 })); 
        setCurrentStep('HEIGHT'); 
        addAiMessage("Понял. Какой у тебя рост (см)?"); 
        break;
      
      case 'HEIGHT': 
        setProfileData(p => ({ ...p, height: parseFloat(text) || 175 })); 
        setCurrentStep('GOAL'); 
        addAiMessage("Данные сохранены. Выбери главную директиву.\n\nНапиши: 'Похудение', 'Мышцы' или 'Сила'."); 
        break;
      
      case 'GOAL': 
        setProfileData(p => ({ ...p, fitness_goal: text })); 
        setCurrentStep('INJURIES'); 
        addAiMessage("Цель установлена. Есть ли травмы? \n\nНапиши 'Нет', если здоров."); 
        break;
      
      case 'INJURIES': 
        setProfileData(p => ({ ...p, injuries: text })); 
        setCurrentStep('EQUIPMENT'); 
        addAiMessage("Где планируешь заниматься? \n\n(напр. Зал, Дом, Свой вес)"); 
        break;
      
      case 'EQUIPMENT': 
        setProfileData(p => ({ ...p, equipment: text })); 
        setCurrentStep('EXPERIENCE'); 
        addAiMessage("Какой у тебя опыт тренировок? \n\nВыбери: Новичок, Любитель, Опытный или Атлет."); 
        break;
      
      case 'EXPERIENCE': 
        setProfileData(p => ({ ...p, experience_level: text })); 
        setCurrentStep('FREQUENCY'); 
        addAiMessage("Предварительная оценка: сколько раз в неделю планируешь заниматься?"); 
        break;
      
      case 'FREQUENCY':
        let finalProfile: UserProfile = { ...profileData, workout_frequency: parseInt(text) || 3 };
        
        // --- CALCULATE NUTRITION ---
        const calculatedTargets = NutritionCalculator.calculateTargets(finalProfile);
        finalProfile = { ...finalProfile, ...calculatedTargets };
        
        setProfileData(finalProfile);
        setCurrentStep('FINISHING');
        addAiMessage(`Расчет метаболизма завершен.\nЦель: ${finalProfile.target_calories} ккал/день.\n\nСохранение профиля...`);
        
        (async () => {
          try {
            // 1. Save Profile to Supabase (with calculated nutrition)
            console.log("Saving profile...", finalProfile);
            await createProfile(finalProfile);
            
            // 2. Create the "Manifesto" Welcome Message
            // This replaces the instant plan generation.
            // It sets the stage for the user to input their schedule in the main chat.
            
            const manifestoText = `
Привет, ${finalProfile.name}! Я изучил твой профиль.

🎯 **Твоя цель:** ${finalProfile.fitness_goal}.
⚙️ **Параметры:** ${finalProfile.weight}кг / ${finalProfile.height}см.
🧪 **Метаболизм:** ${finalProfile.target_calories} ккал (Белки: ${finalProfile.target_protein}г, Жиры: ${finalProfile.target_fat}г, Углеводы: ${finalProfile.target_carbs}г).

Мой вердикт: Задача выполнима. Нам нужно строго придерживаться КБЖУ и соблюдать прогрессию нагрузок.

⚠️ **ПОСЛЕДНИЙ ШАГ ПЕРЕД ЗАПУСКОМ ПРОТОКОЛА:**
Я должен составить расписание тренировок.

Напиши мне, **в какие именно дни недели** тебе удобно заниматься?
*(Например: "Понедельник, Среда, Пятница" или "Вт Чт Сб")*
            `.trim();

            const welcomeMsg = {
                role: 'ai' as const,
                text: manifestoText
            };
            
            // Save directly to Chat History
            await StorageService.addChatMessage(welcomeMsg);

            // 3. Redirect to Home (Chat)
            setTimeout(() => {
                navigate('/');
            }, 2000);
            
          } catch(e) {
             console.error("Onboarding Error:", e);
             alert("Ошибка при сохранении данных.");
             navigate('/');
          }
        })();
        break;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-4 md:p-8 overflow-x-hidden relative">
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-neon-blue/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-neon-lime/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative z-10">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
             <div className="w-8 h-8 rounded bg-neon-lime flex items-center justify-center shadow-[0_0_10px_#ccff00]"><Bot className="text-black" size={20} /></div>
             <div><h1 className="font-display font-bold text-white tracking-wide">ATLAS <span className="text-neon-lime">SETUP</span></h1></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'ai' ? 'bg-zinc-900 border-neon-lime/50 text-neon-lime' : 'bg-zinc-800 border-neon-blue/50 text-neon-blue'}`}>{msg.role === 'ai' ? <Bot size={16} /> : <User size={16} />}</div>
                  <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'ai' ? 'bg-zinc-800/80 text-zinc-100 rounded-tl-none border border-zinc-700' : 'bg-neon-blue/10 text-neon-blue rounded-tr-none border border-neon-blue/20'}`}>{msg.text}</div>
                </div>
              </motion.div>
            ))}
            {isAiTyping && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start w-full"><Loader2 size={16} className="text-neon-lime animate-spin" /></motion.div>}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 backdrop-blur-lg">
          <div className="relative flex items-center gap-2">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isAiTyping && processInput(inputValue)}
              disabled={isAiTyping || currentStep === 'FINISHING'}
              autoFocus
              placeholder="Ваш ответ..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-zinc-200 focus:outline-none focus:border-neon-lime focus:ring-1 focus:ring-neon-lime transition-all text-sm"
            />
            <button onClick={() => processInput(inputValue)} disabled={!inputValue.trim()} className="absolute right-2 p-2 bg-neon-lime text-black rounded-lg"><Send size={18} /></button>
          </div>
          
          {/* Contextual Suggestion Buttons */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
             {currentStep === 'GENDER' && ['Мужской', 'Женский'].map(opt => (
                  <button key={opt} onClick={() => processInput(opt)} className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300 hover:text-neon-lime hover:border-neon-lime transition-colors whitespace-nowrap">{opt}</button>
             ))}
             {currentStep === 'GOAL' && ['Похудение', 'Мышцы', 'Сила'].map(opt => (
                  <button key={opt} onClick={() => processInput(opt)} className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300 hover:text-neon-lime hover:border-neon-lime transition-colors whitespace-nowrap">{opt}</button>
             ))}
             {currentStep === 'EQUIPMENT' && ['Зал', 'Дом', 'Свой вес'].map(opt => (
                  <button key={opt} onClick={() => processInput(opt)} className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300 hover:text-neon-lime hover:border-neon-lime transition-colors whitespace-nowrap">{opt}</button>
             ))}
             {currentStep === 'EXPERIENCE' && ['Новичок', 'Любитель', 'Опытный', 'Атлет'].map(opt => (
                  <button key={opt} onClick={() => processInput(opt)} className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300 hover:text-neon-lime hover:border-neon-lime transition-colors whitespace-nowrap">{opt}</button>
             ))}
             {currentStep === 'FREQUENCY' && ['2', '3', '4', '5'].map(opt => (
                  <button key={opt} onClick={() => processInput(opt)} className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300 hover:text-neon-lime hover:border-neon-lime transition-colors whitespace-nowrap">{opt} раза</button>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
