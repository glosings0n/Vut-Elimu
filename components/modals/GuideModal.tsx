import React, { useState } from 'react';
import { BookOpen, Gauge, Star, Users, X } from 'lucide-react';
import { Modal } from '../UI';
import { soundService } from '../../services/soundService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "HOW TO PLAY",
    icon: <BookOpen size={48} />,
    desc: "Welcome to Vut'Elimu! A mental Tug-of-War game. Answer questions correctly to pull the rope to your side.",
    color: "bg-[#00AEEF]", // Blue
    btnColor: "bg-[#00AEEF]",
  },
  {
    title: "THE GAUGE",
    icon: <Gauge size={48} />,
    desc: "The bar at the bottom is the rope. Center is 0. Pull it to 100 (Right) to Win. If it hits -100 (Left), you lose!",
    color: "bg-[#F7931E]", // Yellow
    btnColor: "bg-[#F7931E]",
  },
  {
    title: "SCORING",
    icon: <Star size={48} />,
    desc: "Each correct answer pulls the rope +20 points. Wrong answers give the opponent an advantage. Be fast and accurate!",
    color: "bg-[#A855F7]", // Purple
    btnColor: "bg-[#A855F7]",
  },
  {
    title: "MODES",
    icon: <Users size={48} />,
    desc: "Play Solo against the AI (Gemini) or join a School Team to battle other classes in real-time.",
    color: "bg-[#22C55E]", // Green
    btnColor: "bg-[#22C55E]",
  },
];

export const GuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    soundService.playClick();
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
      setTimeout(() => setCurrentStep(0), 300); // Reset after close
    }
  };

  const handleBack = () => {
    soundService.playClick();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = STEPS[currentStep];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/20 text-white p-1 rounded-full hover:bg-black/30 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header with Color & Icon */}
        <div className={`${step.color} h-40 flex items-center justify-center relative overflow-hidden transition-colors duration-500`}>
           <div className="absolute inset-0 bg-white/10 pattern-dots" /> 
           <div className="bg-white/20 p-6 rounded-full text-white backdrop-blur-sm shadow-inner relative z-10">
              {step.icon}
           </div>
        </div>

        {/* Content */}
        <div className="p-8 text-center min-h-[300px] flex flex-col items-center justify-between">
            <div>
               <h2 className={`text-2xl font-black uppercase mb-4 transition-colors duration-500`} style={{ color: step.btnColor.replace('bg-', '') }}>
                   {step.title}
               </h2>
               <p className="text-gray-600 font-medium leading-relaxed text-lg">
                   {step.desc}
               </p>
            </div>

            <div className="w-full mt-8">
               {/* Dots */}
               <div className="flex justify-center gap-2 mb-6">
                  {STEPS.map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${idx === currentStep ? step.btnColor.replace('bg-', 'bg-') : 'bg-gray-200'}`}
                      />
                  ))}
               </div>

               {/* Buttons */}
               <div className="flex gap-4">
                  {currentStep > 0 && (
                      <button 
                        onClick={handleBack}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold py-3 rounded-xl transition-colors"
                      >
                        BACK
                      </button>
                  )}
                  <button 
                    onClick={handleNext}
                    className={`flex-1 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all ${step.btnColor} hover:brightness-110`}
                  >
                    {currentStep === STEPS.length - 1 ? "LET'S PLAY!" : "NEXT"}
                  </button>
               </div>
            </div>
        </div>
      </div>
    </Modal>
  );
};