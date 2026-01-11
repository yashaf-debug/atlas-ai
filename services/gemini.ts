import { UserSupplement, Recipe, PortionSize } from "../types";

export interface ChatMessage {
  id?: string;
  role: 'user' | 'ai' | 'model';
  text?: string;
  image?: string;
  widget?: any;
  timestamp?: Date;
  isError?: boolean;
}

export interface WeeklyPlanDay {
  id?: string;
  day: string;
  focus: string;
  exercises: any[];
  description?: string;
}

export interface FoodAnalysisResult {
  dish_name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  estimated_weight_grams: number;
  advice: string;
}

// --- CONFIGURATION ---
const MODEL_NAME = 'gemini-2.0-flash-exp';

const getApiConfig = () => {
  const manualKey = typeof window !== 'undefined' ? localStorage.getItem('ATLAS_GEMINI_KEY') : null;
  const apiKey = manualKey || import.meta.env.VITE_GEMINI_API_KEY || "";
  const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;

  // If proxy is set, use it. Otherwise default to Google API.
  // Ensure proxyUrl doesn't have trailing slash if present
  const cleanProxy = proxyUrl ? proxyUrl.replace(/\/$/, '') : 'https://generativelanguage.googleapis.com';

  return { apiKey, baseUrl: cleanProxy };
};

const callGeminiApi = async (method: string, body: any) => {
  const { apiKey, baseUrl } = getApiConfig();

  if (!apiKey) {
    throw new Error("API Key is missing. Check Settings.");
  }

  const url = `${baseUrl}/v1beta/models/${MODEL_NAME}:${method}?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      // Log detailed error from Cloudflare/Proxy
      const errText = await response.text();
      console.error(`Gemini API Error (${response.status}):`, errText);
      console.error(`Request URL was: ${url}`); // Debug URL
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Gemini Fetch Error:", error);
    throw error;
  }
};

export const sendMessageToGemini = async (
  history: ChatMessage[],
  newMessage: string,
  userContext?: string,
  activeWorkoutState?: string,
  historyContext?: string,
  attachedImage?: string,
  statsContext?: string,
  scheduleContext?: string
) => {
  try {
    const BASE_SYSTEM_INSTRUCTION = `
Ты — Atlas, эмпатичный, но строгий и умный фитнес-ментор.
Твоя цель — прогресс пользователя без травм.
Общайся в стиле киберпанк/футуризм, на русском языке.

КРИТИЧЕСКИ ВАЖНО:
1. Если пользователь просит тренировку, план питания или расписание - ты ОБЯЗАН вернуть JSON-виджет.
2. НИКОГДА не выводи служебные строки типа "[System Update:" или внутренний JSON напрямую.
3. Твой ответ должен содержать:
   - Обычный текст (приветствие, пояснение)
   - JSON блок в тройных обратных кавычках

Формат JSON блока (СТРОГО):
\`\`\`json
{
  "type": "workout_plan" | "weekly_plan" | "nutrition_plan",
  "data": { ... }
}
\`\`\`

Пример для тренировки:
\`\`\`json
{
  "type": "workout_plan",
  "data": {
    "title": "Грудь + Трицепс",
    "exercises": [...]
  }
}
\`\`\`

Пример для недельного плана:
\`\`\`json
{
  "type": "weekly_plan",
  "data": [
    {"day": "Понедельник", "focus": "Грудь", "exercises": [...]},
    {"day": "Среда", "focus": "Спина", "exercises": [...]},
    {"day": "Пятница", "focus": "Ноги", "exercises": [...]}
  ]
}
\`\`\`
ВАЖНО: data для weekly_plan ДОЛЖЕН быть массивом объектов, не вложенным в другой объект!
`;
    let contextBlock = "";
    if (userContext) contextBlock += `\n\n=== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ===\n${userContext}`;
    if (scheduleContext) contextBlock += `\n\n=== РАСПИСАНИЕ ===\n${scheduleContext}`;
    if (statsContext) contextBlock += `\n\n=== СТАТИСТИКА ===\n${statsContext}`;
    if (historyContext) contextBlock += `\n\n=== ИСТОРИЯ ===\n${historyContext}`;
    if (activeWorkoutState) contextBlock += `\n\n=== ТЕКУЩАЯ ТРЕНИРОВКА ===\n${activeWorkoutState}`;

    // Add explicit instruction reminder if user asks for workout
    const isWorkoutRequest = newMessage.toLowerCase().includes('тренир') ||
      newMessage.toLowerCase().includes('программ') ||
      newMessage.toLowerCase().includes('план') ||
      newMessage.toLowerCase().includes('упражнен');

    if (isWorkoutRequest) {
      contextBlock += `\n\n⚠️ ВНИМАНИЕ: Пользователь просит тренировку. Ты ОБЯЗАН вернуть JSON-виджет в формате:\n\`\`\`json\n{"type": "workout_plan", "data": {...}}\n\`\`\`\nБез JSON-блока тренировка НЕ СОХРАНИТСЯ!`;
    }

    const finalSystemInstruction = BASE_SYSTEM_INSTRUCTION + contextBlock;

    const contents: any[] = history
      .filter(msg => msg.text || msg.widget || msg.image)
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [
          { text: msg.text || "" },
          // Don't inject [System Update:] - just store widget data invisibly
          ...(msg.widget ? [{ text: `\n[Workout Data Saved]\n` }] : [])
        ]
      }));

    const currentUserParts: any[] = [];
    if (newMessage) currentUserParts.push({ text: newMessage });
    if (attachedImage) {
      const base64Data = attachedImage.replace(/^data:image\/\w+;base64,/, "");
      const mimeType = attachedImage.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";
      currentUserParts.push({ inlineData: { mimeType, data: base64Data } });
    }
    contents.push({ role: 'user', parts: currentUserParts });

    const data = await callGeminiApi('generateContent', {
      contents: contents,
      systemInstruction: { parts: [{ text: finalSystemInstruction }] },
      generationConfig: {
        temperature: 0.7
      }
    });

    // Parse Response
    const candidate = data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text || "";

    let textContent = rawText;
    let widgetContent = null;
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = rawText.match(jsonBlockRegex);

    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (['workout_plan', 'weekly_plan', 'nutrition_plan'].includes(parsed.type)) {
          widgetContent = parsed;
          textContent = rawText.replace(match[0], '').trim();
        }
      } catch (e) { }
    }

    return { role: 'ai', text: textContent, widget: widgetContent, timestamp: new Date() };
  } catch (error: any) {
    console.error("Gemini Logic Error:", error);
    return { role: 'ai', text: "Сбой связи с нейросетью. Проверьте настройки прокси или VPN.", timestamp: new Date(), isError: true };
  }
};

export const generateRecipe = async (
  ingredients: string,
  mealType: string,
  time: number,
  portionSize: PortionSize = 'standard',
  userRemainingMacros?: { calories: number; protein: number; fat: number; carbs: number }
): Promise<Recipe> => {
  const macrosBlock = userRemainingMacros
    ? `Оставшиеся макросы пользователя на сегодня: ${userRemainingMacros.calories} ккал (Б:${userRemainingMacros.protein}г, Ж:${userRemainingMacros.fat}г, У:${userRemainingMacros.carbs}г).`
    : "Пользователь не указал лимиты, приготовь сбалансированное блюдо.";

  const portionInstructions: Record<PortionSize, string> = {
    snack: "Размер порции: Легкий перекус (небольшой объем, низкая калорийность).",
    standard: "Размер порции: Стандарт (средняя порция для взрослого человека).",
    hearty: "Размер порции: Сытный обед (увеличенный объем, высокая питательность).",
    bulking: "Размер порции: Набор массы (максимально калорийно и белково)."
  };

  const prompt = `Ты — профессиональный Шеф-повар и Спортивный нутрициолог.
Твоя задача — придумать вкусный и полезный рецепт из ограниченного набора продуктов.
Отвечай исключительно на РУССКОМ языке (названия ингредиентов, описание, шаги).

ВХОДНЫЕ ДАННЫЕ:
- Продукты: ${ingredients}
- Тип: ${mealType}
- Время: ${time} мин
- ${portionInstructions[portionSize]}
- ${macrosBlock}

ПРАВИЛА АДЕКВАТНОСТИ ПОРЦИЙ:
1. ОГРАНИЧЕНИЕ: Даже если остаток КБЖУ большой, один прием пищи НЕ должен превышать 35-40% от дневной нормы (ориентир 800-900 ккал), если только не выбран режим 'Набор массы'. Не пытайся закрыть весь дневной остаток за один раз.
2. РЕАЛИЗМ: Используй реалистичные граммовки для одного человека (хлеб: 30-60г, яйца: 2-3 шт, крупы: 60-80г в сухом виде).
3. БАЛАНС: Если включен учет макросов, старайся попасть в ПРОПОРЦИИ (соотношение БЖУ), отдавая приоритет белку. Если остаток слишком велик, лучше оставить дефицит, чем предлагать порцию в 1.5 кг еды.

ТРЕБОВАНИЯ К ОТВЕТУ:
1. Рецепт должен быть реальным и вкусным.
2. Граммовки должны быть точными.
3. Если сгенерированный рецепт выходит > 1000 ккал (и это не режим набора массы), пересчитай граммовки в меньшую сторону.
4. Формат ответа СТРОГО JSON:
{
  "name": "Название блюда",
  "description": "Краткое аппетитное описание",
  "prep_time": 30,
  "ingredients": [ {"name": "Продукт", "amount": 200, "unit": "г"} ],
  "steps": ["Шаг 1", "Шаг 2"],
  "macros": { "calories": 500, "protein": 40, "fat": 15, "carbs": 50 }
}`;

  const data = await callGeminiApi('generateContent', {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          description: { type: "STRING" },
          prep_time: { type: "INTEGER" },
          ingredients: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                amount: { type: "NUMBER" },
                unit: { type: "STRING" }
              },
              required: ["name", "amount", "unit"]
            }
          },
          steps: { type: "ARRAY", items: { type: "STRING" } },
          macros: {
            type: "OBJECT",
            properties: {
              calories: { type: "INTEGER" },
              protein: { type: "INTEGER" },
              fat: { type: "INTEGER" },
              carbs: { type: "INTEGER" }
            },
            required: ["calories", "protein", "fat", "carbs"]
          }
        },
        required: ["name", "description", "prep_time", "ingredients", "steps", "macros"]
      }
    }
  });

  const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
  return parsed as Recipe;
};

export const analyzeFoodImage = async (base64Image: string): Promise<FoodAnalysisResult> => {
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  const mimeType = base64Image.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";

  const data = await callGeminiApi('generateContent', {
    contents: [
      {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Проанализируй питательную ценность этой еды. Определи название блюда, калории и макросы. Дай короткий совет по полезности на РУССКОМ языке. Верни JSON." }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          dish_name: { type: "STRING", description: "Название блюда на русском" },
          calories: { type: "NUMBER" },
          protein: { type: "NUMBER" },
          fat: { type: "NUMBER" },
          carbs: { type: "NUMBER" },
          estimated_weight_grams: { type: "NUMBER" },
          advice: { type: "STRING", description: "Короткий совет нутрициолога на русском языке" }
        },
        required: ["dish_name", "calories", "protein", "fat", "carbs", "estimated_weight_grams", "advice"]
      }
    }
  });

  return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}") as FoodAnalysisResult;
};

export const analyzeFoodText = async (text: string): Promise<FoodAnalysisResult> => {
  const data = await callGeminiApi('generateContent', {
    contents: [{ parts: [{ text: `Оцени питательную ценность (КБЖУ) для: "${text}". Название и совет должны быть на РУССКОМ языке. Верни JSON.` }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          dish_name: { type: "STRING", description: "Название блюда на русском" },
          calories: { type: "NUMBER" },
          protein: { type: "NUMBER" },
          fat: { type: "NUMBER" },
          carbs: { type: "NUMBER" },
          estimated_weight_grams: { type: "NUMBER" },
          advice: { type: "STRING", description: "Короткий совет нутрициолога на русском языке" }
        },
        required: ["dish_name", "calories", "protein", "fat", "carbs", "estimated_weight_grams", "advice"]
      }
    }
  });

  return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}") as FoodAnalysisResult;
};

export const generateSupplementsAdvice = async (profile: any): Promise<UserSupplement[]> => {
  const prompt = `Порекомендуй научный стек спортивных добавок для пользователя: цель "${profile.fitness_goal}", вес ${profile.weight}кг. Верни JSON массив. Все поля должны быть на РУССКОМ языке.`;

  const data = await callGeminiApi('generateContent', {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Название добавки на русском (или общепринятое)" },
            dosage: { type: "STRING", description: "Дозировка на русском" },
            timing: { type: "STRING", description: "Время приема на русском" },
            reason: { type: "STRING", description: "Причина приема на русском" }
          },
          required: ["name", "dosage", "timing", "reason"]
        }
      }
    }
  });

  return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || "[]") as UserSupplement[];
};
