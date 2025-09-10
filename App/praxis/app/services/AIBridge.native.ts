// src/services/AIBridge.native.ts

// This declares the global variable that our C++ code will install.
declare global {
  var NativeAI: {
    helloWorld: (name: string) => string;
  };
}

// We can do a check to ensure the native module was installed correctly.
if (!global.NativeAI) {
  throw new Error('The native AI module is not available. Please check the JSI installation.');
}

// We export the global object so other files can import it with type safety.
export const NativeAIBridge = global.NativeAI;
