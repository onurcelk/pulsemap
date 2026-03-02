// FIX 3: Gemini is now called server-side via /api/process
// The API key is NEVER sent to the browser — it stays on the server.
import { MapEvent } from "../types";

export interface RawNewsItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  source: string;
  link?: string;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function processNewsWithGemini(
  newsItems: RawNewsItem[],
  retries = 3
): Promise<MapEvent[]> {
  if (!newsItems.length) return [];

  try {
    const response = await fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: newsItems }),
    });

    if (response.status === 429) {
      if (retries > 0) {
        const waitTime = Math.pow(2, 4 - retries) * 1000 + Math.random() * 1000;
        console.warn(`Rate limit hit. Retrying in ${Math.round(waitTime)}ms...`);
        await delay(waitTime);
        return processNewsWithGemini(newsItems, retries - 1);
      }
      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json() as MapEvent[];
  } catch (error: any) {
    if (error.message === "RATE_LIMIT_EXCEEDED") throw error;
    console.error("processNewsWithGemini error:", error);
    throw error;
  }
}
