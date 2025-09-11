import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

// Static import of your model file
const modelAsset = require('../../assets/models/phi-3-mini-4k-instruct-q4_0.gguf');

export async function copyBundledModel(modelFileName: string): Promise<string> {
  try {
    // Use the statically imported asset
    const asset = Asset.fromModule(modelAsset);
    
    // Ensure the asset is downloaded
    if (!asset.localUri) {
      await asset.downloadAsync();
    }

    // Create destination directory
    const modelsDir = `${FileSystem.documentDirectory}models/`;
    const destPath = `${modelsDir}${modelFileName}`;
    
    // Create models directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(modelsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
    }
    
    // Check if file already exists
    const fileInfo = await FileSystem.getInfoAsync(destPath);
    if (fileInfo.exists) {
      console.log('✅ Model file already exists in documents');
      return destPath;
    }
    
    // Copy the asset to documents directory
    await FileSystem.copyAsync({
      from: asset.localUri!,
      to: destPath
    });
    
    console.log('✅ Model copied to:', destPath);
    return destPath;
    
  } catch (error) {
    console.error('❌ Failed to copy bundled model:', error);
    throw error;
  }
}
