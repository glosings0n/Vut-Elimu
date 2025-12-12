import React from 'react';
import { Settings, BookOpen, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { soundService } from '../services/soundService';

interface Props {
  onSettingsClick: () => void;
  onGuideClick: () => void;
  onHelpClick: () => void;
  onLeaderboardClick: () => void;
}

export const SideMenu: React.FC<Props> = ({ onSettingsClick, onGuideClick, onHelpClick, onLeaderboardClick }) => {
  // "Juicy" circular buttons with 3D border effect
  const btnClass = "w-16 h-16 md:w-18 md:h-18 rounded-full flex items-center justify-center shadow-xl transform transition-transform hover:scale-110 active:scale-95 border-b-[6px] active:border-b-0 active:translate-y-[6px] relative overflow-hidden group";

  const playClick = () => soundService.playClick();

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-5 z-40 pointer-events-auto">
      
      {/* Leaderboard: Orange with Trophy */}
      <motion.button
        initial={{ x: 100, opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }} 
        transition={{ delay: 0.05, type: "spring" }}
        onClick={() => { playClick(); onLeaderboardClick(); }}
        className={`${btnClass} bg-[#F97316] border-[#C2410C] text-white shadow-orange-500/30`}
        aria-label="Leaderboard"
      >
        <div className="absolute inset-0 pattern-dots opacity-10 pointer-events-none" />
        <Trophy size={30} strokeWidth={3} className="group-hover:rotate-12 transition-transform duration-300" />
      </motion.button>

      {/* Settings: White with Dark Grey Icon */}
      <motion.button
        initial={{ x: 100, opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }} 
        transition={{ delay: 0.1, type: "spring" }}
        onClick={() => { playClick(); onSettingsClick(); }}
        className={`${btnClass} bg-white border-gray-300 text-slate-600 shadow-gray-400/20`}
        aria-label="Settings"
      >
        <div className="absolute inset-0 pattern-dots opacity-10 pointer-events-none" />
        <Settings size={30} strokeWidth={3} className="group-hover:rotate-45 transition-transform duration-500" />
      </motion.button>

      {/* Guide: Bright Green with Dark Green Icon */}
      <motion.button
        initial={{ x: 100, opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }} 
        transition={{ delay: 0.2, type: "spring" }}
        onClick={() => { playClick(); onGuideClick(); }}
        className={`${btnClass} bg-[#4ADE80] border-[#16A34A] text-[#14532D] shadow-green-500/30`}
        aria-label="Game Guide"
      >
        <div className="absolute inset-0 pattern-dots opacity-10 pointer-events-none" />
        <BookOpen size={30} strokeWidth={3} className="group-hover:scale-110 transition-transform duration-300" />
      </motion.button>

      {/* Help: Yellow with Dark Brown '?' */}
      <motion.button
        initial={{ x: 100, opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }} 
        transition={{ delay: 0.3, type: "spring" }}
        onClick={() => { playClick(); onHelpClick(); }}
        className={`${btnClass} bg-[#FACC15] border-[#CA8A04] text-[#713F12] shadow-yellow-500/30`}
        aria-label="Help"
      >
        <div className="absolute inset-0 pattern-dots opacity-10 pointer-events-none" />
        <span className="font-fredoka font-black text-4xl group-hover:rotate-12 transition-transform duration-300">?</span>
      </motion.button>

    </div>
  );
};