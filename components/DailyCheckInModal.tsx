
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Battery, Activity, Check, Scale } from 'lucide-react';

interface DailyCheckInModalProps {
    isOpen: boolean;
    onConfirm: (data: { sleepHours: number; sleepQuality: string; energyLevel: number; weight: number; stressLevel: number }) => void;
}

const DailyCheckInModal: React.FC<DailyCheckInModalProps> = ({ isOpen, onConfirm }) => {
    const [sleepHours, setSleepHours] = useState(7);
    const [sleepQuality, setSleepQuality] = useState<'Плохо' | 'Норм' | 'Супер'>('Норм');
    const [energyLevel, setEnergyLevel] = useState(70);
    const [stressLevel, setStressLevel] = useState(30);
    const [weight, setWeight] = useState<string>(''); // String to allow empty state initially

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-zinc-900 border border-neon-lime rounded-2xl p-6 w-full max-w-sm relative overflow-hidden shadow-[0_0_50px_rgba(204,255,0,0.15)]"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-neon-lime"></div>
                <h2 className="text-xl font-display font-bold text-white mb-6 text-center">ЕЖЕДНЕВНЫЙ ОТЧЕТ</h2>

                {/* 1. Sleep Hours */}
                <div className="mb-4">
                    <label className="text-xs text-zinc-400 uppercase font-bold flex items-center gap-2 mb-2">
                        <Moon size={14} className="text-neon-blue" /> Часов сна
                    </label>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSleepHours(Math.max(3, sleepHours - 0.5))} className="w-10 h-10 bg-zinc-800 rounded-lg text-white font-bold hover:bg-zinc-700 transition">-</button>
                        <div className="flex-1 text-center text-3xl font-bold font-display text-white">{sleepHours}</div>
                        <button onClick={() => setSleepHours(Math.min(12, sleepHours + 0.5))} className="w-10 h-10 bg-zinc-800 rounded-lg text-white font-bold hover:bg-zinc-700 transition">+</button>
                    </div>
                </div>

                {/* 2. Sleep Quality */}
                <div className="mb-4">
                    <label className="text-xs text-zinc-400 uppercase font-bold flex items-center gap-2 mb-2">
                        <Activity size={14} className="text-purple-400" /> Качество сна
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {['Плохо', 'Норм', 'Супер'].map(q => (
                            <button
                                key={q}
                                onClick={() => setSleepQuality(q as any)}
                                className={`py-2 rounded-lg text-sm font-bold border transition-all ${sleepQuality === q ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-500 border-zinc-700 hover:border-zinc-500'}`}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Energy Level */}
                <div className="mb-4">
                    <label className="text-xs text-zinc-400 uppercase font-bold flex items-center gap-2 mb-2">
                        <Battery size={14} className="text-neon-lime" /> Энергия
                    </label>
                    <input
                        type="range" min="0" max="100" step="5"
                        value={energyLevel}
                        onChange={(e) => setEnergyLevel(Number(e.target.value))}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-neon-lime"
                    />
                    <div className="flex justify-between mt-2 text-xs font-mono">
                        <span className="text-zinc-600">0%</span>
                        <span className="text-neon-lime">{energyLevel}%</span>
                        <span className="text-zinc-600">100%</span>
                    </div>
                </div>

                {/* 4. Stress / HRV (New) */}
                <div className="mb-4">
                    <label className="text-xs text-zinc-400 uppercase font-bold flex items-center gap-2 mb-2">
                        <Activity size={14} className="text-red-500" /> Уровень Стресса (HRV)
                    </label>
                    <input
                        type="range" min="0" max="100" step="5"
                        value={stressLevel}
                        onChange={(e) => setStressLevel(Number(e.target.value))}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                    <div className="flex justify-between mt-2 text-xs font-mono">
                        <span className="text-zinc-600">Спокоен</span>
                        <span className="text-red-500">{stressLevel}%</span>
                        <span className="text-zinc-600">Выгорание</span>
                    </div>
                </div>

                {/* 4. Weight (New) */}
                <div className="mb-8">
                    <label className="text-xs text-zinc-400 uppercase font-bold flex items-center gap-2 mb-2">
                        <Scale size={14} className="text-white" /> Вес сегодня (кг)
                    </label>
                    <input
                        type="number"
                        placeholder="Например: 75.5"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded-xl py-3 px-4 text-white text-lg font-bold focus:border-neon-lime outline-none"
                    />
                </div>

                <button
                    onClick={() => onConfirm({ sleepHours, sleepQuality, energyLevel, weight: Number(weight) })}
                    className="w-full bg-neon-lime text-black font-bold py-3.5 rounded-xl hover:bg-white hover:shadow-[0_0_20px_#ccff00] transition-all flex items-center justify-center gap-2"
                >
                    <Check size={18} /> ЗАПИСАТЬ ДАННЫЕ
                </button>
            </motion.div>
        </div>
    );
};

export default DailyCheckInModal;
