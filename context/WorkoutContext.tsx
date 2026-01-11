
import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storage';

// --- Types ---

export interface ExerciseLog {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: string;
  completed: boolean;
  technique?: string;
  tips?: string;
  target_muscle?: string;
  // Tracking inputs
  actualSets?: number;
  actualReps?: string | number;
  actualWeight?: string | number;
}

export interface WorkoutSession {
  id: string;
  date: string; // ISO String
  title: string;
  duration: string;
  exercises: ExerciseLog[];
  volume: number; // Estimated total volume in kg
  rpe?: number; // 1-10 intensity
}

interface WorkoutContextType {
  history: WorkoutSession[];
  activeWorkout: ExerciseLog[]; 
  activeWorkoutTitle: string;
  logWorkout: (title: string, duration: string, exercises: ExerciseLog[], rpe?: number) => void;
  deleteSession: (id: string) => void; // New
  getWeeklyStats: () => { totalWorkouts: number; totalVolume: number };
  // State Persistence for Active Chat Widget
  updateActiveWorkout: (exercises: ExerciseLog[], title: string) => void;
  clearActiveWorkout: () => void;
}

// --- Helper ---
const parseVolume = (exercises: ExerciseLog[]): number => {
  let total = 0;
  exercises.forEach(ex => {
    if (ex.completed) {
      const match = String(ex.actualWeight || ex.weight).match(/(\d+)/);
      const weight = match ? parseInt(match[0]) : 0;
      const sets = Number(ex.actualSets) || ex.sets || 0;
      const reps = parseInt(String(ex.actualReps || ex.reps)) || 0;
      total += (weight * sets * reps);
    }
  });
  return total;
};

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

const KEYS = {
  ACTIVE_WORKOUT: 'atlas_active_workout_state',
  ACTIVE_TITLE: 'atlas_active_workout_title'
};

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  
  // Persistence State
  const [activeWorkout, setActiveWorkout] = useState<ExerciseLog[]>(() => {
    const saved = localStorage.getItem(KEYS.ACTIVE_WORKOUT);
    return saved ? JSON.parse(saved) : [];
  });
  const [activeWorkoutTitle, setActiveWorkoutTitle] = useState<string>(() => {
    return localStorage.getItem(KEYS.ACTIVE_TITLE) || '';
  });

  // Load from Supabase on mount
  useEffect(() => {
    const fetchHistory = async () => {
        const loadedWorkouts = await StorageService.getWorkouts();
        setHistory(loadedWorkouts);
    };
    fetchHistory();
  }, []);

  const updateActiveWorkout = (exercises: ExerciseLog[], title: string) => {
    setActiveWorkout(exercises);
    setActiveWorkoutTitle(title);
    localStorage.setItem(KEYS.ACTIVE_WORKOUT, JSON.stringify(exercises));
    localStorage.setItem(KEYS.ACTIVE_TITLE, title);
  };

  const clearActiveWorkout = () => {
    setActiveWorkout([]);
    setActiveWorkoutTitle('');
    localStorage.removeItem(KEYS.ACTIVE_WORKOUT);
    localStorage.removeItem(KEYS.ACTIVE_TITLE);
  };

  const logWorkout = async (title: string, duration: string, exercises: ExerciseLog[], rpe?: number) => {
    const newSessionBase = {
      date: new Date().toISOString(),
      title,
      duration,
      exercises,
      volume: parseVolume(exercises),
      rpe: rpe || 0
    };
    
    // Save to DB (Upsert logic handles duplicates)
    await StorageService.saveWorkout(newSessionBase);
    
    // Re-fetch history to ensure UI is in sync with DB state (IDs, timestamps)
    const updatedHistory = await StorageService.getWorkouts();
    setHistory(updatedHistory);
    
    // Clear active state as it's now done
    clearActiveWorkout();
  };

  const deleteSession = async (id: string) => {
    // Optimistic Update
    setHistory(prev => prev.filter(session => session.id !== id));
    await StorageService.deleteWorkoutHistory(id);
  };

  const getWeeklyStats = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyLogs = history.filter(log => new Date(log.date) > oneWeekAgo);
    
    return {
      totalWorkouts: weeklyLogs.length,
      totalVolume: weeklyLogs.reduce((acc, curr) => acc + curr.volume, 0)
    };
  };

  return (
    <WorkoutContext.Provider value={{ 
      history, 
      activeWorkout, 
      activeWorkoutTitle,
      logWorkout, 
      deleteSession,
      getWeeklyStats,
      updateActiveWorkout,
      clearActiveWorkout 
    }}>
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};
