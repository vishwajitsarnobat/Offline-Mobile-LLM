// src/components/HomeScreenHeader.tsx
import React from 'react';
import { View } from 'react-native';
import { Menu, SquarePen, ChevronDown } from 'lucide-react-native';

import { Button } from './ui/button';
import { Text } from './ui/text';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

// Define the props the component will accept
interface HomeScreenHeaderProps {
  onOpenSettings: () => void;
  onNewChat: () => void;
}

const HomeScreenHeader: React.FC<HomeScreenHeaderProps> = ({ onOpenSettings, onNewChat }) => {
  return (
    <View className="flex-row items-center justify-between border-b border-gray-200 bg-white p-4">
      <Button variant="ghost" size="icon" onPress={onOpenSettings}>
        <Menu size={24} color="black" />
      </Button>

      {/* --- Model Selector --- */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="flex-row items-center gap-1">
            <Text className="text-lg font-semibold">Assistant</Text>
            <ChevronDown size={18} color="gray" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56">
          <Text className="p-2 text-base">Select Model</Text>
          {/* Placeholder for model list */}
          <View className="p-2">
            <Text>GPT-4 (Default)</Text>
            <Text className="text-gray-500">Creative & Intelligent</Text>
          </View>
          <View className="p-2">
            <Text>GPT-3.5</Text>
            <Text className="text-gray-500">Fast & Efficient</Text>
          </View>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" onPress={onNewChat}>
        <SquarePen size={24} color="black" />
      </Button>
    </View>
  );
};

export default HomeScreenHeader;
