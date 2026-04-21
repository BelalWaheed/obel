import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

function isValidApiKey(key: string | undefined): boolean {
  return !!key && key !== "YOUR_API_KEY" && key !== "";
}

// Session-based Circuit Breaker for AI to prevent console 404 spam
let model: GenerativeModel | null = null;
let isAiServiceUnavailable = false;

if (isValidApiKey(API_KEY)) {
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  } catch (err: unknown) {
    console.error("AI Model Init Failed:", err);
    isAiServiceUnavailable = true;
  }
}

export interface AISubtask {
  title: string;
  estimatedDuration?: number;
}

/**
 * Helper to safely call Gemini and trigger circuit breaker on failure
 */
async function safeCall(prompt: string): Promise<string> {
  if (!model || isAiServiceUnavailable) throw new Error("AI disabled");

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: unknown) {
    // If we get a 404/403/401, disable AI for this session
    if (error instanceof Error && (
      error.message?.includes("404") || 
      error.message?.includes("403") || 
      error.message?.includes("401")
    )) {
      isAiServiceUnavailable = true;
    }
    throw error;
  }
}

/**
 * Generates a list of subtasks for a given task using Gemini.
 */
export async function generateSubtasks(task: string): Promise<AISubtask[]> {
  if (!model || isAiServiceUnavailable) {
    return simulateSubtasks(task);
  }

  try {
    const prompt = `Break down the following productivity task into 3-5 actionable subtasks. 
    Task: "${task}"
    
    Return ONLY a JSON array of objects with the following structure:
    [{"title": "Step 1", "estimatedDuration": 15}, ...]
    
    Keep titles concise and professional. Durations should be in minutes.`;

    const text = await safeCall(prompt);
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch {
    return simulateSubtasks(task);
  }
}

/**
 * Gets personalized productivity advice based on current app state.
 */
export async function getProductivityAdvice(data: { 
  tasks: { title: string; status: string }[], 
  habits: { name: string; currentStreak: number }[], 
  sessions: unknown[] 
}): Promise<string> {
  if (!model || isAiServiceUnavailable) {
    return "Focus on your most urgent task today to clear the backlog!";
  }

  try {
    const prompt = `You are a professional productivity coach. Analyze the following user data and provide ONE concise, motivating advice (max 2 sentences).
    
    Tasks: ${JSON.stringify(data.tasks.map(t => ({ title: t.title, status: t.status })))}
    Habits: ${JSON.stringify(data.habits.map(h => ({ name: h.name, streak: h.currentStreak })))}
    Recent Focus Sessions: ${data.sessions.length}
    
    Focus on habit consistency, backlog management, or focus streaks. Be direct but encouraging.`;

    const text = await safeCall(prompt);
    return text.trim();
  } catch {
    return "Keep up the great work! Try breaking your largest task into smaller pieces to gain momentum.";
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
  if (!model || isAiServiceUnavailable) {
    return { title: input, tags: [] };
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

    const text = await safeCall(prompt);
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch {
    return { title: input, tags: [] };
  }
}

/**
 * Fallback simulation logic
 */
function simulateSubtasks(task: string): AISubtask[] {
  const normalized = task.toLowerCase();
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
