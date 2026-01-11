
import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { UserProfile } from '../types';

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface DailyStatus {
  date: string;
  bodyBattery: number; // 0-100
}

export interface DailyMetrics {
  sleep_hours: number;
  sleep_quality: string;
  energy_level: number;
  weight?: number;
  stress_level?: number; // HRV or stress index (0-100)
}

interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  dailyStatus: DailyStatus;
  weightHistory: WeightEntry[];
  needsCheckIn: boolean; // New Flag
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  createProfile: (data: UserProfile) => Promise<void>;
  updateBodyBattery: (value: number) => void;
  submitDailyCheckIn: (data: DailyMetrics) => Promise<void>;
  addWeightEntry: (weight: number) => void;
  addXp: (amount: number) => Promise<{ newLevel: number; leveledUp: boolean }>;
  getLevelInfo: () => { title: string; progress: number; nextLevelXp: number };
}

const defaultDailyStatus: DailyStatus = {
  date: new Date().toDateString(),
  bodyBattery: 85
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus>(defaultDailyStatus);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [needsCheckIn, setNeedsCheckIn] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Profile (Async from Supabase)
        const loadedProfile = await StorageService.getUserProfile();

        if (loadedProfile && (loadedProfile.xp === undefined || loadedProfile.level === undefined)) {
          loadedProfile.xp = 0;
          loadedProfile.level = 1;
          // Background update if missing fields
          StorageService.saveUserProfile(loadedProfile);
        }
        setProfile(loadedProfile);

        // 2. Daily Status (Sync check)
        // Check if we have metrics for TODAY in Supabase
        const todayStr = new Date().toISOString().split('T')[0];
        const todayMetric = await StorageService.getDailyMetric(todayStr);

        if (todayMetric) {
          setDailyStatus({ date: new Date().toDateString(), bodyBattery: todayMetric.energy_level });
          setNeedsCheckIn(false);
        } else {
          setNeedsCheckIn(true);
          setDailyStatus(defaultDailyStatus);
        }

        // 3. Weight History (Local)
        const loadedHistory = StorageService.getWeightHistory();
        setWeightHistory(loadedHistory);
      } catch (e) {
        console.error("Initialization error", e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const createProfile = async (data: UserProfile) => {
    // Initialize RPG stats
    const newProfile = {
      ...data,
      xp: 0,
      level: 1
    };
    await StorageService.saveUserProfile(newProfile);
    // Fetch back to ensure we have the correct structure
    const saved = await StorageService.getUserProfile();
    setProfile(saved || newProfile);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!profile) return;
    const updatedProfile = { ...profile, ...data };
    setProfile(updatedProfile); // Optimistic update
    await StorageService.saveUserProfile(updatedProfile);
  };

  const updateBodyBattery = async (value: number) => {
    const newStatus = {
      date: new Date().toDateString(),
      bodyBattery: value
    };
    setDailyStatus(newStatus);
    StorageService.saveDailyStatus(newStatus); // Local

    // Persist to Supabase so it survives reload
    // We try to get today's existing metric to preserve sleep data, or default
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const existing = await StorageService.getDailyMetric(todayStr);

      await StorageService.saveDailyMetric({
        date: todayStr,
        sleep_hours: existing?.sleep_hours || 0,
        sleep_quality: existing?.sleep_quality || 'Good', // Default if fresh check-in
        energy_level: value
      });
    } catch (e) {
      console.error("Failed to sync energy level to DB", e);
    }
  };

  const submitDailyCheckIn = async (data: DailyMetrics) => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Save Metrics
    await StorageService.saveDailyMetric({
      date: todayStr,
      sleep_hours: data.sleep_hours,
      sleep_quality: data.sleep_quality,
      energy_level: data.energy_level,
      stress_level: data.stress_level // Pass stress level
    });

    // Save Weight if provided (Logic moved here from just local metrics)
    if (data.weight && data.weight > 0) {
      await StorageService.saveBodyMeasurement(data.weight);
      // Also update profile weight for consistency
      updateProfile({ weight: data.weight });
      addWeightEntry(data.weight);
    }

    // Update Context State
    setDailyStatus({
      date: new Date().toDateString(),
      bodyBattery: data.energy_level
    });
    setNeedsCheckIn(false);

    // Award XP for consistency
    await addXp(10);
  };

  const addWeightEntry = (weight: number) => {
    const newEntry = { date: new Date().toISOString(), weight };
    const newHistory = [...weightHistory, newEntry];
    setWeightHistory(newHistory);
    StorageService.saveWeightHistory(newHistory);

    // Also update current weight in Profile
    if (profile) {
      updateProfile({ weight });
    }
  };

  // --- RPG Logic ---
  const XP_PER_LEVEL = 500;

  const addXp = async (amount: number) => {
    if (!profile) return { newLevel: 1, leveledUp: false };

    const currentXp = profile.xp || 0;
    const currentLevel = profile.level || 1;
    const newXp = currentXp + amount;

    // Simple Linear Leveling
    const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
    const leveledUp = newLevel > currentLevel;

    // Use updateProfile to ensure single source of truth update logic
    await updateProfile({ xp: newXp, level: newLevel });

    return { newLevel, leveledUp };
  };

  const getLevelInfo = () => {
    const level = profile?.level || 1;
    const xp = profile?.xp || 0;

    let title = "Новичок";
    if (level >= 5) title = "Любитель";
    if (level >= 10) title = "Машина";
    if (level >= 20) title = "Киборг";
    if (level >= 50) title = "Титан";

    const xpInCurrentLevel = xp % XP_PER_LEVEL;
    const progress = (xpInCurrentLevel / XP_PER_LEVEL) * 100;

    return { title, progress, nextLevelXp: XP_PER_LEVEL - xpInCurrentLevel };
  };

  return (
    <ProfileContext.Provider value={{
      profile,
      isLoading,
      dailyStatus,
      weightHistory,
      needsCheckIn,
      createProfile,
      updateProfile,
      updateBodyBattery,
      submitDailyCheckIn,
      addWeightEntry,
      addXp,
      getLevelInfo
    }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
