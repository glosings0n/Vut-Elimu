import React, { useState, useEffect, useRef } from 'react';
import { generateListeningContent, speakText } from '../../services/geminiService';
import { decodeAudioData } from '../../services/audioUtils';
import { Question } from '../../types';
import { Button, LoadingSpinner } from '../UI';
import { Play, Pause, Ear, Activity, Volume2, ArrowRight } from 'lucide-react';
import { soundService } from '../../services/soundService';
import confetti from 'canvas-confetti';

interface Props {
  onCorrect: () => void;
  onIncorrect: () => void;
  level: number;
}

export const ListeningGame: React.FC<Props> = ({ onCorrect, onIncorrect, level }) => {
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [pulse, setPulse] = useState(false);

  // Initialize Game
  useEffect(() => {
    let mounted = true;
    const init = async () => {
        setLoading(true);
        try {
            // 1. Generate Story & Questions
            const data = await generateListeningContent(level);
            if (!mounted) return;
            
            // Shuffle options for each question
            const shuffledQs = data.questions.map((q: any) => ({
                ...q,
                options: q.options.sort(() => Math.random() - 0.5)
            }));
            setQuestions(shuffledQs);

            // 2. Generate Audio
            if (data.story) {
                const ab = await speakText(data.story);
                if (ab && mounted) {
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    // Fix: Use custom decodeAudioData for raw PCM (Gemini TTS)
                    // Gemini TTS is 24kHz mono. We wrap ArrayBuffer in Uint8Array for the utility.
                    const decoded = await decodeAudioData(new Uint8Array(ab), ctx, 24000);
                    setAudioBuffer(decoded);
                    audioContextRef.current = ctx;
                }
            }
        } catch (e) {
            console.error("Listening Game Init Error:", e);
        }
        if (mounted) setLoading(false);
    };
    init();

    return () => {
        mounted = false;
        if (sourceRef.current) sourceRef.current.stop();
        if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [level]);

  // Gemini Attack Logic - Pulse effect
  useEffect(() => {
      const interval = setInterval(() => {
        setPulse(p => !p);
      }, 3000);
      return () => clearInterval(interval);
  }, []);

  const toggleAudio = async () => {
      if (!audioBuffer || !audioContextRef.current) {
          console.warn("Audio not ready");
          return;
      }
      
      if (isPlaying) {
          if (sourceRef.current) sourceRef.current.stop();
          setIsPlaying(false);
      } else {
          try {
              // Critical Fix: Resume context if suspended (browser autoplay policy)
              if (audioContextRef.current.state === 'suspended') {
                  await audioContextRef.current.resume();
              }

              const source = audioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContextRef.current.destination);
              source.onended = () => setIsPlaying(false);
              source.start();
              sourceRef.current = source;
              setIsPlaying(true);
          } catch (e) {
              console.error("Audio playback failed", e);
              setIsPlaying(false);
          }
      }
  };

  const handleAnswer = (option: string) => {
      const currentQ = questions[currentQIndex];
      if (option === currentQ.correctAnswer) {
          soundService.playCorrect();
          confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
          onCorrect();
      } else {
          soundService.playIncorrect();
          onIncorrect();
      }

      // Next Question with delay
      setTimeout(() => {
          if (currentQIndex < questions.length - 1) {
              setCurrentQIndex(prev => prev + 1);
          } else {
              // Reset for endless play or level completion
              setQuizStarted(false);
              setCurrentQIndex(0);
          }
      }, 500);
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full">
              <LoadingSpinner variant="blue" />
              <p className="mt-4 text-gray-500 font-bold animate-pulse uppercase tracking-widest text-sm">Generating Story...</p>
          </div>
      );
  }

  // Consistent Colors with GKGame
  const optionVariants: ('primary' | 'warning' | 'secondary' | 'accent')[] = [
    'primary',   // Blue
    'warning',   // Yellow
    'secondary', // Green
    'accent'     // Purple
  ];

  // Visualizer Component
  const AudioVisualizer = () => (
    <div className="flex items-center justify-center gap-1.5 h-full w-full">
        {[...Array(8)].map((_, i) => (
            <div 
                key={i}
                className="w-2 md:w-3 bg-[#00AEEF] rounded-full"
                style={{
                    animation: isPlaying ? `soundWave 0.8s ease-in-out infinite` : 'none',
                    animationDelay: `${i * 0.08}s`,
                    height: isPlaying ? '60%' : '15%', // Base height
                    opacity: isPlaying ? 1 : 0.4
                }}
            />
        ))}
        <style>{`
            @keyframes soundWave {
                0%, 100% { height: 20%; opacity: 0.5; }
                50% { height: 100%; opacity: 1; }
            }
        `}</style>
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
        
        {/* Audio Player Section (Before Quiz) */}
        {!quizStarted ? (
            <div className="flex-1 flex flex-col md:flex-row gap-4 p-2 md:p-6 overflow-hidden">
                
                {/* LEFT: AUDIO PLAYER */}
                <div className="flex-1 bg-white rounded-[2rem] border-[6px] border-blue-50 shadow-xl relative overflow-hidden flex flex-col items-center justify-center p-6 md:order-1 order-1">
                     <div className="absolute top-0 left-0 w-full h-32 bg-blue-50/50 -skew-y-6 transform origin-top-left -z-0"></div>
                     
                     <div className="bg-blue-100 p-4 rounded-full mb-6 shadow-sm border-2 border-blue-200 z-10">
                        <Ear size={40} className="text-[#00AEEF]" />
                     </div>
                     
                     {/* Visualizer Container */}
                     <div className="w-full h-20 flex items-center justify-center mb-6 z-10">
                         <AudioVisualizer />
                     </div>

                     <button 
                        onClick={toggleAudio}
                        disabled={!audioBuffer}
                        className={`w-24 h-24 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all transform hover:scale-105 active:scale-95 border-[6px] border-white z-10 ${isPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-[#00AEEF] text-white'}`}
                     >
                        {isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-2" />}
                     </button>
                     
                     <div className="mt-4 h-6 z-10 text-center">
                        {!audioBuffer && <span className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading Audio...</span>}
                        {audioBuffer && !isPlaying && <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tap to Play</span>}
                        {isPlaying && <span className="text-xs font-bold text-red-400 uppercase tracking-widest animate-pulse">Playing Story...</span>}
                     </div>
                </div>

                {/* RIGHT: INSTRUCTIONS & START */}
                <div className="flex-1 bg-blue-50 rounded-[2rem] border-[6px] border-blue-100 shadow-xl flex flex-col items-center justify-center p-6 text-center md:order-2 order-2">
                    <h2 className="text-2xl md:text-4xl font-black text-gray-800 uppercase mb-4 leading-tight">
                        Listen<br/><span className="text-[#00AEEF]">Carefully</span>
                    </h2>
                    
                    <div className="bg-white/60 p-4 md:p-6 rounded-2xl mb-8 border-2 border-white max-w-sm">
                        <p className="text-gray-600 font-bold text-base md:text-lg leading-relaxed">
                            Press play on the left to hear the story. Remember every detail!
                        </p>
                    </div>

                    <Button 
                        onClick={() => { soundService.playClick(); setQuizStarted(true); }} 
                        variant="secondary" 
                        className="w-full max-w-xs py-5 text-xl shadow-xl hover:scale-105" 
                        disabled={isPlaying || !audioBuffer}
                        icon={<ArrowRight size={28} />}
                    >
                        START QUIZ
                    </Button>
                </div>

            </div>
        ) : (
            /* Quiz Section - Compact Layout */
            <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-4 overflow-hidden h-full">
                {/* Question Area */}
                <div className={`flex-1 flex flex-col items-center justify-center p-4 bg-purple-50 rounded-2xl border-[4px] transition-colors duration-500 ${pulse ? 'border-red-300 shadow-red-100' : 'border-purple-100'} shadow-inner relative min-h-[140px]`}>
                    
                    <div className="absolute top-2 right-2 flex gap-1 items-center">
                        <Activity size={16} className={`${pulse ? 'text-red-500' : 'text-gray-300'} transition-colors duration-500`} />
                    </div>

                    <div className="bg-purple-200/50 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mb-2">
                        Question {currentQIndex + 1} / {questions.length}
                    </div>
                    <h2 className="text-lg md:text-2xl font-black text-gray-800 text-center leading-snug drop-shadow-sm max-w-full">
                        {questions[currentQIndex]?.question}
                    </h2>
                </div>

                {/* Answers Area - Flexible Grid */}
                <div className="flex-[1.2] grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 overflow-y-auto">
                    {questions[currentQIndex]?.options?.map((opt, i) => (
                        <Button 
                            key={i} 
                            onClick={() => handleAnswer(opt)} 
                            variant={optionVariants[i % 4]}
                            className="w-full h-full min-h-[60px] text-sm md:text-lg px-3 py-2 whitespace-normal leading-tight rounded-xl border-b-[6px] hover:-translate-y-0.5"
                        >
                            {opt}
                        </Button>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};