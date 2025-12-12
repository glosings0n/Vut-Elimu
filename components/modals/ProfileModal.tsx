import React from 'react';
import { UserProfile, UserRole } from '../../types';
import { Modal, Button } from '../UI';
import { LogOut, Users, Trophy, Medal, School, User, Star } from 'lucide-react';
import { soundService } from '../../services/soundService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onLogout: () => void;
  onSwitchGroup?: () => void;
}

export const ProfileModal: React.FC<Props> = ({ isOpen, onClose, user, onLogout, onSwitchGroup }) => {
  if (!isOpen) return null;

  const isSchool = user.role === UserRole.SCHOOL;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl relative border-4 border-white w-full max-w-xs mx-auto">
        {/* Compact Header Background */}
        <div className="h-20 bg-gradient-to-r from-[#00AEEF] to-[#0085B6] relative overflow-hidden">
             <div className="absolute inset-0 pattern-dots opacity-20"></div>
        </div>

        {/* Avatar - Compact & Centered */}
        <div className="flex justify-center -mt-10 relative z-10">
             {user.photoURL ? (
                 <img src={user.photoURL} alt="Profile" className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-white object-cover" />
             ) : (
                 <div className="w-20 h-20 bg-white rounded-full border-4 border-white flex items-center justify-center text-4xl shadow-md text-[#00AEEF]">
                     {isSchool ? <School size={40} /> : <User size={40} />}
                 </div>
             )}
             {/* Level Badge - Floating */}
             <div className="absolute bottom-0 right-1/2 translate-x-10 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-black text-[10px] border-2 border-white shadow-sm flex items-center gap-1">
                 <Star size={10} fill="currentColor" /> LVL {user.level}
             </div>
        </div>

        {/* Info */}
        <div className="px-4 pb-4 pt-2 text-center">
            {/* Name */}
            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight leading-tight mb-0.5 truncate">
                {user.name}
            </h2>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-4">
                {isSchool ? 'School Class Group' : 'Individual Player'}
            </p>

            {/* Stats - Compact Row */}
            <div className="flex items-stretch gap-2 mb-4">
                <div className="flex-1 bg-orange-50 rounded-xl p-2 border border-orange-100 flex flex-col items-center justify-center">
                    <Trophy size={16} className="text-orange-500 mb-1" />
                    <span className="block text-lg font-black text-gray-800 leading-none">{user.stats?.points || 0}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Score</span>
                </div>
                <div className="flex-1 bg-purple-50 rounded-xl p-2 border border-purple-100 flex flex-col items-center justify-center">
                    <Medal size={16} className="text-purple-500 mb-1" />
                    <span className="block text-lg font-black text-gray-800 leading-none">{user.level}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Level</span>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
                {isSchool && onSwitchGroup && (
                    <Button 
                        onClick={() => { soundService.playClick(); onSwitchGroup(); }} 
                        variant="primary" 
                        className="w-full py-3 text-sm h-12"
                        icon={<Users size={18} />}
                    >
                        SWITCH GROUP
                    </Button>
                )}

                <Button 
                    onClick={() => { soundService.playClick(); onLogout(); }} 
                    variant="danger" 
                    className="w-full py-3 text-sm h-12"
                    icon={<LogOut size={18} />}
                >
                    LOG OUT
                </Button>
            </div>
            
            <button 
                onClick={onClose}
                className="mt-3 text-gray-400 font-bold text-xs hover:text-gray-600 uppercase tracking-wide p-2"
            >
                Close
            </button>
        </div>
      </div>
    </Modal>
  );
};