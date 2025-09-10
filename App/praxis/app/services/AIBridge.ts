// src/services/AIBridge.ts

let bridge;

// Check if the global NativeAI object was injected by the C++ code.
// This is a cleaner check than a try-catch on a require statement.
if (global.NativeAI) {
  bridge = global.NativeAI;
  console.log('[AIBridge] Native implementation loaded.');
} else {
  // If not, we are in Expo Go or another environment, so we fall back to the mock.
  console.warn('[AIBridge] Native module not found. Falling back to mock implementation.');
  const { NativeAI } = require('./AIBridge.mock');
  bridge = NativeAI;
}

// We still need to type it for the rest of the app.
interface AIBridgeInterface {
  helloWorld: (name: string) => string;
  // Add other function types here later
}

export const AIBridge: AIBridgeInterface = bridge;
