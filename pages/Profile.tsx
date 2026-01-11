
import React, { useState } from 'react';
import { User, Activity, Flame, Battery, TrendingUp, Edit2, Save, Zap } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useNutrition } from '../context/NutritionContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Profile: React.FC = () => {
    const { profile, dailyStatus, updateBodyBattery, updateProfile, addWeightEntry, weightHistory } = useProfile();
    const { getDailyStats } = useNutrition();
    const dailyNutrition = getDailyStats();

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        weight: profile?.weight || 0,
        height: profile?.height || 0,
        name: profile?.name || ''
    });

    const handleBodyBatteryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateBodyBattery(Number(e.target.value));
    };

    const getBatteryColor = (val: number) => {
        if (val > 70) return 'text-neon-lime drop-shadow-[0_0_8px_rgba(204,255,0,0.8)]';
        if (val > 30) return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]';
        return 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]';
    };

    const getBatteryTrackColor = (val: number) => {
        if (val > 70) return 'accent-neon-lime';
        if (val > 30) return 'accent-yellow-400';
        return 'accent-red-500';
    };

    const handleSaveProfile = () => {
        if (profile && editForm.weight !== profile.weight) {
            addWeightEntry(editForm.weight);
        }
        updateProfile({
            name: editForm.name,
            height: editForm.height,
            weight: editForm.weight
        });
        setIsEditing(false);
    };

    const chartData = weightHistory.map(entry => ({
        date: new Date(entry.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
        weight: entry.weight
    }));

    if (!profile) return null;

    // Use calculated target or default
    const targetCalories = profile.target_calories || 2000;

    return (
        <div className="h-full overflow-y-auto pb-20 md:pb-0 p-4 md:p-8">
            {/* Header Profile Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-neon-lime to-neon-blue p-[2px] shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                <User size={40} className="text-zinc-500" />
                            </div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 bg-black rounded-full border border-zinc-800 flex items-center justify-center">
                            <div className="w-3 h-3 bg-neon-lime rounded-full animate-pulse"></div>
                        </div>
                    </div>

                    <div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="bg-zinc-800 border border-zinc-700 text-white text-2xl font-display font-bold rounded px-2 py-1 w-full max-w-[200px] mb-1 focus:border-neon-lime outline-none"
                            />
                        ) : (
                            <h1 className="text-3xl font-display font-bold text-white">{profile.name}</h1>
                        )}
                        <p className="text-zinc-400 flex items-center gap-2">
                            Уровень {profile.level || 1} • {profile.fitness_goal}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all border ${isEditing ? 'bg-neon-lime text-black border-neon-lime' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}
                >
                    {isEditing ? <><Save size={18} /> Сохранить</> : <><Edit2 size={18} /> Редактировать</>}
                </button>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. Body Battery Card */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between shadow-lg backdrop-blur-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-200">
                            <Battery size={20} className={getBatteryColor(dailyStatus.bodyBattery)} />
                            Заряд Энергии
                        </h2>
                        <span className={`text-2xl font-display font-bold ${getBatteryColor(dailyStatus.bodyBattery)}`}>
                            {dailyStatus.bodyBattery}%
                        </span>
                    </div>

                    <div className="relative z-10">
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={dailyStatus.bodyBattery}
                            onChange={handleBodyBatteryChange}
                            className={`w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer ${getBatteryTrackColor(dailyStatus.bodyBattery)}`}
                        />
                        <div className="flex justify-between mt-2 text-xs text-zinc-500 font-mono">
                            <span>ИСТОЩЕН</span>
                            <span>ЗАРЯЖЕН</span>
                        </div>
                        <p className="mt-4 text-sm text-zinc-400">
                            {dailyStatus.bodyBattery > 70 ? "Системы в норме. Готов к нагрузкам." : dailyStatus.bodyBattery > 30 ? "Средний уровень энергии." : "Требуется восстановление."}
                        </p>
                    </div>

                    <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-[60px] opacity-20 transition-colors duration-500 ${dailyStatus.bodyBattery > 70 ? 'bg-neon-lime' : dailyStatus.bodyBattery > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                </div>

                {/* 2. Calories Card */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between shadow-lg backdrop-blur-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-200">
                            <Flame size={20} className="text-orange-500" />
                            Топливо
                        </h2>
                        <span className="text-xs text-zinc-500 font-mono">СЕГОДНЯ</span>
                    </div>

                    <div className="flex items-end gap-2 mb-4 relative z-10">
                        <span className="text-4xl font-display font-bold text-white">{dailyNutrition.calories}</span>
                        <span className="text-sm text-zinc-500 mb-2">/ {targetCalories} ккал</span>
                    </div>

                    <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden relative z-10">
                        <div
                            className="h-full bg-gradient-to-r from-orange-600 to-orange-400 shadow-[0_0_10px_orange]"
                            style={{ width: `${Math.min((dailyNutrition.calories / targetCalories) * 100, 100)}%` }}
                        ></div>
                    </div>
                    <div className="absolute -left-10 -top-10 w-32 h-32 bg-orange-500/10 rounded-full blur-[60px]"></div>
                </div>

                {/* 3. Physical Stats */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 shadow-lg backdrop-blur-sm">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-200 mb-6">
                        <Activity size={20} className="text-neon-blue" />
                        Физические данные
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
                            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Вес</p>
                            <div className="flex items-end gap-1">
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={editForm.weight}
                                        onChange={(e) => setEditForm({ ...editForm, weight: Number(e.target.value) })}
                                        className="bg-zinc-800 text-white w-16 px-1 rounded border border-zinc-700 focus:border-neon-blue outline-none"
                                    />
                                ) : (
                                    <span className="text-2xl font-bold text-white">{profile.weight}</span>
                                )}
                                <span className="text-xs text-zinc-500 mb-1">кг</span>
                            </div>
                        </div>
                        <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
                            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Рост</p>
                            <div className="flex items-end gap-1">
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={editForm.height}
                                        onChange={(e) => setEditForm({ ...editForm, height: Number(e.target.value) })}
                                        className="bg-zinc-800 text-white w-16 px-1 rounded border border-zinc-700 focus:border-neon-blue outline-none"
                                    />
                                ) : (
                                    <span className="text-2xl font-bold text-white">{profile.height}</span>
                                )}
                                <span className="text-xs text-zinc-500 mb-1">см</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Weight Chart */}
                <div className="md:col-span-2 lg:col-span-3 bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 shadow-lg">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-200 mb-4">
                        <TrendingUp size={20} className="text-neon-lime" />
                        Прогресс веса
                    </h2>
                    <div className="h-64 w-full flex items-center justify-center">
                        {chartData.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ccff00" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ccff00" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="date"
                                        stroke="#52525b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        domain={['dataMin - 1', 'dataMax + 1']}
                                        stroke="#52525b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        hide
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }}
                                        itemStyle={{ color: '#ccff00' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="weight"
                                        stroke="#ccff00"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorWeight)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-zinc-600 text-sm italic">Недостаточно данных для графика.</p>
                        )}
                    </div>
                </div>

                {/* 5. GAMIFICATION / AUGMENTATIONS */}
                <div className="md:col-span-2 lg:col-span-3 bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 shadow-lg">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-200 mb-6">
                        <Zap size={20} className="text-purple-500" />
                        Кибер-Импланты (Достижения)
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { lvl: 1, title: 'Нейро-чип', desc: 'Начало пути', icon: '🧠' },
                            { lvl: 5, title: 'Титановые Кости', desc: 'Скелет укреплен', icon: '🦴' },
                            { lvl: 10, title: 'Синтетические Мышцы', desc: 'Сила x2', icon: '💪' },
                            { lvl: 20, title: 'Ядерный Реактор', desc: 'Бесконечная энергия', icon: '☢️' },
                            { lvl: 50, title: 'Киборг-Омега', desc: 'Вершина эволюции', icon: '🤖' }
                        ].map((badg, idx) => {
                            const isUnlocked = (profile.level || 1) >= badg.lvl;
                            return (
                                <div key={idx} className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${isUnlocked ? 'bg-zinc-900 border-neon-lime/30 shadow-[0_0_15px_rgba(204,255,0,0.1)]' : 'bg-black/50 border-zinc-800 opacity-50 grayscale'}`}>
                                    <div className="text-4xl mb-2">{badg.icon}</div>
                                    <h3 className={`font-bold text-sm ${isUnlocked ? 'text-white' : 'text-zinc-600'}`}>{badg.title}</h3>
                                    <p className="text-[10px] text-zinc-500">{badg.desc}</p>
                                    {!isUnlocked && <span className="text-[10px] text-neon-lime mt-2 border border-neon-lime/20 px-2 rounded">Требуется Ур.{badg.lvl}</span>}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
