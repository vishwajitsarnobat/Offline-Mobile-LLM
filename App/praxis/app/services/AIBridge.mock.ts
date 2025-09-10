// src/services/AIBridge.mock.ts

import { Message } from './DatabaseService';

// This object simulates the native C++ modules.
// The functions are async and have artificial delays to mimic real-world performance.
export const NativeAI = {
  /**
   * Simulates the LLM generating a response.
   * @param prompt The full prompt string.
   * @param history The conversation history.
   * @returns A promise that resolves to the assistant's response string.
   */
  generateResponse: async (prompt: string, history: Message[]): Promise<string> => {
    console.log(`[Mock AI] Received prompt: "${prompt.slice(0, 100)}..."`);
    console.log(`[Mock AI] Received history with ${history.length} messages.`);

    // Simulate network/processing latency
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

    // In a real scenario, the model would be fine-tuned to return JSON.
    // Here, we simulate that structured response.
    const mockResponse = {
      response_text: `This is a mocked response to your query: "${prompt}". The time is ${new Date().toLocaleTimeString()}.`,
      safety_warning:
        Math.random() > 0.8 ? 'This is a sample safety warning. Always exercise caution.' : null,
      actionable_steps: ['This is the first simulated step.', 'This is the second simulated step.'],
      confidence_score: Math.random() * (0.95 - 0.75) + 0.75,
    };

    // For simplicity in the MVP, we'll just return the main text.
    // The ChatService will eventually be updated to handle the full JSON.
    return mockResponse.response_text;
  },

  /**
   * Simulates the RAG system fetching relevant documents.
   * @param query The user's query text.
   * @returns An array of relevant text chunks.
   */
  performRAGSearch: async (query: string): Promise<string[]> => {
    console.log(`[Mock RAG] Searching for: "${query}"`);
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (query.toLowerCase().includes('cpr')) {
      return [
        'Chunk 1: For CPR, start by checking the scene for safety...',
        'Chunk 2: Administer 30 chest compressions...',
      ];
    }
    return ['This is a relevant chunk of text from the offline knowledge base.'];
  },
};
