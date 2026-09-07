import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bot, Search, PenTool, Image as ImageIcon } from 'lucide-react';
import { useAnimationLevel } from '../../context/AnimationContext';

export const GenericAIState = ({ icon: Icon = Bot, title, description, isProcessing = true }) => {
  const { getVariant } = useAnimationLevel();

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full min-h-[300px] text-center">
      <div className="relative mb-8">
        {/* Glowing Aura */}
        <motion.div 
          className="absolute inset-[-20px] rounded-full bg-[var(--accent-gray)]/20 blur-xl"
          animate={{ scale: isProcessing ? [1, 1.2, 1] : 1, opacity: isProcessing ? [0.5, 0.8, 0.5] : 0 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Icon Container */}
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#111] to-[#222] border border-[var(--border-color)] flex items-center justify-center z-10 premium-glass">
          <Icon className="w-10 h-10 text-[var(--accent-gray)]" />
          
          {/* Processing Sparkle */}
          {isProcessing && (
            <motion.div 
              className="absolute -top-2 -right-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </motion.div>
          )}
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-[var(--text-main)] mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
        {title}
      </h3>
      <p className="text-[var(--text-muted)] max-w-sm">
        {description}
      </p>
    </div>
  );
};

export const AIThinkingState = () => (
  <GenericAIState
    title="AI is Thinking..."
    description="Analyzing your request and generating the best possible response."
  />
);

export const AIWritingState = () => (
  <GenericAIState
    icon={PenTool}
    title="AI is Writing..."
    description="Drafting high-quality content tailored to your needs."
  />
);

export const AISearchingState = () => (
  <GenericAIState
    icon={Search}
    title="AI is Searching..."
    description="Scanning the marketplace for the perfect matches."
  />
);

export const AIGeneratingImageState = () => (
  <GenericAIState
    icon={ImageIcon}
    title="Generating Image..."
    description="Creating a unique visual based on your description. This may take a few seconds."
  />
);
