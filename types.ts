
import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface UserProfile {
  id?: string;
  name: string;
  age: number;
  gender?: 'male' | 'female';
  weight: number;
  height: number;
  fitness_goal: string;
  injuries: string;
  equipment: string;
  workout_frequency?: number;
  experience_level?: string;
  xp?: number;
  level?: number;
  
  target_calories?: number;
  target_protein?: number;
  target_fat?: number;
  target_carbs?: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type PortionSize = 'snack' | 'standard' | 'hearty' | 'bulking';

export interface LayoutProps {
  children: React.ReactNode;
}

export interface UserSupplement {
  id?: string;
  name: string;
  dosage: string;
  timing: string;
  reason: string;
}

export interface RecipeIngredient {
  name: string;
  amount: number | string;
  unit: string;
}

export interface Recipe {
  id?: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  macros: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  prep_time: number;
  created_at?: string;
}
