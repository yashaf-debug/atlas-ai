
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, Star } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { profile } = useProfile(); // Consuming context here ensures header stays synced

  return (
    // FIX 2: Min-h-[100dvh] and flex-col for mobile layout stability
    <div className="h-[100dvh] w-full bg-black text-gray-100 font-sans selection:bg-neon-lime selection:text-black overflow-hidden flex flex-col md:flex-row">
      
      {/* Mobile Header - Fixed at top, shrinks to fit content */}
      <header className="md:hidden w-full z-30 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded bg-neon-lime shadow-[0_0_8px_#ccff00] flex items-center justify-center relative">
              <span className="text-black font-bold text-xs">A</span>
            </div>
            <div>
                 <span className="text-lg font-display font-bold tracking-wide leading-none block">ATLAS AI</span>
                 {profile && (
                     <div className="flex items-center gap-1">
                         <Star size={10} className="text-neon-lime" fill="currentColor"/>
                         <span className="text-[10px] text-zinc-400 font-mono">LVL {profile.level || 1}</span>
                     </div>
                 )}
            </div>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-zinc-300 hover:text-neon-lime transition-colors"
        >
          <Menu size={24} />
        </button>
      </header>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      {/* Flex-1 ensures it takes remaining space. Relative for positioning background. */}
      <main className="flex-1 md:pl-64 h-full relative flex flex-col overflow-hidden w-full">
        
        {/* Child Content Container */}
        <div className="flex-1 w-full h-full relative">
           {children}
        </div>

        {/* Background Ambience (Fixed relative to Main) */}
        <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-neon-blue/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-neon-lime/5 rounded-full blur-[100px]" />
        </div>
      </main>
    </div>
  );
};

export default Layout;
