import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../../types';
import { Button } from '../UI';
import confetti from 'canvas-confetti';
import { Activity, Mic } from 'lucide-react';
import { speak, stopSpeaking, SpeechRecognizer } from '../../services/accessibilityService';
import { soundService } from '../../services/soundService';

interface Props {
  questions: Question[];
  onCorrect: () => void;
  onIncorrect: () => void;
  isBlindMode?: boolean;
}

export const GKGame: React.FC<Props> = ({ questions, onCorrect, onIncorrect, isBlindMode = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);

  const question = questions[currentIndex];

  // Handle Blind Mode
  useEffect(() => {
      if (!question || !isBlindMode) return;
      
      const opts = question.options?.map((o, i) => `${i === 0 ? 'A' : i === 1 ? 'B' : i === 2 ? 'C' : 'D'}, ${o}`).join('. ');
      const qText = `Question. ${question.question}. Options are: ${opts}. Speak the answer or the letter.`;
      speak(qText);

      const timer = setTimeout(() => {
          if (!recognizerRef.current) {
              recognizerRef.current = new SpeechRecognizer((text) => {
                  console.log("GK Voice:", text);
                  // Basic matching
                  const t = text.toLowerCase();
                  // Check if text matches any option or A/B/C/D
                  let matchedIndex = -1;
                  
                  if (t.includes('a') && t.length < 5) matchedIndex = 0;
                  else if (t.includes('b') && t.length < 5) matchedIndex = 1;
                  else if (t.includes('c') && t.length < 5) matchedIndex = 2;
                  else if (t.includes('d') && t.length < 5) matchedIndex = 3;
                  else {
                      matchedIndex = question.options?.findIndex(o => t.includes(o.toLowerCase())) ?? -1;
                  }

                  if (matchedIndex !== -1 && question.options) {
                      const selected = question.options[matchedIndex];
                      speak(`You selected ${selected}`);
                      handleAnswer(selected);
                  }
              }, () => setIsListening(false));
          }
          recognizerRef.current.start();
          setIsListening(true);
      }, 5000); // Wait for long question read

      return () => {
          clearTimeout(timer);
          stopSpeaking();
          if (recognizerRef.current) recognizerRef.current.stop();
      };
  }, [currentIndex, isBlindMode, question]);

  // Gemini Attack Logic
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
      onIncorrect(); 
    }, 3000);
    return () => clearInterval(interval);
  }, [onIncorrect]);

  const handleAnswer = (option: string) => {
    if (option === question.correctAnswer) {
      soundService.playCorrect();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      onCorrect();
    } else {
      soundService.playIncorrect();
      onIncorrect();
    }
    setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % questions.length);
    }, 500);
  };

  if (!question) return <div className="text-center text-lg font-bold p-10">Loading Knowledge...</div>;

  const optionVariants: ('primary' | 'warning' | 'secondary' | 'accent')[] = ['primary', 'warning', 'secondary', 'accent'];

  return (
    <div className="h-full w-full flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-6 overflow-hidden">
      {/* Left/Top: Question */}
      <div className={`flex flex-col items-center justify-center p-6 bg-yellow-50 rounded-xl border-[6px] transition-colors duration-500 ${pulse ? 'border-red-300 shadow-red-100' : 'border-yellow-100'} h-full min-h-[140px] shadow-inner relative`}>
         
         <div className="absolute top-2 right-2 flex gap-2 items-center">
             <span className={`text-[10px] font-black uppercase transition-opacity duration-300 ${pulse ? 'text-red-400 opacity-100' : 'text-gray-300 opacity-0'}`}>Gemini Attacking</span>
             <Activity size={20} className={`${pulse ? 'text-red-500' : 'text-gray-300'} transition-colors duration-500`} />
         </div>

         <div className="absolute top-2 left-2 bg-yellow-200 text-yellow-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
            Question {currentIndex + 1}
         </div>
         <h2 className="text-lg md:text-2xl font-black text-gray-800 text-center leading-snug max-w-prose drop-shadow-sm">
            {question.question}
        </h2>
        
        {isBlindMode && (
            <div className={`mt-4 p-3 rounded-full border-4 ${isListening ? 'border-red-400 bg-red-50 animate-pulse' : 'border-gray-200 bg-gray-50'}`}>
                <Mic size={24} className={isListening ? 'text-red-500' : 'text-gray-400'} />
            </div>
        )}
      </div>

      {/* Right/Bottom: Answers */}
      <div className="flex flex-col justify-center h-full overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full h-full max-h-[400px]">
             {question.options?.map((opt, idx) => (
                 <Button 
                    key={idx} 
                    onClick={() => handleAnswer(opt)}
                    variant={optionVariants[idx % 4]}
                    className="w-full text-base md:text-xl h-full px-4 py-2 whitespace-normal leading-tight rounded-2xl border-b-[8px] hover:-translate-y-1"
                    aria-label={`Option ${idx === 0 ? 'A' : idx === 1 ? 'B' : idx === 2 ? 'C' : 'D'}: ${opt}`}
                 >
                     {opt}
                 </Button>
             ))}
          </div>
      </div>
    </div>
  );
};