const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add gguf files to asset extensions
config.resolver.assetExts.push('gguf');

// Increase max bundle size for large models
config.transformer.maxWorkerCount = 1;

module.exports = config;
