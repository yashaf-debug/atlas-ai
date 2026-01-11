
import React, { useState, useEffect } from 'react';
import { Moon, Upload, Activity, Zap, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { sendMessageToGemini } from '../services/gemini';
import { useProfile } from '../context/ProfileContext';
import { StorageService } from '../services/storage';

interface SleepAnalysis {
    score: number;
    deep_sleep_est: string;
    recovery_status: string;
    protocols: string[];
    summary_text: string;
}

const SleepLab: React.FC = () => {
    const { submitDailyCheckIn, profile } = useProfile();
    const [analysis, setAnalysis] = useState<SleepAnalysis | null>(null);
    const [isAhalyzing, setIsAhalyzing] = useState(false);
    const [sleepInput, setSleepInput] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Persistence: Load last analysis on mount
    useEffect(() => {
        const saved = localStorage.getItem('atlas_sleep_analysis');
        if (saved) {
            try {
                setAnalysis(JSON.parse(saved));
            } catch (e) { localStorage.removeItem('atlas_sleep_analysis'); }
        }
    }, []);

    // Persistence: Save analysis on change
    useEffect(() => {
        if (analysis) {
            localStorage.setItem('atlas_sleep_analysis', JSON.stringify(analysis));
        }
    }, [analysis]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) setSelectedImage(ev.target.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleAnalyze = async () => {
        if (!sleepInput && !selectedImage) return;
        setIsAhalyzing(true);

        // Construct Prompt
        const prompt = `
    [ACT AS: Sleep Scientist & Neurobiologist]
    [TASK: Analyze User Sleep Data]
    
    INPUT:
    ${sleepInput ? `User Notes: "${sleepInput}"` : ''}
    ${selectedImage ? '[Image Attached]' : ''}
    
    Analyze the provided sleep data (text description or screenshot from sleep tracker).
    
    OUTPUT FORMAT (Markdown JSON Block):
    \`\`\`json
    {
       "score": 0-100,
       "deep_sleep_est": "Description",
       "recovery_status": "Fully Recovered" | "Impaired" | "Critical",
       "protocols": ["Tip 1", "Tip 2", "Tip 3"],
       "summary_text": "Short clinical summary in cyberpunk style"
    }
    \`\`\`
    
    STYLE: Short, clinical, cyberpunk tone.
    `;

        try {
            const response = await sendMessageToGemini(
                [], // Empty history
                prompt,
                undefined,
                undefined,
                undefined,
                selectedImage || undefined
            );

            const text = response.text || "";
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);

            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[1]) as SleepAnalysis;
                setAnalysis(data);

                // Auto-save to Daily Metrics if score is available
                // We use a safe default for energy/hours if they are not yet set
                const todayStr = new Date().toISOString().split('T')[0];
                const existing = await StorageService.getDailyMetric(todayStr);

                await submitDailyCheckIn({
                    sleep_hours: existing?.sleep_hours || 7, // Keep existing or default
                    sleep_quality: data.score > 80 ? 'Супер' : data.score > 50 ? 'Норм' : 'Плохо',
                    energy_level: data.score, // Use sleep score as energy level
                    stress_level: existing?.stress_level,
                    weight: existing?.weight // Preserve weight
                });
            } else {
                setAnalysis({
                    score: 0,
                    deep_sleep_est: "Unknown",
                    recovery_status: "Error",
                    protocols: [],
                    summary_text: text // Fallback to raw text
                });
            }

        } catch (e) {
            console.error(e);
            setAnalysis({
                score: 0,
                deep_sleep_est: "Error",
                recovery_status: "System Fail",
                protocols: ["Check Connection"],
                summary_text: "Ошибка соединения с модулем анализа."
            });
        } finally {
            setIsAhalyzing(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-4 pb-24 md:p-8 bg-black text-white">
            <header className="mb-8">
                <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
                        <Moon size={32} className="text-indigo-400" />
                    </div>
                    Сон-Лаб <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30">BETA</span>
                </h1>
                <p className="text-zinc-400 mt-2">Нейро-анализ восстановления и архитектуры сна.</p>
            </header>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl backdrop-blur-sm">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Upload size={20} className="text-indigo-400" /> Загрузка Данных</h2>

                    <div className="space-y-4">
                        <div className="relative border-2 border-dashed border-zinc-700 rounded-xl p-8 flex flex-col items-center justify-center hover:border-indigo-500 transition-colors cursor-pointer group">
                            <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                            {selectedImage ? (
                                <div className="relative w-full h-48 rounded-lg overflow-hidden">
                                    <img src={selectedImage} className="w-full h-full object-cover opacity-80" alt="Sleep Data" />
                                </div>
                            ) : (
                                <>
                                    <Activity size={40} className="text-zinc-600 group-hover:text-indigo-400 transition-colors mb-2" />
                                    <p className="text-zinc-400 text-sm text-center">Перетащите скриншот из Apple Health / Oura / Sleep Cycle</p>
                                </>
                            )}
                        </div>

                        <textarea
                            value={sleepInput}
                            onChange={(e) => setSleepInput(e.target.value)}
                            placeholder="Или опишите, как вы спали (время засыпания, пробуждения, самочувствие)..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-white focus:border-indigo-500 outline-none h-32 resize-none"
                        />

                        <button
                            onClick={handleAnalyze}
                            disabled={isAhalyzing || (!sleepInput && !selectedImage)}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAhalyzing ? <Zap className="animate-pulse" /> : <Play fill="currentColor" />}
                            {isAhalyzing ? "НЕЙРО-СКАНИРОВАНИЕ..." : "ЗАПУСТИТЬ АНАЛИЗ"}
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl backdrop-blur-sm min-h-[400px]">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity size={20} className="text-neon-lime" /> Результат</h2>

                    {analysis ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className={`text-4xl font-display font-bold ${analysis.score > 70 ? 'text-neon-lime' : 'text-red-500'}`}>
                                    {analysis.score}<span className="text-lg text-zinc-500">/100</span>
                                </div>
                                <div className="text-sm text-zinc-400">
                                    Status: <span className="text-white font-bold">{analysis.recovery_status}</span>
                                </div>
                            </div>

                            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-300 text-sm">
                                {analysis.summary_text}
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase">Протоколы восстановления:</h3>
                                <ul className="space-y-2">
                                    {analysis.protocols.map((p, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-zinc-300">
                                            <span className="text-indigo-500">►</span> {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                            <Moon size={60} className="mb-4" />
                            <p>Ожидание данных...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SleepLab;
