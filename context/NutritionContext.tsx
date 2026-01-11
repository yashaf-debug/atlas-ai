
import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { MealType, UserSupplement } from '../types';
import { generateSupplementsAdvice } from '../services/gemini';
import { useProfile } from './ProfileContext';

export interface FoodLog {
  id: string;
  date: string; // YYYY-MM-DD
  meal_type: MealType;
  dish_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  image?: string; // This will now be a Supabase Public URL
}

interface DailyStats {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface NutritionContextType {
  logs: FoodLog[];
  waterIntake: number;
  selectedDate: string;
  supplements: UserSupplement[];
  logFood: (food: Omit<FoodLog, 'id' | 'date' | 'meal_type'>, mealType?: MealType) => void;
  removeFoodLog: (id: string) => void;
  logWater: (amount: number) => void;
  getDailyStats: () => DailyStats;
  changeDate: (date: string) => void;
  generateSupplementsStack: () => Promise<void>;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

export const NutritionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useProfile();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [waterIntake, setWaterIntake] = useState(0);
  const [supplements, setSupplements] = useState<UserSupplement[]>([]);

  useEffect(() => {
    refreshData(selectedDate);
    fetchSupplements();
  }, [selectedDate]);

  const refreshData = async (date: string) => {
    const { items } = await StorageService.getNutritionForDate(date);
    setLogs(items);
    
    const water = StorageService.getWater(date); // Water still local
    setWaterIntake(water);
  };

  const fetchSupplements = async () => {
      const data = await StorageService.getSupplements();
      setSupplements(data);
  };

  const generateSupplementsStack = async () => {
      if (!profile) return;
      try {
          // 1. Generate with AI
          const newStack = await generateSupplementsAdvice(profile);
          if (newStack.length > 0) {
              // 2. Save to DB
              await StorageService.saveSupplements(newStack);
              // 3. Update State
              setSupplements(newStack);
          }
      } catch (e) {
          console.error("Failed to generate stack", e);
      }
  };

  const changeDate = (date: string) => {
    setSelectedDate(date);
  };

  const logFood = async (food: Omit<FoodLog, 'id' | 'date' | 'meal_type'>, mealType: MealType = 'snack') => {
    // Handle Image Upload if Base64
    let imageUrl = food.image;
    if (food.image && food.image.startsWith('data:')) {
        const uploadedUrl = await StorageService.uploadFoodImage(food.image);
        if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const itemToSave = {
        ...food,
        image: imageUrl, // Save URL instead of Base64
        date: selectedDate,
        meal_type: mealType
    };
    
    // Optimistic Update
    const tempLog: FoodLog = { ...itemToSave, id: Date.now().toString() };
    setLogs(prev => [tempLog, ...prev]);

    try {
        const savedLog = await StorageService.addFoodItem(itemToSave);
        // Replace temp log with real log (optional, but good for ID sync)
        setLogs(prev => prev.map(l => l.id === tempLog.id ? savedLog : l));
    } catch (e) {
        console.error("Failed to save food log", e);
        // Rollback
        setLogs(prev => prev.filter(l => l.id !== tempLog.id));
    }
  };

  const removeFoodLog = async (id: string) => {
    setLogs(prev => prev.filter(item => item.id !== id));
    await StorageService.removeFoodItem(id);
  };

  const logWater = (amount: number) => {
    const newTotal = StorageService.addWater(amount, selectedDate);
    setWaterIntake(newTotal);
  };

  const getDailyStats = () => {
    return logs.reduce((acc, curr) => ({
      calories: acc.calories + curr.calories,
      protein: acc.protein + curr.protein,
      fat: acc.fat + curr.fat,
      carbs: acc.carbs + curr.carbs,
    }), { calories: 0, protein: 0, fat: 0, carbs: 0 });
  };

  return (
    <NutritionContext.Provider value={{ 
      logs, 
      waterIntake, 
      selectedDate,
      supplements,
      logFood, 
      removeFoodLog,
      logWater, 
      getDailyStats,
      changeDate,
      generateSupplementsStack
    }}>
      {children}
    </NutritionContext.Provider>
  );
};

export const useNutrition = () => {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
};
