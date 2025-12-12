import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../../types';
import { soundService } from '../../services/soundService';
import { speak, stopSpeaking, SpeechRecognizer, wordToNumber } from '../../services/accessibilityService';
import { Activity, Mic } from 'lucide-react';

interface Props {
  questions: Question[];
  onCorrect: () => void;
  onIncorrect: () => void;
  isBlindMode?: boolean;
}

export const MathGame: React.FC<Props> = ({ questions, onCorrect, onIncorrect, isBlindMode = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [pulse, setPulse] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  
  const question = questions[currentIndex];

  useEffect(() => {
    setCurrentInput("");
  }, [currentIndex]);

  // Handle Blind Mode Voice Interaction
  useEffect(() => {
    if (!question || !isBlindMode) return;

    // 1. Speak Question
    const qText = `Question. ${question.question.replace('+', 'plus').replace('-', 'minus').replace('*', 'times').replace('/', 'divided by')}`;
    speak(qText);

    // 2. Start Listening after a short delay for speaking to start
    const timer = setTimeout(() => {
        if (!recognizerRef.current) {
            recognizerRef.current = new SpeechRecognizer((text) => {
                // Process input
                const num = wordToNumber(text);
                console.log("Voice Input:", text, "->", num);
                
                // If it's a number, submit it
                if (!isNaN(Number(num))) {
                   // Short feedback
                   speak(`You said ${num}`);
                   if (num === question.correctAnswer) {
                       onCorrect();
                       setTimeout(() => setCurrentIndex((prev) => (prev + 1) % questions.length), 1000);
                   } else {
                       onIncorrect();
                   }
                }
            }, () => setIsListening(false));
        }
        recognizerRef.current.start();
        setIsListening(true);
    }, 3000); // Wait 3s for question read

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
    }, 5000);
    return () => clearInterval(interval);
  }, [onIncorrect]);

  const handleNumClick = (num: string) => {
    soundService.playClick();
    if (currentInput.length < 3) {
      setCurrentInput(prev => prev + num);
    }
  };

  const handleClear = () => {
    soundService.playClick();
    setCurrentInput("");
  };
  
  const handleSubmit = () => {
    if (currentInput === question.correctAnswer) {
      onCorrect();
      setCurrentIndex((prev) => (prev + 1) % questions.length);
    } else {
      onIncorrect();
      setCurrentInput("");
    }
  };

  if (!question) return <div className="text-center text-lg font-bold p-10 text-gray-500">Loading Math...</div>;

  return (
    <div className="h-full w-full flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-6 overflow-hidden">
       {/* Left/Top: Question Display */}
       <div className={`flex flex-col items-center justify-center bg-blue-50 rounded-xl border-[6px] transition-colors duration-500 ${pulse ? 'border-red-300 shadow-red-100' : 'border-blue-100'} p-4 relative overflow-hidden h-full min-h-[140px] shadow-inner`}>
           
           <div className="absolute top-2 right-2 flex gap-2 items-center">
                <span className={`text-[10px] font-black uppercase transition-opacity duration-300 ${pulse ? 'text-red-400 opacity-100' : 'text-gray-300 opacity-0'}`}>Gemini Attacking</span>
                <Activity size={20} className={`${pulse ? 'text-red-500' : 'text-gray-300'} transition-colors duration-500`} />
           </div>

           <div className="absolute top-0 left-0 p-2 opacity-10 pointer-events-none">
                <span className="text-8xl">🧮</span>
           </div>
           
           <h2 className="text-lg md:text-2xl font-black text-blue-600 drop-shadow-sm relative z-10 text-center leading-tight max-w-full break-words mb-4 px-2">
             {question.question}
           </h2>
           
           {/* Enhanced Input Display */}
           <div className="w-full max-w-[220px]">
               <div className={`h-20 bg-white rounded-2xl border-[5px] flex items-center justify-center text-5xl font-black tracking-widest shadow-md ${isBlindMode && isListening ? 'border-red-400 animate-pulse' : 'border-blue-400 text-gray-800'}`}>
                   {isBlindMode ? (
                       <Mic size={40} className={isListening ? 'text-red-500' : 'text-gray-300'} />
                   ) : (
                       currentInput || <span className="text-gray-200 animate-pulse text-6xl">?</span>
                   )}
               </div>
               {isBlindMode && <p className="text-center text-xs font-bold text-gray-400 mt-2 uppercase tracking-wide">Speak your answer</p>}
           </div>
       </div>

       {/* Right/Bottom: Keypad - Candy Buttons Style (Hidden in Blind Mode?) - kept for accessibility backup if needed, or user could touch them to hear numbers */}
       <div className="flex items-center justify-center h-full overflow-hidden py-1">
           <div className="grid grid-cols-3 gap-3 w-full max-w-sm h-full max-h-[400px]">
               {[1,2,3,4,5,6,7,8,9].map(n => (
                   <button 
                     key={n}
                     onClick={() => handleNumClick(n.toString())}
                     className="bg-white border-b-[6px] border-gray-200 active:border-b-0 active:translate-y-[6px] rounded-2xl text-3xl md:text-4xl font-black text-[#00AEEF] hover:bg-blue-50 transition-all shadow-md flex items-center justify-center relative overflow-hidden"
                     aria-label={n.toString()}
                   >
                     {n}
                   </button>
               ))}
               <button 
                    onClick={handleClear} 
                    className="bg-red-100 border-b-[6px] border-red-300 active:border-b-0 active:translate-y-[6px] rounded-2xl text-red-500 font-black text-xl transition-all shadow-md flex items-center justify-center hover:bg-red-200"
                    aria-label="Clear"
                >
                    CLR
                </button>
               <button 
                    onClick={() => handleNumClick("0")} 
                    className="bg-white border-b-[6px] border-gray-200 active:border-b-0 active:translate-y-[6px] rounded-2xl text-3xl md:text-4xl font-black text-[#00AEEF] hover:bg-blue-50 transition-all shadow-md flex items-center justify-center"
                    aria-label="0"
                >
                    0
                </button>
               <button 
                    onClick={handleSubmit} 
                    className="bg-[#8CC63F] border-b-[6px] border-[#5d8a24] active:border-b-0 active:translate-y-[6px] rounded-2xl text-white font-black text-2xl transition-all shadow-md flex items-center justify-center hover:brightness-110"
                    aria-label="Submit"
                >
                    GO
                </button>
           </div>
       </div>
    </div>
  );
};