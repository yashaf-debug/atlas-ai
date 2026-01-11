
import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, Activity, Utensils, User, Settings, X, Database, LogOut, BarChart2, ChefHat, Pill } from 'lucide-react';
import { NavItem } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems: NavItem[] = [
  { label: 'Чат с Тренером', path: '/', icon: MessageSquare },
  { label: 'Дневник', path: '/workouts', icon: Activity },
  { label: 'AI Повар', path: '/chef', icon: ChefHat },
  { label: 'Нейро-Сон (Beta)', path: '/sleep', icon: Activity },
  { label: 'Прогресс', path: '/progress', icon: BarChart2 },
  { label: 'Питание', path: '/nutrition', icon: Utensils },
  { label: 'Био-Стек', path: '/supplements', icon: Pill },
  { label: 'Профиль', path: '/profile', icon: User },
  { label: 'Настройки', path: '/settings', icon: Settings },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-zinc-900/90 border-r border-zinc-800 transform transition-transform duration-300 ease-in-out md:translate-x-0 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } flex flex-col`}
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-neon-lime shadow-[0_0_10px_#ccff00] flex items-center justify-center">
              <span className="text-black font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-display font-bold text-white tracking-wider">
              ATLAS <span className="text-neon-lime">AI</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="mt-6 px-4 space-y-2 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
                ${isActive
                  ? 'bg-neon-lime/10 text-neon-lime border-r-2 border-neon-lime shadow-[inset_0_0_10px_rgba(204,255,0,0.1)]'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }
              `}
            >
              <item.icon size={20} className="group-hover:scale-110 transition-transform duration-200" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="w-full p-6 pt-0 border-t border-zinc-800 pt-6">
          <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800 mb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Режим</p>
            <div className="flex items-center gap-2">
              <Database size={12} className="text-neon-lime" />
              <span className="text-sm text-neon-lime font-mono">SUPABASE_SYNC</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Выход</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
