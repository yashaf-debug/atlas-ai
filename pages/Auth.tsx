
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Mail, Lock, Loader2, AlertCircle, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // AuthContext will automatically detect session change
    } catch (err: any) {
      setError(err.message || "Ошибка входа. Проверьте данные.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setError("Регистрация успешна! Если вход не выполнен автоматически, проверьте почту.");
    } catch (err: any) {
      setError(err.message || "Ошибка регистрации.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-neon-blue/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-neon-lime/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-8 relative z-10"
      >
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black border border-neon-lime/30 mb-4 shadow-[0_0_20px_rgba(204,255,0,0.1)]">
                <Sparkles className="text-neon-lime" size={32} />
            </div>
            <h1 className="text-3xl font-display font-bold text-white tracking-wider mb-2">ATLAS <span className="text-neon-lime">ID</span></h1>
            <p className="text-zinc-500 text-sm">Вход в систему нейро-коучинга</p>
        </div>

        {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className={`mb-6 p-3 border rounded-lg flex items-center gap-2 text-xs ${error.includes('успешна') ? 'bg-green-900/30 border-green-500/50 text-green-200' : 'bg-red-900/30 border-red-500/50 text-red-200'}`}
            >
                <AlertCircle size={16} className="shrink-0" />
                {error}
            </motion.div>
        )}

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
                <label className="text-xs text-zinc-500 uppercase font-bold mb-1.5 block ml-1">Email</label>
                <div className="relative group">
                    <Mail className="absolute left-3 top-3.5 text-zinc-500 group-focus-within:text-neon-lime transition-colors" size={18} />
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black/50 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-neon-lime focus:ring-1 focus:ring-neon-lime transition-all"
                        placeholder="user@example.com"
                    />
                </div>
            </div>
            
            <div>
                <label className="text-xs text-zinc-500 uppercase font-bold mb-1.5 block ml-1">Пароль</label>
                <div className="relative group">
                    <Lock className="absolute left-3 top-3.5 text-zinc-500 group-focus-within:text-neon-lime transition-colors" size={18} />
                    <input 
                        type="password" 
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/50 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-neon-lime focus:ring-1 focus:ring-neon-lime transition-all"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
                <button 
                    onClick={() => handleLogin()}
                    disabled={loading}
                    className="w-full bg-neon-lime text-black font-bold py-3.5 rounded-xl hover:bg-white hover:shadow-[0_0_20px_#ccff00] transition-all flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : (
                        <>
                            <LogIn size={20} /> ВОЙТИ
                        </>
                    )}
                </button>

                <button 
                    onClick={() => handleRegister()}
                    disabled={loading}
                    className="w-full bg-transparent border border-zinc-700 text-zinc-300 font-bold py-3.5 rounded-xl hover:border-neon-lime hover:text-neon-lime transition-all flex items-center justify-center gap-2"
                >
                     <UserPlus size={20} /> РЕГИСТРАЦИЯ
                </button>
            </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Auth;
