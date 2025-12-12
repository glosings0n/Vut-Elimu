import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  ropePosition: number; // -100 (left wins) to 100 (right wins). 0 is center.
  avatarUrl?: string;
  opponentName?: string;
  isAttacking?: boolean;
}

export const TugOfWar: React.FC<Props> = ({ ropePosition, avatarUrl, opponentName = "Gemini AI", isAttacking = false }) => {
  // Normalize rope position for display: 50% is center.
  const displayPos = 50 + (ropePosition / 2);

  return (
    <div className="w-full relative h-20 md:h-24 bg-black/10 rounded-2xl mt-1 mb-2 overflow-hidden border-4 border-white/20 shadow-inner">
      
      {/* Background track */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
         {/* Left Side (Opponent) */}
         <div className="flex flex-col items-center z-10">
            <motion.div 
               animate={isAttacking ? { scale: [1, 1.2, 1], boxShadow: "0px 0px 20px #EF4444" } : { scale: 1, boxShadow: "0px 0px 0px transparent" }}
               transition={{ duration: 0.5, repeat: isAttacking ? Infinity : 0 }}
               className={`w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-lg font-bold transition-colors ${isAttacking ? 'bg-red-600' : 'bg-red-500'}`}
            >
               🤖
            </motion.div>
            <span className={`font-bold text-[10px] md:text-xs bg-black/20 px-1.5 rounded mt-0.5 backdrop-blur-sm transition-colors ${isAttacking ? 'text-red-200 animate-pulse' : 'text-white'}`}>
                {isAttacking ? "ATTACKING!" : opponentName}
            </span>
         </div>

         {/* Right Side (User) */}
         <div className="flex flex-col items-center z-10">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-green-500 rounded-full border-2 border-white shadow-md flex items-center justify-center overflow-hidden">
               {avatarUrl ? <img src={avatarUrl} alt="You" className="w-full h-full object-cover" /> : <span className="text-xl">😎</span>}
            </div>
            <span className="text-white font-bold text-[10px] md:text-xs bg-black/20 px-1.5 rounded mt-0.5 backdrop-blur-sm">YOU</span>
         </div>
      </div>

      {/* Rope & Flag */}
      <div className="absolute inset-0 flex items-center">
        {/* Rope Line */}
        <motion.div 
            animate={isAttacking ? { y: [-1, 1, -1, 1, 0] } : { y: 0 }}
            transition={{ duration: 0.2, repeat: isAttacking ? Infinity : 0 }}
            className="w-full h-1.5 md:h-2 bg-[#D4A373] shadow-sm relative"
        >
           
           {/* Center Marker */}
           <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/50 -translate-x-1/2"></div>
           
           {/* The Knot/Flag */}
           <motion.div 
             className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 md:w-10 md:h-10 bg-yellow-400 rotate-45 border-2 md:border-4 border-white shadow-lg z-20 rounded-md"
             animate={{ left: `${displayPos}%` }}
             transition={{ type: "spring", stiffness: 100, damping: 20 }}
           >
              <div className="w-full h-full bg-orange-500 rounded-full scale-50"></div>
           </motion.div>
        </motion.div>
      </div>

      {/* Status Text */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 text-white/90 font-black text-[10px] md:text-xs uppercase tracking-widest drop-shadow-md">
        {ropePosition === 0 ? "Even Match!" : ropePosition > 0 ? "You're Winning!" : "Pull Harder!"}
      </div>

    </div>
  );
};