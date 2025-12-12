import React, { useState } from 'react';
import { Button, Card, LoadingSpinner } from './UI';
import { generateAvatar } from '../services/geminiService';
import { Wand2, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onAvatarCreated: (url: string) => void;
  onSkip: () => void;
}

export const AvatarCreator: React.FC<Props> = ({ onAvatarCreated, onSkip }) => {
  const [ethnicity, setEthnicity] = useState('African');
  const [gender, setGender] = useState('Girl');
  const [age, setAge] = useState('Young Child'); // Keep state but fixed in UI if needed
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    // Slight delay to allow modal animation to start
    setTimeout(async () => {
        const url = await generateAvatar(ethnicity, gender, age, "Teletoon");
        setGeneratedImage(url);
        setLoading(false);
    }, 500);
  };

  const resetGeneration = () => {
      setGeneratedImage(null);
      setLoading(false);
  };

  return (
    <div className="flex flex-col h-full items-center justify-center p-4 relative">
      <Card className="max-w-md w-full relative z-10" title="CREATE YOUR HERO">
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
               {/* Style Select */}
               <div>
                  <label className="block text-gray-800 font-black text-xs uppercase tracking-wider mb-2">Style</label>
                  <div className="relative">
                    <select 
                      className="w-full p-3 rounded-xl bg-gray-50 border-4 border-gray-100 focus:border-[#00AEEF] outline-none appearance-none font-bold text-gray-700 transition-all shadow-sm focus:bg-white cursor-pointer text-sm" 
                      value={ethnicity} 
                      onChange={(e) => setEthnicity(e.target.value)}
                    >
                      <option value="African">African</option>
                      <option value="European">European</option>
                      <option value="Asian">Asian</option>
                      <option value="American">American</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={16} />
                  </div>
               </div>
               
               {/* Gender Select */}
               <div>
                  <label className="block text-gray-800 font-black text-xs uppercase tracking-wider mb-2">Gender</label>
                  <div className="relative">
                    <select 
                      className="w-full p-3 rounded-xl bg-gray-50 border-4 border-gray-100 focus:border-[#00AEEF] outline-none appearance-none font-bold text-gray-700 transition-all shadow-sm focus:bg-white cursor-pointer text-sm" 
                      value={gender} 
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="Girl">Girl</option>
                      <option value="Boy">Boy</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={16} />
                  </div>
               </div>
             </div>
             
             {/* Spacer */}
             <div className="py-2"></div>

             <div className="space-y-3">
                <Button onClick={handleGenerate} className="w-full py-4 text-lg bg-[#00AEEF] hover:bg-[#009CDD] border-[#008CBA] text-white shadow-[#008CBA]/30" icon={<Wand2 size={24} />}>
                  GENERATE WITH GEMINI AI
                </Button>
                <Button onClick={onSkip} variant="neutral" className="w-full font-bold text-gray-400 hover:text-gray-600 border-transparent hover:border-gray-200 uppercase tracking-widest text-sm">
                  Skip for now
                </Button>
             </div>
          </div>
      </Card>

      {/* Generation Modal / Overlay */}
      <AnimatePresence>
        {(loading || generatedImage) && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0, y: 20 }}
                    className="bg-white p-6 rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10 border-4 border-white flex flex-col items-center text-center overflow-hidden"
                >
                    {loading && (
                        <div className="py-10 flex flex-col items-center justify-center min-h-[300px] w-full">
                            <LoadingSpinner variant="blue" />
                            <p className="text-gray-400 font-black mt-8 text-lg animate-pulse leading-relaxed tracking-widest uppercase">
                              Summoning your hero...
                            </p>
                        </div>
                    )}

                    {!loading && generatedImage && (
                        <div className="flex flex-col items-center w-full">
                             <div className="relative mb-6 mt-2">
                                <div className="absolute inset-0 bg-[#F7931E] rounded-full blur-xl opacity-20 animate-pulse"></div>
                                <img src={generatedImage} alt="Avatar" className="w-48 h-48 rounded-full border-8 border-white shadow-xl relative z-10 object-cover bg-gray-100" />
                                <div className="absolute -bottom-2 -right-2 bg-[#8CC63F] text-white p-2 rounded-full border-4 border-white z-20 shadow-lg">
                                    <Check size={24} strokeWidth={4} />
                                </div>
                             </div>
                             
                             <h3 className="text-2xl font-black text-gray-800 uppercase mb-1">Fantastic!</h3>
                             <p className="text-gray-500 font-medium mb-6">This hero looks ready to win.</p>
                             
                             <div className="w-full space-y-3">
                                <Button onClick={() => onAvatarCreated(generatedImage)} variant="secondary" className="w-full py-4 text-lg">
                                  USE THIS AVATAR
                                </Button>
                                <Button onClick={resetGeneration} variant="neutral" className="w-full font-bold uppercase tracking-widest text-gray-500">
                                  TRY AGAIN
                                </Button>
                             </div>
                        </div>
                    )}
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};