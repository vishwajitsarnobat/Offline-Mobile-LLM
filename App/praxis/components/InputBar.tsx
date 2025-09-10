// src/components/InputBar.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { Camera, Image as ImageIcon, Folder, Mic, Headphones } from 'lucide-react-native';

import { Button } from './ui/button';
import { Input } from './ui/input';

const InputBar = () => {
  const [message, setMessage] = useState('');

  return (
    <View className="border-t border-gray-200 bg-white p-4">
      {/* --- Action Buttons --- */}
      <View className="mb-2 flex-row items-center justify-between">
        {/* Placeholder for suggestion prompts */}
      </View>

      {/* --- Main Input Row --- */}
      <View className="flex-row items-center gap-2">
        <Button variant="ghost" size="icon">
          <Camera size={24} color="black" />
        </Button>
        <Button variant="ghost" size="icon">
          <ImageIcon size={24} color="black" />
        </Button>
        <Button variant="ghost" size="icon">
          <Folder size={24} color="black" />
        </Button>
        <Input
          placeholder="Message..."
          value={message}
          onChangeText={setMessage}
          className="h-12 flex-1"
        />
        <Button variant="ghost" size="icon">
          <Mic size={24} color="black" />
        </Button>
        <Button variant="ghost" size="icon">
          <Headphones size={24} color="black" />
        </Button>
      </View>
    </View>
  );
};

export default InputBar;
