
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { LogOut, Shield, Trash2, AlertTriangle, Loader2, Brain, Check, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { signOut, user } = useAuth();

  useEffect(() => {
    const savedKey = localStorage.getItem('ATLAS_GEMINI_KEY');
    if (savedKey) setGeminiKey(savedKey);
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('ATLAS_GEMINI_KEY', geminiKey);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleResetProgress = async () => {
    if (window.confirm("Вы уверены? Это удалит профиль, историю тренировок и переписку. Это действие необратимо.")) {
      setIsResetting(true);
      try {
        await StorageService.resetAccount();
        window.location.reload();
      } catch (e) {
        console.error("Reset Error:", e);
        alert("Ошибка сброса. Попробуйте еще раз.");
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20 md:pb-0 h-full overflow-y-auto p-4 md:p-8">
      <h1 className="text-3xl font-display font-bold mb-8">Настройки</h1>

      <div className="space-y-6">
        {/* Account Section */}
        <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="text-neon-blue" size={20} />
            Аккаунт
          </h2>
          <div className="mb-6 p-4 bg-black/30 rounded-xl border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Текущий Email</p>
            <p className="text-white font-mono">{user?.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-red-950/30 text-red-200 font-bold py-3 rounded-xl hover:bg-red-900 hover:text-white transition-all flex items-center justify-center gap-2 border border-red-900/50 hover:border-red-500"
          >
            <LogOut size={18} /> Выйти из аккаунта
          </button>
        </div>

        {/* AI Configuration Section */}
        <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Brain className="text-neon-lime" size={20} />
            Конфигурация AI
          </h2>
          <div className="mb-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Gemini API Key</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-black/30 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-neon-lime outline-none transition-all"
              />
              <button
                onClick={handleSaveKey}
                className={`px-4 rounded-xl transition-all flex items-center gap-2 font-bold ${saveSuccess ? 'bg-green-600 text-white' : 'bg-neon-lime text-black hover:bg-white hover:shadow-[0_0_15px_#ccff00]'}`}
              >
                {saveSuccess ? <Check size={18} /> : <Save size={18} />}
                {saveSuccess ? 'OK' : 'Save'}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2 italic">
              Если вы в России, рекомендуется использовать Google AI Studio Key и настроенный прокси. Ключ сохраняется только в вашем браузере.
            </p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-950/20 backdrop-blur-md border border-red-900/50 rounded-2xl p-6 md:p-8 shadow-xl mt-8">
          <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            Опасная Зона
          </h2>
          <p className="text-red-200/60 text-sm mb-6">
            Сброс удалит все ваши данные: профиль, тренировки, питание и переписку с AI.
            Это действие необратимо.
          </p>
          <button
            onClick={handleResetProgress}
            disabled={isResetting}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isResetting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            {isResetting ? "Удаление данных..." : "Сбросить прогресс и начать заново"}
          </button>
        </div>

      </div>

      <div className="mt-8 text-center space-y-2 pb-8">
        <p className="text-zinc-500 text-xs">Atlas AI v3.0.0 • Supabase Sync Active</p>
        <p className="text-zinc-700 text-[10px] uppercase tracking-widest">System Operational</p>
      </div>
    </div>
  );
};

export default Settings;
