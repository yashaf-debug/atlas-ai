
import { supabase } from './supabase';
import { UserProfile, UserSupplement, Recipe } from '../types';
import { WeeklyPlanDay } from './gemini';
import { WorkoutSession } from '../context/WorkoutContext';
import { FoodLog } from '../context/NutritionContext';
import { DailyStatus, WeightEntry } from '../context/ProfileContext';

const KEYS = {
  API_KEY: 'atlas_gemini_api_key',
  WATER: 'atlas_water_logs',
  DAILY_STATUS: 'atlas_daily_status',
  WEIGHT_HISTORY: 'atlas_weight_history'
};

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const StorageService = {
  getApiKey: (): string | null => localStorage.getItem(KEYS.API_KEY),
  saveApiKey: (key: string) => localStorage.setItem(KEYS.API_KEY, key),

  // --- SUPABASE: Recipes (AI Chef) ---

  saveRecipe: async (recipe: Omit<Recipe, 'id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Map frontend "Recipe" to DB "saved_recipes" schema
    const dbPayload = {
      user_id: user.id,
      title: recipe.name,
      desc: recipe.description || '', // Try 'desc' instead of 'description'
      instructions: recipe.steps,
      // Convert objects to strings for TEXT[] column
      ingredients: recipe.ingredients.map(i => `${i.name} (${i.amount} ${i.unit})`),
      macro_info: recipe.macros
    };

    const { data, error } = await supabase
      .from('saved_recipes')
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error("Error saving recipe:", error);
      console.error("Payload was:", dbPayload); // Debug payload
      throw error;
    }
    // Return compatible Recipe type for state update
    return {
      ...recipe,
      id: data.id,
      created_at: data.created_at
    } as Recipe;
  },

  getSavedRecipes: async (): Promise<Recipe[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('saved_recipes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching recipes:", error);
      return [];
    }
    return data || [];
  },

  deleteRecipe: async (id: string) => {
    const { error } = await supabase
      .from('saved_recipes')
      .delete()
      .eq('id', id);
    if (error) console.error("Error deleting recipe:", error);
  },

  // --- SUPABASE: Chat History ---
  getChatHistory: async (limit: number = 10, offset: number = 0): Promise<any[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return [];
    return data.reverse().map(msg => ({
      id: msg.id,
      role: msg.role,
      text: msg.content,
      image: msg.image_url,
      widget: msg.meta_data,
      timestamp: new Date(msg.created_at)
    }));
  },

  addChatMessage: async (message: { role: 'user' | 'ai', text?: string, image?: string, widget?: any }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let publicUrl = null;
    if (message.image && message.image.startsWith('data:')) {
      try {
        const base64Response = await fetch(message.image);
        const blob = await base64Response.blob();
        const fileName = `chat/${user.id}/${Date.now()}.jpg`;
        await supabase.storage.from('chat-images').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
        const { data } = supabase.storage.from('chat-images').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      } catch (e) { }
    }

    const { error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      role: message.role,
      content: message.text || '',
      meta_data: message.widget || null,
      image_url: publicUrl,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error("Error adding chat message:", error);
      throw error;
    }
  },

  // --- SUPABASE: Scheduled Workouts ---
  saveScheduledWorkout: async (workoutData: { title: string, exercises: any[], date?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const targetDate = workoutData.date || getLocalDateString();
    await supabase.from('scheduled_workouts').delete().eq('user_id', user.id).eq('date', targetDate);
    await supabase.from('scheduled_workouts').insert({
      user_id: user.id,
      date: targetDate,
      title: workoutData.title,
      exercises: workoutData.exercises,
      is_completed: false
    });
  },

  saveWeeklyPlan: async (plan: WeeklyPlanDay[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Validate input
    if (!Array.isArray(plan)) {
      console.error("saveWeeklyPlan: plan is not an array", plan);
      throw new Error("Weekly plan must be an array of days");
    }

    const today = new Date();
    const dbPayload = [];
    const daysMap: { [key: string]: number } = { 'воскресенье': 0, 'понедельник': 1, 'вторник': 2, 'среда': 3, 'четверг': 4, 'пятница': 5, 'суббота': 6 };

    for (const dayPlan of plan) {
      const dayIndex = daysMap[dayPlan.day.toLowerCase().trim()];
      if (dayIndex === undefined) continue;
      let daysUntil = (dayIndex + 7 - today.getDay()) % 7;
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + daysUntil);
      dbPayload.push({
        user_id: user.id,
        date: getLocalDateString(targetDate),
        title: dayPlan.focus || 'Тренировка',
        exercises: dayPlan.exercises,
        is_completed: false
      });
    }

    if (dbPayload.length > 0) {
      const targetDates = dbPayload.map(p => p.date);
      await supabase.from('scheduled_workouts').delete().eq('user_id', user.id).in('date', targetDates);
      await supabase.from('scheduled_workouts').insert(dbPayload);
    }
  },

  getWeeklyPlan: async (): Promise<WeeklyPlanDay[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get workouts for the entire week (7 days from today, including past days in current week)
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Go to Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 13); // 2 weeks ahead

    const { data } = await supabase
      .from('scheduled_workouts')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', getLocalDateString(startOfWeek))
      .lte('date', getLocalDateString(endOfWeek))
      .eq('is_completed', false)
      .order('date', { ascending: true });

    if (!data) return [];
    const daysMapReverse = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return data.map(item => ({
      id: item.id,
      day: daysMapReverse[new Date(item.date).getDay()] + ` (${new Date(item.date).getDate()}.${new Date(item.date).getMonth() + 1})`,
      focus: item.title,
      exercises: item.exercises,
      description: item.description
    }));
  },

  deleteScheduledWorkout: async (id: string) => {
    await supabase.from('scheduled_workouts').delete().eq('id', id);
  },

  getUpcomingSchedule: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const { data } = await supabase.from('scheduled_workouts').select('date, title, exercises').eq('user_id', user.id).gte('date', getLocalDateString()).lte('date', getLocalDateString(nextWeek)).order('date', { ascending: true });
    return data || [];
  },

  // --- SUPABASE: User Profile ---
  getUserProfile: async (): Promise<UserProfile | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return data as UserProfile;
  },

  saveUserProfile: async (profile: UserProfile) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').upsert({
      id: user.id,
      ...profile,
      age: Number(profile.age),
      weight: Number(profile.weight),
      height: Number(profile.height),
      workout_frequency: Number(profile.workout_frequency),
      xp: Number(profile.xp || 0),
      level: Number(profile.level || 1)
    });
  },

  // --- SUPABASE: Workouts History ---
  getWorkouts: async (): Promise<WorkoutSession[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from('workouts').select('*').eq('user_id', user.id).order('date', { ascending: false });
    return data || [];
  },

  saveWorkout: async (workout: Omit<WorkoutSession, 'id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const dateOnly = workout.date.split('T')[0];
    const nextDay = new Date(dateOnly);
    nextDay.setDate(nextDay.getDate() + 1);
    const { data: existing } = await supabase.from('workouts').select('id').eq('user_id', user.id).gte('date', dateOnly).lt('date', nextDay.toISOString().split('T')[0]).eq('title', workout.title);

    if (existing && existing.length > 0) {
      await supabase.from('workouts').update({ duration: workout.duration, volume: workout.volume, exercises: workout.exercises, rpe: workout.rpe }).eq('id', existing[0].id);
    } else {
      await supabase.from('workouts').insert({ user_id: user.id, date: workout.date, title: workout.title, duration: workout.duration, volume: workout.volume, exercises: workout.exercises, rpe: workout.rpe });
    }
    await supabase.from('scheduled_workouts').update({ is_completed: true }).eq('user_id', user.id).eq('date', dateOnly).ilike('title', `%${workout.title}%`);
  },

  deleteWorkoutHistory: async (id: string) => {
    await supabase.from('workouts').delete().eq('id', id);
  },

  // --- SUPABASE: Nutrition ---
  getNutritionForDate: async (dateString: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { items: [], totals: { calories: 0, protein: 0, fat: 0, carbs: 0 } };
    const { data } = await supabase.from('nutrition_logs').select('*').eq('user_id', user.id).eq('date', dateString).order('id', { ascending: false });
    const items = (data || []) as FoodLog[];
    const totals = items.reduce((acc, curr) => ({
      calories: acc.calories + (curr.calories || 0),
      protein: acc.protein + (curr.protein || 0),
      fat: acc.fat + (curr.fat || 0),
      carbs: acc.carbs + (curr.carbs || 0),
    }), { calories: 0, protein: 0, fat: 0, carbs: 0 });
    return { items, totals };
  },

  addFoodItem: async (item: Omit<FoodLog, 'id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");
    const { data } = await supabase.from('nutrition_logs').insert({ user_id: user.id, ...item }).select().single();
    return data as FoodLog;
  },

  removeFoodItem: async (id: string) => {
    await supabase.from('nutrition_logs').delete().eq('id', id);
  },

  uploadFoodImage: async (base64Image: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const base64Response = await fetch(base64Image);
      const blob = await base64Response.blob();
      const fileName = `${user.id}/${Date.now()}.jpg`;
      await supabase.storage.from('food-images').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('food-images').getPublicUrl(fileName);
      return publicUrl;
    } catch (e) { return null; }
  },

  // --- SUPABASE: Supplements ---
  getSupplements: async (): Promise<UserSupplement[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from('user_supplements').select('*').eq('user_id', user.id);
    return data || [];
  },

  saveSupplements: async (supplements: UserSupplement[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_supplements').delete().eq('user_id', user.id);
    const payload = supplements.map(s => ({ user_id: user.id, name: s.name, dosage: s.dosage, timing: s.timing, reason: s.reason }));
    if (payload.length > 0) await supabase.from('user_supplements').insert(payload);
  },

  // --- SUPABASE: Daily Metrics ---
  saveDailyMetric: async (metric: { date: string, sleep_hours: number, sleep_quality: string, energy_level: number, stress_level?: number }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('daily_metrics').upsert({
      user_id: user.id,
      date: metric.date,
      sleep_hours: metric.sleep_hours,
      sleep_quality: metric.sleep_quality,
      energy_level: metric.energy_level,
      stress_level: metric.stress_level // Added stress
    }, { onConflict: 'user_id,date' });
    if (error) {
      console.error("Error saving daily metric:", error);
      throw error;
    }
  },

  getDailyMetric: async (dateString: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('daily_metrics').select('*').eq('user_id', user.id).eq('date', dateString).single();
    return data;
  },

  saveBodyMeasurement: async (weight: number, otherMetrics?: { chest?: number, waist?: number, hips?: number }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('body_measurements').upsert({ user_id: user.id, date: getLocalDateString(), weight, ...otherMetrics }, { onConflict: 'user_id,date' });
    if (error) {
      console.error("Error saving body measurement:", error);
      throw error;
    }
  },

  // --- LOCAL ---
  getDailyStatus: (): DailyStatus | null => {
    const data = localStorage.getItem(KEYS.DAILY_STATUS);
    return data ? JSON.parse(data) : null;
  },
  saveDailyStatus: (status: DailyStatus) => localStorage.setItem(KEYS.DAILY_STATUS, JSON.stringify(status)),
  getWeightHistory: (): WeightEntry[] => {
    const data = localStorage.getItem(KEYS.WEIGHT_HISTORY);
    return data ? JSON.parse(data) : [];
  },
  saveWeightHistory: (history: WeightEntry[]) => localStorage.setItem(KEYS.WEIGHT_HISTORY, JSON.stringify(history)),
  getWater: (dateString: string): number => {
    const data = localStorage.getItem(KEYS.WATER);
    const waterMap = data ? JSON.parse(data) : {};
    return waterMap[dateString] || 0;
  },
  addWater: (amount: number, dateString: string) => {
    const data = localStorage.getItem(KEYS.WATER);
    const waterMap = data ? JSON.parse(data) : {};
    waterMap[dateString] = (waterMap[dateString] || 0) + amount;
    localStorage.setItem(KEYS.WATER, JSON.stringify(waterMap));
    return waterMap[dateString];
  },

  clearAll: async () => {
    localStorage.clear();
    await supabase.auth.signOut();
  },

  resetAccount: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const uid = user.id;
    try {
      await supabase.from('chat_messages').delete().eq('user_id', uid);
      await supabase.from('nutrition_logs').delete().eq('user_id', uid);
      await supabase.from('scheduled_workouts').delete().eq('user_id', uid);
      await supabase.from('workouts').delete().eq('user_id', uid);
      await supabase.from('daily_metrics').delete().eq('user_id', uid);
      await supabase.from('body_measurements').delete().eq('user_id', uid);
      await supabase.from('user_supplements').delete().eq('user_id', uid);
      await supabase.from('saved_recipes').delete().eq('user_id', uid);
      await supabase.from('profiles').delete().eq('id', uid);
      localStorage.clear();
      window.location.href = '/';
    } catch (e) {
      localStorage.clear();
      window.location.href = '/';
    }
  }
};
