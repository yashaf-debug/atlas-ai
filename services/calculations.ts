
import { UserProfile } from "../types";

export const NutritionCalculator = {
  /**
   * Calculates daily calorie and macro targets based on Mifflin-St Jeor Equation.
   */
  calculateTargets: (profile: UserProfile) => {
    const { weight, height, age, gender, workout_frequency, fitness_goal } = profile;

    // 1. Calculate BMR (Basal Metabolic Rate)
    // Formula: (10 × weight) + (6.25 × height) - (5 × age) + S
    // S = +5 for men, -161 for women
    let s_factor = 5;
    if (gender === 'female') {
      s_factor = -161;
    }
    
    // Safety fallback for zeroes to prevent NaN
    const safeWeight = weight || 70;
    const safeHeight = height || 170;
    const safeAge = age || 25;

    const bmr = (10 * safeWeight) + (6.25 * safeHeight) - (5 * safeAge) + s_factor;

    // 2. Activity Multiplier (TDEE) based on workout frequency
    // 0-2: Sedentary/Light (1.2 - 1.375)
    // 3-4: Moderate (1.55)
    // 5+: Active (1.725)
    let activityMultiplier = 1.2;
    const freq = workout_frequency || 3;
    
    if (freq <= 2) activityMultiplier = 1.375;
    else if (freq <= 4) activityMultiplier = 1.55;
    else activityMultiplier = 1.725;

    const tdee = bmr * activityMultiplier;

    // 3. Goal Adjustment
    // Weight Loss: -20%
    // Muscle Gain: +10%
    // Maintenance/Strength: 0%
    let targetCalories = tdee;
    const goalLower = fitness_goal.toLowerCase();

    if (goalLower.includes('похудение') || goalLower.includes('loss') || goalLower.includes('сушка')) {
        targetCalories = tdee * 0.80; // 20% deficit
    } else if (goalLower.includes('мышцы') || goalLower.includes('gain') || goalLower.includes('набор')) {
        targetCalories = tdee * 1.10; // 10% surplus
    }
    // "Сила" defaults to maintenance (tdee)

    // Round calories
    targetCalories = Math.round(targetCalories);

    // 4. Macro Calculation
    // Protein: 2g per kg of bodyweight
    // Fat: 0.8g per kg of bodyweight
    // Carbs: Remaining calories
    
    const targetProtein = Math.round(2 * safeWeight);
    const targetFat = Math.round(0.8 * safeWeight);
    
    // 1g Protein = 4 kcal, 1g Fat = 9 kcal
    const caloriesFromProtein = targetProtein * 4;
    const caloriesFromFat = targetFat * 9;
    
    const remainingCalories = targetCalories - (caloriesFromProtein + caloriesFromFat);
    // 1g Carbs = 4 kcal. Ensure non-negative.
    const targetCarbs = Math.max(0, Math.round(remainingCalories / 4));

    return {
      target_calories: targetCalories,
      target_protein: targetProtein,
      target_fat: targetFat,
      target_carbs: targetCarbs
    };
  }
};
