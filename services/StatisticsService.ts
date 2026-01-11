
import { supabase } from './supabase';
import { StorageService } from './storage';

export interface ChartDataPoint {
  name: string; // Date label (e.g., 'Mon' or '12.05')
  value: number; // The main metric
  secondary?: number; // Optional secondary metric
}

export interface PersonalRecord {
  exercise: string;
  weight: number;
}

export const StatisticsService = {
  
  /**
   * Fetches weight history from 'body_measurements'.
   * REMOVED MOCK DATA GENERATION.
   */
  getWeightHistory: async (userId: string): Promise<ChartDataPoint[]> => {
    try {
      // 1. Try to fetch real data
      const { data, error } = await supabase
        .from('body_measurements')
        .select('date, weight')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .limit(30);

      if (!error && data && data.length > 0) {
        return data.map(item => ({
          name: new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
          value: Number(item.weight)
        }));
      }

      // If no data, return empty array (User request: No invented charts)
      return [];
    } catch (e) {
      console.error("Error fetching weight stats:", e);
      return [];
    }
  },

  /**
   * Fetches workout volume (tonnage) for the last 10 workouts.
   */
  getWorkoutVolumeHistory: async (userId: string): Promise<ChartDataPoint[]> => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('date, volume, title')
        .eq('user_id', userId)
        .order('date', { ascending: true }) // Oldest first for chart line L->R
        .limit(10);

      if (error || !data || data.length === 0) return [];

      return data.map(w => ({
        name: new Date(w.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        value: w.volume,
      }));
    } catch (e) {
      console.error("Error fetching volume stats:", e);
      return [];
    }
  },

  /**
   * Calculates Consistency: Workouts per week for the last 4 weeks.
   */
  getConsistencyData: async (userId: string): Promise<ChartDataPoint[]> => {
    try {
      const today = new Date();
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(today.getDate() - 28);

      const { data, error } = await supabase
        .from('workouts')
        .select('date')
        .eq('user_id', userId)
        .gte('date', fourWeeksAgo.toISOString());

      if (error || !data) return [];

      // Initialize buckets for 4 weeks
      const weeks = [0, 0, 0, 0];
      
      data.forEach(w => {
        const wDate = new Date(w.date);
        const diffTime = Math.abs(today.getTime() - wDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7) weeks[3]++;      // Current week
        else if (diffDays <= 14) weeks[2]++;
        else if (diffDays <= 21) weeks[1]++;
        else if (diffDays <= 28) weeks[0]++;
      });

      return [
        { name: 'Неделя 1', value: weeks[0] },
        { name: 'Неделя 2', value: weeks[1] },
        { name: 'Неделя 3', value: weeks[2] },
        { name: 'Эта неделя', value: weeks[3] },
      ];
    } catch (e) {
      console.error("Error fetching consistency:", e);
      return [];
    }
  },

  /**
   * Finds the single heaviest lift across all history.
   */
  getPersonalRecord: async (userId: string): Promise<PersonalRecord | null> => {
      try {
          const { data, error } = await supabase
            .from('workouts')
            .select('exercises')
            .eq('user_id', userId);

          if (error || !data) return null;

          let maxWeight = 0;
          let bestExercise = "";

          data.forEach((workout: any) => {
              if (Array.isArray(workout.exercises)) {
                  workout.exercises.forEach((ex: any) => {
                      if (ex.completed) {
                          // Try to parse weight from string like "100kg" or number 100
                          const valStr = String(ex.actualWeight || ex.weight || "0");
                          const match = valStr.match(/(\d+)/);
                          const weightVal = match ? parseInt(match[0]) : 0;

                          if (weightVal > maxWeight) {
                              maxWeight = weightVal;
                              bestExercise = ex.name;
                          }
                      }
                  });
              }
          });

          if (maxWeight > 0) {
              return { exercise: bestExercise, weight: maxWeight };
          }
          return null;

      } catch (e) {
          console.error("Error calculating PR:", e);
          return null;
      }
  }
};
