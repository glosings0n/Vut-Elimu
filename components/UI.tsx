import React, { useEffect, useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { soundService } from '../services/soundService';
import { ArrowLeft, Star } from 'lucide-react';

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: 'primary' | 'secondary' | 'warning' | 'accent' | 'neutral' | 'danger';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', icon, onClick, ...props }) => {
  // Enhanced Base Style: Thicker border, subtle pattern overlay, better text shadow
  const baseStyle = "font-fredoka font-black py-4 px-6 rounded-3xl border-b-[8px] active:border-b-0 active:translate-y-[8px] hover:-translate-y-1 transition-all flex items-center justify-center gap-3 shadow-xl uppercase tracking-wide relative overflow-hidden group";
  
  const variants = {
    // Standard Blue
    primary: "bg-[#00AEEF] border-[#0085B6] text-white shadow-[#00AEEF]/30",
    // Green (Success/Action)
    secondary: "bg-[#8CC63F] border-[#65912A] text-white shadow-[#8CC63F]/30",
    // Yellow (Attention) - Dark text
    warning: "bg-[#FFC107] border-[#C49200] text-amber-900 shadow-[#FFC107]/30",
    // Purple (Magic/Accent)
    accent: "bg-[#A855F7] border-[#7E22CE] text-white shadow-[#A855F7]/30",
    // Red (Danger/Stop/Close)
    danger: "bg-[#EF4444] border-[#B91C1C] text-white shadow-[#EF4444]/30",
    // White/Neutral
    neutral: "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 shadow-gray-200/40",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    soundService.playClick();
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {/* Texture Pattern Overlay */}
      <div className="absolute inset-0 pattern-dots opacity-20 pointer-events-none" />
      
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {icon && <span className="text-2xl relative z-10 drop-shadow-md group-hover:scale-110 transition-transform">{icon}</span>}
      <span className="relative z-10 drop-shadow-sm flex flex-col">{children}</span>
    </motion.button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string, title?: string, watermark?: React.ReactNode }> = ({ children, className = '', title, watermark }) => (
  <div className={`bg-white rounded-[2.5rem] p-5 md:p-8 shadow-2xl border-[6px] border-white/40 relative overflow-hidden ${className}`}>
    {/* Background Watermark Icon */}
    {watermark && (
      <div className="absolute -bottom-6 -right-6 text-gray-100 opacity-60 rotate-12 transform scale-150 pointer-events-none z-0">
        {React.cloneElement(watermark as React.ReactElement<any>, { size: 140, strokeWidth: 1.5 })}
      </div>
    )}
    
    <div className="relative z-10">
        {title && (
          <div className="mb-6 flex justify-center">
             <div className="relative px-6 py-1.5">
                {/* Smooth Pill Background */}
                <div className="absolute inset-0 bg-[#E0F2FE] rounded-full transform -rotate-2 scale-105 border-b-4 border-[#BAE6FD]"></div>
                {/* Text */}
                <h2 className="relative z-10 text-xl md:text-3xl font-fredoka font-black text-[#0284C7] uppercase tracking-tight drop-shadow-sm leading-none mt-0.5 text-center">
                    {title}
                </h2>
             </div>
          </div>
        )}
        {children}
    </div>
  </div>
);

interface SpinnerProps {
  variant?: 'white' | 'blue';
  className?: string;
}

export const LoadingSpinner: React.FC<SpinnerProps> = ({ variant = 'white', className = '' }) => {
  const isWhite = variant === 'white';
  const borderColor = isWhite ? 'border-white' : 'border-[#00AEEF]';
  const bgBorderColor = isWhite ? 'border-white/30' : 'border-blue-100';
  const textColor = isWhite ? 'text-white' : 'text-[#00AEEF]';
  const dropShadow = isWhite ? 'drop-shadow-md' : '';

  return (
    <div className={`flex flex-col items-center justify-center space-y-6 ${className}`}>
      <div className="relative w-20 h-20 md:w-24 md:h-24">
        <div className={`absolute top-0 left-0 w-full h-full border-[12px] rounded-full ${bgBorderColor}`}></div>
        <div className={`absolute top-0 left-0 w-full h-full border-[12px] rounded-full border-t-transparent animate-spin ${borderColor} shadow-lg`}></div>
      </div>
    </div>
  );
};

export const LoadingScreen: React.FC<{ text?: string; onCancel?: () => void }> = ({ text = "Loading...", onCancel }) => {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#00AEEF] overflow-hidden">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px), 
            linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} 
      />
      
      {/* Floating Stars Background */}
      {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className="absolute text-white/10 animate-twinkle"
            style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`,
                transform: `scale(${0.5 + Math.random()})`
            }}
          >
              <Star size={40 + Math.random() * 40} fill="currentColor" />
          </div>
      ))}
      
      {/* Radial Vignette */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#0085B6]/40 pointer-events-none" />

      {/* Cancel Button */}
      {onCancel && (
        <div className="absolute top-6 left-6 z-50">
            <Button variant="neutral" onClick={onCancel} className="!w-14 !h-14 !rounded-full !p-0">
                <ArrowLeft size={28} />
            </Button>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center -mt-10 animate-float">
        
        {/* 3D LOGO: "Vut'Elimu" */}
        <div className="relative mb-16 select-none font-fredoka">
           
            {/* Layer 1: Deep Blue Shadow / Extrusion (Bottom) */}
            <h1 className="absolute inset-0 text-5xl md:text-8xl font-black text-[#004e80] translate-y-2"
                style={{
                    WebkitTextStroke: '20px #004e80',
                    filter: 'drop-shadow(0px 8px 0px rgba(0,0,0,0.2))'
                }}>
                Vut'Elimu
            </h1>

             {/* Layer 2: White Outline (Middle) */}
            <h1 className="absolute inset-0 text-5xl md:text-8xl font-black text-white"
                style={{
                    WebkitTextStroke: '10px white',
                }}>
                Vut'Elimu
            </h1>

            {/* Layer 3: Gradient Fill (Top) */}
            <h1 className="relative text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFED4B] to-[#FF8C00]"
                style={{
                    filter: 'drop-shadow(0px 2px 0px rgba(255,255,255,0.2))'
                }}>
                Vut'Elimu
            </h1>
        </div>

        {/* Circular Dot Loader */}
        <div className="relative w-16 h-16 mb-8 flex items-center justify-center">
            {[...Array(8)].map((_, i) => {
                const angle = (i / 8) * 2 * Math.PI;
                const radius = 28;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                return (
                    <motion.div
                        key={i}
                        className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-sm"
                        style={{ x, y }}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
                        transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: "easeInOut"
                        }}
                    />
                );
            })}
        </div>

        {/* Loading Text with Spinner Icon */}
        <div className="flex items-center gap-3">
           <motion.div 
             animate={{ rotate: 360 }}
             transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
             className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full"
           />
           <motion.p 
             key={displayText} // Animate when text changes
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-white font-fredoka font-bold text-lg md:text-xl tracking-wide drop-shadow-sm uppercase"
           >
             {displayText}
           </motion.p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-12 flex items-center gap-4 text-white/60 font-bold text-xs md:text-sm tracking-widest font-fredoka">
         <div className="h-px w-8 bg-white/40"></div>
         <span>Built by <a href="https://linktr.ee/glosings0n" target="_blank" rel="noopener noreferrer" className="text-[#FFC107] text-opacity-100 drop-shadow-sm hover:underline hover:text-white transition-colors normal-case text-base">@glosings0n</a> - 2k25</span>
         <div className="h-px w-8 bg-white/40"></div>
      </div>
    </div>
  );
};

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00AEEF]/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="max-w-lg w-full relative animate-float" // Added animate-float here
      >
        {children}
      </motion.div>
    </div>
  );
};