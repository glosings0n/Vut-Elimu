import React, { useState } from 'react';
import { HelpCircle, Mail, MessageCircle, Send } from 'lucide-react';
import { Modal } from '../UI';
import { soundService } from '../../services/soundService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [feedback, setFeedback] = useState("");

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const words = val.trim() ? val.trim().split(/\s+/) : [];
    
    // Allow typing if under limit, or if deleting (length getting smaller)
    if (words.length <= 20 || val.length < feedback.length) {
        setFeedback(val);
    }
  };

  const wordCount = feedback.trim() ? feedback.trim().split(/\s+/).length : 0;

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl relative border-4 border-white">
        {/* Header */}
        <div className="bg-white p-6 pb-2">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="text-gray-700" size={20} />
                </div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">Help</h2>
            </div>
        </div>

        <div className="p-6 pt-2 space-y-4">
           {/* Feedback Form - Compact */}
           <div>
              <div className="relative">
                  <textarea 
                     className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#00AEEF] focus:bg-white rounded-xl p-3 text-sm text-gray-800 font-bold placeholder-gray-400 resize-none transition-all outline-none"
                     rows={3}
                     placeholder="Send us your feedback (max 20 words)..."
                     value={feedback}
                     onChange={handleFeedbackChange}
                  ></textarea>
                  <div className={`absolute bottom-2 right-2 text-[10px] font-bold ${wordCount >= 20 ? 'text-red-500' : 'text-gray-400'}`}>
                    {wordCount}/20
                  </div>
              </div>
              <button 
                 onClick={() => { soundService.playClick(); setFeedback(""); }}
                 className="w-full bg-[#00AEEF] hover:bg-[#009CDD] text-white font-black py-3 rounded-xl mt-2 flex items-center justify-center gap-2 shadow-md uppercase tracking-wide text-sm active:scale-[0.98] transition-transform"
              >
                 <Send size={16} /> SEND
              </button>
           </div>

           {/* Contact Buttons */}
           <div className="grid grid-cols-2 gap-3">
              <a 
                 href="mailto:glosings0n.dev@gmail.com"
                 className="flex items-center justify-center gap-2 bg-gray-50 hover:bg-red-50 border-2 border-gray-100 hover:border-red-100 p-3 rounded-xl transition-all active:scale-95"
                 onClick={() => soundService.playClick()}
              >
                 <Mail className="text-red-500" size={18} />
                 <span className="text-xs font-black text-gray-600 uppercase">Email</span>
              </a>
              <a 
                 href="https://wa.me/243813445417"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 bg-gray-50 hover:bg-green-50 border-2 border-gray-100 hover:border-green-100 p-3 rounded-xl transition-all active:scale-95"
                 onClick={() => soundService.playClick()}
              >
                 <MessageCircle className="text-green-500" size={18} />
                 <span className="text-xs font-black text-gray-600 uppercase">WhatsApp</span>
              </a>
           </div>

           {/* Developer Support - Compact */}
           <div className="bg-yellow-50 border-2 border-yellow-100 rounded-xl p-3 text-center">
              <p className="text-xs text-yellow-800 font-bold">
                 Support Developer (M-Pesa): <span className="select-all text-yellow-900 bg-yellow-100 px-1 rounded">+254728388790</span>
              </p>
              <div className="flex flex-col items-center mt-1">
                 <span className="text-[10px] text-yellow-700 font-bold tracking-widest">Georges Byona</span>
                 <a 
                    href="https://linktr.ee/glosings0n"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-500 font-bold hover:underline"
                 >
                    @glosings0n
                 </a>
              </div>
           </div>

           <button 
              onClick={onClose}
              className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white font-black py-3 rounded-xl shadow-[0_4px_0_#991B1B] active:shadow-none active:translate-y-1 transition-all text-lg tracking-wider"
           >
              CLOSE
           </button>
        </div>
      </div>
    </Modal>
  );
};