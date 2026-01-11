
import React, { useState, useEffect } from 'react';
import { Pill, Zap, AlertCircle, Plus, Trash2, Check, FlaskConical } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { StorageService } from '../services/storage';
import { UserSupplement } from '../types';
import { generateSupplementsAdvice, sendMessageToGemini } from '../services/gemini';
import { Loader2 } from 'lucide-react';

const Supplements: React.FC = () => {
    const { profile } = useProfile();
    const [supplements, setSupplements] = useState<UserSupplement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);

    const [newSupp, setNewSupp] = useState({ name: '', dosage: '', timing: '' });

    useEffect(() => {
        loadSupplements();
    }, []);

    const loadSupplements = async () => {
        const data = await StorageService.getSupplements();
        setSupplements(data);
        setIsLoading(false);
    };

    const handleAdd = async () => {
        if (!newSupp.name) return;
        const newItem: UserSupplement = {
            ...newSupp,
            reason: 'Manual Entry'
        };
        const updated = [...supplements, newItem];
        setSupplements(updated);
        await StorageService.saveSupplements(updated);
        setNewSupp({ name: '', dosage: '', timing: '' });
    };

    const handleRemove = async (index: number) => {
        const updated = supplements.filter((_, i) => i !== index);
        setSupplements(updated);
        await StorageService.saveSupplements(updated);
    };

    const handleAiGenerate = async () => {
        setIsGenerating(true);
        try {
            const advice = await generateSupplementsAdvice(profile);
            setSupplements(advice);
            await StorageService.saveSupplements(advice);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAnalyzeStack = async () => {
        if (supplements.length === 0) return;
        setIsAnalyzing(true);
        const stackText = supplements.map(s => `- ${s.name} (${s.dosage}, ${s.timing})`).join('\n');

        const prompt = `
        [ACT AS: Biochemistry Expert & Pharmacologist]
        ANALYZE THIS SUPPLEMENT STACK:
        ${stackText}

        OUTPUT FORMAT (Markdown):
        1. **✅ Synergy**: What works well together?
        2. **⚠️ Conflicts**: Any dangerous interactions or absorption blockers?
        3. **🕒 Timing Check**: Are the timings optimal? (e.g. Zinc/Magnesium at night?)
        4. **💡 Verdict**: 0-10 Score and one sentence summary.
        `;

        try {
            const response = await sendMessageToGemini([], prompt);
            setAnalysisResult(response.text || "Ошибка анализа");
        } catch (e) {
            setAnalysisResult("Ошибка анализа стека.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 pb-24 bg-black text-white">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-pink-500/10 rounded-lg border border-pink-500/30">
                            <Pill size={32} className="text-pink-400" />
                        </div>
                        Био-Стек <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-1 rounded border border-pink-500/30">BIOHACK</span>
                    </h1>
                    <p className="text-zinc-400 mt-2">Управление стеком добавок и проверка совместимости.</p>
                </div>
                <button
                    onClick={handleAiGenerate}
                    disabled={isGenerating}
                    className="hidden md:flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg border border-zinc-700 transition-colors"
                >
                    {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} className="text-yellow-400" />}
                    <span>AI Подбор Стека</span>
                </button>
            </header>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Left: Stack List */}
                <div className="space-y-6">
                    {/* Add Form */}
                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row gap-2">
                        <input className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm flex-1 focus:border-pink-500 outline-none" placeholder="Название (напр. Магний)" value={newSupp.name} onChange={e => setNewSupp({ ...newSupp, name: e.target.value })} />
                        <input className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm w-full md:w-32 focus:border-pink-500 outline-none" placeholder="Доза" value={newSupp.dosage} onChange={e => setNewSupp({ ...newSupp, dosage: e.target.value })} />
                        <input className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm w-full md:w-32 focus:border-pink-500 outline-none" placeholder="Время" value={newSupp.timing} onChange={e => setNewSupp({ ...newSupp, timing: e.target.value })} />
                        <button onClick={handleAdd} className="bg-pink-600 hover:bg-pink-500 p-2 rounded text-white"><Plus size={20} /></button>
                    </div>

                    {isLoading ? <div className="text-center p-8 text-zinc-500">Загрузка стека...</div> : (
                        <div className="space-y-3">
                            {supplements.length === 0 && <p className="text-zinc-500 text-center py-8">Стек пуст. Добавьте вручную или попросите AI подобрать.</p>}
                            {supplements.map((s, idx) => (
                                <div key={idx} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between group">
                                    <div>
                                        <h3 className="font-bold text-lg text-zinc-200">{s.name}</h3>
                                        <div className="flex gap-2 text-xs text-zinc-400 mt-1">
                                            <span className="px-2 py-0.5 bg-zinc-800 rounded border border-zinc-700">{s.dosage}</span>
                                            <span className="px-2 py-0.5 bg-zinc-800 rounded border border-zinc-700">{s.timing}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemove(idx)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 size={18} /></button>
                                </div>
                            ))}
                        </div>
                    )}

                    {supplements.length > 0 && (
                        <button
                            onClick={handleAnalyzeStack}
                            disabled={isAnalyzing}
                            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.3)] flex items-center justify-center gap-2 transition-all mt-4"
                        >
                            {isAnalyzing ? <Loader2 className="animate-spin" /> : <FlaskConical fill="currentColor" />}
                            {isAnalyzing ? "СКАНИРОВАНИЕ МОЛЕКУЛ..." : "ПРОВЕРИТЬ СОВМЕСТИМОСТЬ"}
                        </button>
                    )}
                </div>

                {/* Right: Analysis */}
                <div>
                    {analysisResult && (
                        <div className="bg-zinc-900/80 border border-zinc-700 p-6 rounded-2xl animate-fade-in">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-pink-400"><AlertCircle size={20} /> Отчет Лаборатории</h2>
                            <div className="prose prose-invert prose-sm max-w-none">
                                <div className="whitespace-pre-wrap">{analysisResult}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Supplements;
