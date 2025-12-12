import React, { useEffect } from 'react';
import { TugOfWar } from '../TugOfWar';
import { Button } from '../UI';
import { ArrowLeft, Trophy, Frown, Star } from 'lucide-react';
import { UserProfile } from '../../types';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { soundService } from '../../services/soundService';

interface Props {
  user: UserProfile;
  ropePosition: number;
  score: number;
  onExit: () => void;
  title: string;
  children: React.ReactNode;
  isAttacking?: boolean;
}

export const GameContainer: React.FC<Props> = ({ user, ropePosition, score, onExit, title, children, isAttacking = false }) => {
  const isWin = ropePosition >= 100;
  const isLoss = ropePosition <= -100;
  const isGameOver = isWin || isLoss;

  useEffect(() => {
    if (isWin) {
      soundService.playWin();
      const duration = 3000;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#8CC63F', '#00AEEF', '#F7931E']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#8CC63F', '#00AEEF', '#F7931E']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  }, [isWin]);

  useEffect(() => {
    if (isLoss) {
      soundService.playLose();
    }
  }, [isLoss]);

  return (
    <div className={`h-screen flex flex-col p-2 md:p-4 relative overflow-hidden transition-colors duration-700 ${isWin ? 'bg-[#8CC63F]' : isLoss ? 'bg-[#EF4444]' : 'bg-[#00AEEF]'}`}>
        
        {/* Background Parallax Stars */}
        <div 
            className="absolute inset-0 pointer-events-none transition-transform duration-300 ease-out z-0 opacity-10"
            style={{ transform: `translateX(${ropePosition * -0.5}px)` }}
        >
             <Star className="absolute top-[10%] left-[10%] text-white animate-pulse" size={48} fill="currentColor" />
             <Star className="absolute top-[20%] right-[15%] text-white animate-pulse" size={32} fill="currentColor" style={{ animationDelay: '1s' }} />
             <Star className="absolute bottom-[15%] left-[20%] text-white animate-pulse" size={64} fill="currentColor" style={{ animationDelay: '0.5s' }} />
             <Star className="absolute bottom-[30%] right-[25%] text-white animate-pulse" size={40} fill="currentColor" style={{ animationDelay: '1.5s' }} />
             <Star className="absolute top-[50%] left-[50%] text-white animate-pulse" size={24} fill="currentColor" style={{ animationDelay: '2s' }} />
        </div>

        {/* Game Over Overlay */}
        {isGameOver && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] text-center shadow-2xl transform scale-110 animate-bounce-in max-w-sm w-full border-[6px] border-white animate-float">
                    {isWin ? (
                        <>
                             <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-yellow-300 shadow-inner">
                                <Trophy size={48} className="text-yellow-500 drop-shadow-sm" />
                             </div>
                             <h2 className="text-4xl font-fredoka font-black text-[#8CC63F] uppercase mb-2 tracking-wide drop-shadow-sm">Victory!</h2>
                             <p className="text-gray-500 font-bold mb-8 text-lg">You pulled the rope!</p>
                        </>
                    ) : (
                        <>
                             <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-300 shadow-inner">
                                <Frown size={48} className="text-red-500 drop-shadow-sm" />
                             </div>
                             <h2 className="text-4xl font-fredoka font-black text-red-500 uppercase mb-2 tracking-wide drop-shadow-sm">Defeat!</h2>
                             <p className="text-gray-500 font-bold mb-8 text-lg">Gemini was too strong.</p>
                        </>
                    )}
                    <Button onClick={onExit} className="w-full text-xl py-4 shadow-xl" variant={isWin ? "secondary" : "accent"}>
                        PLAY AGAIN
                    </Button>
                </div>
            </div>
        )}

        {/* Header - Ultra Compact */}
        <div className="flex items-center justify-between mb-1 shrink-0 relative z-10 h-10 md:h-12">
            <Button variant="neutral" onClick={onExit} className="!p-0 !rounded-full w-8 h-8 md:w-10 md:h-10 shadow-lg border-2 border-white/50 flex items-center justify-center">
                <ArrowLeft size={18} />
            </Button>
            <h1 className="text-base md:text-xl font-fredoka font-black text-white text-center drop-shadow-md uppercase truncate px-2">{title}</h1>
            <motion.div 
                key={score}
                initial={{ scale: 1.5, backgroundColor: "rgba(255, 255, 255, 0.6)" }}
                animate={{ scale: 1, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border-2 border-white/30 text-white font-fredoka font-bold text-sm md:text-base shadow-lg whitespace-nowrap"
            >
                PTS: {score}
            </motion.div>
        </div>
        
        {/* Game Area */}
        <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col overflow-hidden gap-2 relative z-10">
            {/* Top: Tug of War (Always visible, compact) */}
            <div className="shrink-0">
                <TugOfWar ropePosition={ropePosition} avatarUrl={user.photoURL} isAttacking={isAttacking} />
            </div>
            
            {/* Bottom: Game Content (Layout managed by Grid in children) */}
            <motion.div 
               animate={isAttacking ? { x: [-5, 5, -5, 5, 0] } : {}}
               transition={{ duration: 0.4 }}
               className={`flex-1 bg-white rounded-2xl md:rounded-3xl shadow-2xl p-3 md:p-4 relative overflow-hidden border-4 transition-all duration-300 ${isAttacking ? 'border-red-500 shadow-red-500/50' : isWin ? 'border-[#8CC63F] shadow-[#8CC63F]/30' : isLoss ? 'border-[#EF4444] shadow-[#EF4444]/30' : 'border-white/50'}`}
            >
                {children}
            </motion.div>
        </div>
    </div>
  );
};