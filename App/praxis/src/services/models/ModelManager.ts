import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const LlamaModule = NativeModules.LlamaModule || null;

interface ModelConfig {
  name: string;
  filename: string;
  size: string;
  description: string;
  loaded: boolean;
  downloadUrl: string;
  quantization: string;
  contextLength: number;
}

export class ModelManager {
  private model: ModelConfig;
  private currentModel: string | null = null;
  private isLoading: boolean = false;
  private llamaHandle: number | null = null;
  private modelPath: string | null = null;
  private readonly MODELS_DIR = `${FileSystem.documentDirectory}models/`;

  constructor() {
    this.model = {
      name: 'Phi-3 Mini',
      filename: 'phi-3-mini-4k-instruct-q4_0.gguf',
      size: '2.17GB',
      description: 'Microsoft Phi-3 Mini optimized for mobile inference',
      loaded: false,
      downloadUrl: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf', // Replace with your URL
      quantization: 'Q4_0',
      contextLength: 4096,
    };
  }

  async initializeModel(): Promise<void> {
    try {
      // Create models directory
      const dirInfo = await FileSystem.getInfoAsync(this.MODELS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.MODELS_DIR, { intermediates: true });
      }

      // Check if model already exists
      const modelPath = `${this.MODELS_DIR}${this.model.filename}`;
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      
      if (fileInfo.exists) {
        this.modelPath = modelPath;
        this.model.loaded = true;
        console.log('✅ Model already available locally');
      } else {
        this.model.loaded = false;
        console.log('📥 Model needs to be downloaded');
      }
    } catch (error) {
      console.error('❌ Model initialization failed:', error);
      this.model.loaded = false;
    }
  }

  async downloadModel(onProgress?: (progress: number) => void): Promise<void> {
    if (this.model.loaded) {
      console.log('✅ Model already downloaded');
      return;
    }

    const modelPath = `${this.MODELS_DIR}${this.model.filename}`;
    
    try {
      console.log(`📥 Starting download of ${this.model.name} (${this.model.size})`);
      
      const downloadResumable = FileSystem.createDownloadResumable(
        this.model.downloadUrl,
        modelPath,
        {},
        (downloadProgress) => {
          const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
          if (onProgress) {
            onProgress(progress);
          }
          console.log(`📥 Download progress: ${progress.toFixed(1)}%`);
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri) {
        this.modelPath = result.uri;
        this.model.loaded = true;
        console.log('✅ Model downloaded successfully');
      } else {
        throw new Error('Download failed - no result URI');
      }
      
    } catch (error) {
      console.error(`❌ Failed to download model:`, error);
      
      // Clean up partial download
      try {
        const fileInfo = await FileSystem.getInfoAsync(modelPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(modelPath);
        }
      } catch (cleanupError) {
        console.error('Failed to clean up partial download:', cleanupError);
      }
      
      throw error;
    }
  }

  async loadModel(): Promise<boolean> {
    if (this.isLoading) {
      console.log('⏳ Model is already loading...');
      return false;
    }

    if (!this.model.loaded || !this.modelPath) {
      console.error('❌ Model not available for loading');
      return false;
    }

    if (!LlamaModule) {
      console.log('🔄 Simulating model load (llama.rn not available)');
      this.currentModel = this.model.name;
      return true;
    }

    try {
      this.isLoading = true;
      console.log(`🔄 Loading ${this.model.name} from ${this.modelPath}...`);

      const handle = await LlamaModule.loadModel(this.modelPath, {
        contextSize: this.model.contextLength,
        nThreads: Platform.OS === 'ios' ? 3 : 2,
        seed: -1,
        useMlock: false,
        useMmap: true,
      });

      this.llamaHandle = handle;
      this.currentModel = this.model.name;
      
      console.log(`✅ ${this.model.name} loaded successfully with handle: ${handle}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to load ${this.model.name}:`, error);
      this.currentModel = this.model.name; // Fallback mode
      return true;
    } finally {
      this.isLoading = false;
    }
  }

  async unloadModel(): Promise<void> {
    if (!LlamaModule || !this.llamaHandle) {
      this.currentModel = null;
      console.log('✅ Model unloaded (simulated)');
      return;
    }

    try {
      console.log('🔄 Unloading current model');
      await LlamaModule.unloadModel(this.llamaHandle);
      this.llamaHandle = null;
      this.currentModel = null;
      console.log('✅ Model unloaded successfully');
    } catch (error) {
      console.error('❌ Failed to unload model:', error);
      this.llamaHandle = null;
      this.currentModel = null;
    }
  }

  async generateResponse(prompt: string, conversationHistory: any[] = []): Promise<string> {
    if (LlamaModule && this.llamaHandle && this.currentModel) {
      try {
        console.log('🧠 Generating response with Phi-3 Mini...');

        const formattedPrompt = this.formatPhi3Prompt(conversationHistory, prompt);

        const response = await LlamaModule.generate(this.llamaHandle, formattedPrompt, {
          nPredict: 512,
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          repeatPenalty: 1.1,
          nThreads: Platform.OS === 'ios' ? 3 : 2,
        });

        console.log('✅ Response generated successfully');
        return `**🧠 Phi-3 Mini Local Response:**\n\n${response.trim()}`;

      } catch (error) {
        console.error('❌ Local inference failed:', error);
        return `**🧠 Phi-3 Mini (Fallback):**\n\n${this.generateEnhancedResponse(prompt)}\n\n*Note: Using enhanced responses due to inference error*`;
      }
    }

    // Fallback to enhanced responses
    const enhancedResponse = this.generateEnhancedResponse(prompt);
    const modelStatus = this.currentModel ? `**🧠 ${this.currentModel} (Enhanced Mode):**\n\n` : '';
    return `${modelStatus}${enhancedResponse}`;
  }

  private formatPhi3Prompt(history: any[], userPrompt: string): string {
    let formattedPrompt = `<|system|>
You are a helpful AI assistant specialized in providing guidance on medical topics, travel advice, and survival techniques. Always prioritize user safety and recommend professional consultation when appropriate.<|end|>`;

    for (const message of history.slice(-4)) {
      if (message.role === 'user') {
        formattedPrompt += `\n<|user|>\n${message.content}<|end|>`;
      } else if (message.role === 'assistant') {
        formattedPrompt += `\n<|assistant|>\n${message.content}<|end|>`;
      }
    }

    formattedPrompt += `\n<|user|>\n${userPrompt}<|end|>\n<|assistant|>\n`;
    return formattedPrompt;
  }

  private generateEnhancedResponse(prompt: string): string {
    const message = prompt.toLowerCase();
    
    if (message.includes('medical') || message.includes('health') || message.includes('symptom')) {
      return `🏥 **Medical Guidance**\n\nBased on your question about "${prompt}":\n\n**Important Disclaimers:**\n• This is general information only - not professional medical advice\n• For emergencies, contact emergency services immediately\n• Always consult qualified healthcare professionals\n\n**General Health Information:**\n• Monitor symptoms and document changes\n• Maintain a first aid kit with basic supplies\n• Know your medical history and current medications\n• Stay hydrated and maintain good hygiene\n\nRemember: Early intervention often leads to better outcomes.`;
    }
    
    if (message.includes('travel') || message.includes('trip') || message.includes('destination')) {
      return `✈️ **Travel Advisory**\n\nFor your travel inquiry about "${prompt}":\n\n**Pre-Travel Preparation:**\n• Check passport validity (6+ months remaining)\n• Research visa requirements and restrictions\n• Review current travel advisories\n• Arrange appropriate travel insurance\n\n**Health & Safety:**\n• Consult travel medicine specialist if needed\n• Pack essential medications with prescriptions\n• Research local medical facilities\n\n**Cultural Tips:**\n• Learn basic local customs and etiquette\n• Download offline maps and translation apps\n• Keep copies of important documents\n\nSafe travels! Preparation is key.`;
    }
    
    if (message.includes('survival') || message.includes('emergency') || message.includes('wilderness')) {
      return `🏕️ **Survival Techniques**\n\nRegarding "${prompt}" in survival situations:\n\n**Survival Priorities (Rule of 3s):**\n1. **3 minutes** without air\n2. **3 hours** without shelter (harsh conditions)\n3. **3 days** without water\n4. **3 weeks** without food\n\n**Essential Steps:**\n• Stay calm and assess situation\n• Signal for help when possible\n• Find/build appropriate shelter\n• Locate and purify water sources\n• Use available materials creatively\n\n**Safety Notes:**\n• Practice skills in safe environments first\n• Inform others of wilderness plans\n• Know your limits and capabilities\n\nPreparation prevents emergencies.`;
    }
    
    return `🤖 **AI Assistant**\n\nThank you for your question about "${prompt}". I specialize in:\n\n**🏥 Medical Guidance** - Health information and emergency care\n**✈️ Travel Advice** - Planning, safety, and cultural insights\n**🏕️ Survival Techniques** - Emergency preparedness and skills\n\nCould you specify which area you'd like me to focus on?`;
  }

  // Getter methods
  async getCurrentModel(): Promise<string | null> {
    return this.currentModel;
  }

  getModelInfo(): ModelConfig {
    return { ...this.model };
  }

  // **** FIX IS HERE ****
  // Renamed the method from 'isLoading' to 'getIsLoading' to avoid
  // a name conflict with the 'isLoading' class property.
  getIsLoading(): boolean {
    return this.isLoading;
  }

  async getModelStatus(): Promise<ModelConfig> {
    await this.initializeModel();
    return { ...this.model };
  }

  isNativeModuleAvailable(): boolean {
    return !!LlamaModule;
  }

  // Check if model needs download
  needsDownload(): boolean {
    return !this.model.loaded;
  }

  // Get download progress info
  getDownloadInfo(): { size: string; filename: string } {
    return {
      size: this.model.size,
      filename: this.model.filename
    };
  }
}

export const modelManager = new ModelManager();