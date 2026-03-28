import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export interface AISubtask {
  title: string;
  estimatedDuration?: number;
}

/**
 * Generates a list of subtasks for a given objective using Gemini.
 */
export async function generateSubtasks(objective: string): Promise<AISubtask[]> {
  if (!import.meta.env.VITE_GEMINI_API_KEY ) {
    console.warn("Gemini API key not configured. Falling back to local simulation.");
    return simulateSubtasks(objective);
  }

  try {
    const prompt = `Break down the following productivity objective into 3-5 actionable subtasks. 
    Objective: "${objective}"
    
    Return ONLY a JSON array of objects with the following structure:
    [{"title": "Step 1", "estimatedDuration": 15}, ...]
    
    Keep titles concise and professional. Durations should be in minutes.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Clean potential markdown formatting from AI response
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Generation failed:", error);
    return simulateSubtasks(objective);
  }
}

/**
 * Gets personalized productivity advice based on current app state.
 */
export async function getProductivityAdvice(data: { tasks: any[], habits: any[], sessions: any[] }): Promise<string> {
  if (!import.meta.env.VITE_GEMINI_API_KEY ) {
    return "Keep up the great work! Try breaking your largest task into smaller pieces to gain momentum.";
  }

  try {
    const prompt = `You are a professional productivity coach. Analyze the following user data and provide ONE concise, motivating advice (max 2 sentences).
    
    Tasks: ${JSON.stringify(data.tasks.map(t => ({ title: t.title, status: t.status })))}
    Habits: ${JSON.stringify(data.habits.map(h => ({ name: h.name, streak: h.currentStreak })))}
    Recent Focus Sessions: ${data.sessions.length}
    
    Focus on habit consistency, backlog management, or focus streaks. Be direct but encouraging.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    return "Focus on your most urgent task today to clear the backlog!";
  }
}

/**
 * Parses natural language input into a structured task object using Gemini.
 */
export async function parseCommand(input: string): Promise<{ 
  title: string; 
  dueDate?: string; 
  tags: string[] 
}> {
  if (!import.meta.env.VITE_GEMINI_API_KEY ) {
    return { title: input, tags: [] }; // Fallback
  }

  try {
    const now = new Date().toISOString();
    const prompt = `Parse this task command: "${input}"
    Current time: ${now}
    
    Return ONLY a JSON object:
    {
      "title": "Cleaned task title",
      "dueDate": "ISO8601 string or null",
      "tags": ["tag1", "tag2"]
    }
    
    Handle relative dates (tomorrow, next friday, in 2 hours).`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("NLP Parsing failed:", error);
    return { title: input, tags: [] };
  }
}

/**
 * Fallback simulation logic (previous mock engine)
 */
function simulateSubtasks(objective: string): AISubtask[] {
  const normalized = objective.toLowerCase();
  if (normalized.includes('code') || normalized.includes('build')) {
    return [
      { title: 'Outline architecture', estimatedDuration: 20 },
      { title: 'Core implementation', estimatedDuration: 60 },
      { title: 'Testing & validation', estimatedDuration: 15 }
    ];
  }
  return [
    { title: 'Define specific milestones', estimatedDuration: 10 },
    { title: 'Execute primary action items', estimatedDuration: 30 },
    { title: 'Review and mark as complete', estimatedDuration: 5 }
  ];
}
