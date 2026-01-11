
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Workouts from './pages/Workouts';
import Nutrition from './pages/Nutrition';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Progress from './pages/Progress';
import Onboarding from './pages/Onboarding';
import AiChef from './pages/AiChef';
import SleepLab from './pages/SleepLab';
import Supplements from './pages/Supplements';
import Auth from './pages/Auth';
import ReloadPrompt from './components/ReloadPrompt';
import { WorkoutProvider } from './context/WorkoutContext';
import { NutritionProvider } from './context/NutritionContext';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

const FullScreenLoader = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
    <Loader2 className="animate-spin text-neon-lime" size={48} />
    <span className="text-zinc-500 font-mono text-sm animate-pulse">ПОДКЛЮЧЕНИЕ_НЕЙРОСЕТИ...</span>
  </div>
);

const AppRoutes: React.FC = () => {
  const { profile, isLoading } = useProfile();

  if (isLoading) return <FullScreenLoader />;
  if (!profile) {
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        import SleepLab from './pages/SleepLab'; // Import needed

        // ... (in AppRoutes)
        <Route path="/exercises" element={<Workouts />} />
        {/* Wait, standard path is /workouts. Let me correct based on file content */}
        <Route path="/workouts" element={<Workouts />} />
        <Route path="/chef" element={<AiChef />} />
        <Route path="/sleep" element={<SleepLab />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/supplements" element={<Supplements />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const AppContent: React.FC = () => {
  const { session, loading: authLoading } = useAuth();
  if (authLoading) return <FullScreenLoader />;
  if (!session) return <Auth />;

  return (
    <ProfileProvider>
      <WorkoutProvider>
        <NutritionProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </NutritionProvider>
      </WorkoutProvider>
    </ProfileProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ReloadPrompt />
      <AppContent />
    </AuthProvider>
  );
};

export default App;
