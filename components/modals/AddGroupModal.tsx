import React, { useState, useEffect } from 'react';
import { Users, Save, Wand2 } from 'lucide-react';
import { Modal, Button, LoadingSpinner } from '../UI';
import { soundService } from '../../services/soundService';
import { generateTeamLogo } from '../../services/geminiService';
import { UserProfile } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: Partial<UserProfile>) => void;
  initialData?: UserProfile | null;
}

export const AddGroupModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setName(initialData.name);
        } else {
            setName("");
        }
        setLoading(false);
        setStatus("");
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    soundService.playClick();
    
    setLoading(true);
    
    // Only generate a new logo if it's a new group, or if the user explicitly requested a change (not implemented yet, assuming new for now)
    // Or if we are editing but want to keep the old avatar if name hasn't changed drastically? 
    // For simplicity, let's regenerate only if creating new, or preserve if editing unless we add a "Regenerate" button.
    // Here we will generate if creating new.
    
    let avatarUrl = initialData?.photoURL;

    if (!initialData) {
        setStatus(`Designing logo for "${name}"...`);
        const logo = await generateTeamLogo(name);
        if (logo) {
            avatarUrl = logo;
        }
    }

    onSave({
        ...initialData,
        name: name,
        photoURL: avatarUrl,
        level: initialData?.level || 1,
        stats: initialData?.stats || { points: 0, gamesPlayed: 0 }
    });
    
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={loading ? () => {} : onClose}>
      <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl relative border-4 border-white">
        {/* Header */}
        <div className="bg-white p-6 pb-2">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="text-blue-600" size={20} />
                </div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                    {initialData ? 'Edit Class Group' : 'New Class Group'}
                </h2>
            </div>
        </div>

        <div className="p-6 pt-2 space-y-6">
           {loading ? (
               <div className="py-12 flex flex-col items-center justify-center">
                   <LoadingSpinner variant="blue" />
                   <p className="mt-6 text-gray-500 font-bold animate-pulse text-center">{status}</p>
               </div>
           ) : (
               <>
                   <div>
                      <label className="block text-gray-400 font-black text-xs uppercase tracking-wider mb-2 ml-1">
                          Group Name / Class Title
                      </label>
                      <input 
                         type="text"
                         autoFocus
                         className="w-full bg-gray-50 border-[3px] border-gray-200 focus:border-[#00AEEF] focus:bg-white rounded-xl p-4 text-xl text-gray-800 font-black placeholder-gray-300 transition-all outline-none"
                         placeholder="e.g. The Math Lions"
                         value={name}
                         onChange={(e) => setName(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      />
                   </div>

                   <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-100 flex gap-3 items-start">
                       <Wand2 className="text-blue-500 shrink-0 mt-1" size={20} />
                       <p className="text-sm text-blue-800 font-medium">
                           Gemini AI will automatically design a unique team badge based on your group name!
                       </p>
                   </div>

                   <div className="flex gap-3 pt-2">
                       <button 
                          onClick={onClose}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold py-4 rounded-xl transition-colors uppercase tracking-wide"
                       >
                          Cancel
                       </button>
                       <Button 
                          onClick={handleSubmit}
                          className="flex-[2] py-4 text-lg"
                          disabled={!name.trim()}
                          icon={<Save size={20} />}
                       >
                          {initialData ? 'SAVE CHANGES' : 'CREATE GROUP'}
                       </Button>
                   </div>
               </>
           )}
        </div>
      </div>
    </Modal>
  );
};