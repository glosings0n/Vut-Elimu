import React, { useState } from 'react';
import { UserProfile, UserRole } from '../../types';
import { Modal, Button } from '../UI';
import { Trophy, Medal, Crown, Shield, User, Users, Globe, School, Star } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  globalRankings: UserProfile[];
  schoolGroups: UserProfile[];
  currentUser: UserProfile;
}

export const LeaderboardModal: React.FC<Props> = ({ isOpen, onClose, globalRankings, schoolGroups, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'GLOBAL' | 'SCHOOL'>(
    currentUser.role === UserRole.PLAYER ? 'GLOBAL' : 'SCHOOL'
  );

  if (!isOpen) return null;

  const showSchoolTab = currentUser.role === UserRole.SCHOOL || currentUser.role === UserRole.GROUP;

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-400 fill-yellow-400';
      case 1: return 'text-gray-300 fill-gray-300';
      case 2: return 'text-amber-600 fill-amber-600';
      default: return 'text-gray-200';
    }
  };

  const renderList = (data: UserProfile[], type: 'PLAYER' | 'GROUP') => {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Trophy size={48} className="mb-2 opacity-50" />
                <p className="font-bold uppercase tracking-widest text-sm">No rankings yet</p>
            </div>
        );
    }

    // Removed fixed height here to let parent handle scrolling
    return (
        <div className="space-y-3 pb-4">
            {data.map((user, idx) => {
                const isMe = user.id === currentUser.id;
                return (
                    <div 
                        key={user.id || idx} 
                        className={`flex items-center gap-4 p-3 rounded-2xl border-2 transition-all ${isMe ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                    >
                        {/* Rank */}
                        <div className="w-8 flex justify-center shrink-0">
                            {idx < 3 ? (
                                <Crown size={24} className={getMedalColor(idx)} />
                            ) : (
                                <span className="font-black text-gray-400 text-lg">#{idx + 1}</span>
                            )}
                        </div>

                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100 shrink-0">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    {type === 'GROUP' ? <Users size={20} /> : <User size={20} />}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className={`font-black text-sm md:text-base truncate ${isMe ? 'text-blue-600' : 'text-gray-700'}`}>
                                {user.name} {isMe && "(You)"}
                            </h3>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                                <span>Lvl {user.level}</span>
                                {type === 'GROUP' && user.stats.wins !== undefined && (
                                    <>• <span>{user.stats.wins} Wins</span></>
                                )}
                            </div>
                        </div>

                        {/* Points */}
                        <div className="text-right shrink-0">
                             <span className="block font-black text-orange-500 text-lg leading-none">
                                 {user.stats.points.toLocaleString()}
                             </span>
                             <span className="text-[10px] font-bold text-gray-300 uppercase">PTS</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl relative border-4 border-white w-full max-w-lg mx-auto flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-[#00AEEF] p-6 relative overflow-hidden shrink-0">
            <div className="absolute inset-0 pattern-dots opacity-10"></div>
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
                        <Trophy className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">Leaderboard</h2>
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Top Champions</p>
                    </div>
                </div>
                <button onClick={onClose} className="bg-white/10 p-2 rounded-full hover:bg-white/20 text-white transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-2 bg-gray-50 border-b-2 border-gray-100 shrink-0">
             <button 
                onClick={() => setActiveTab('GLOBAL')}
                className={`flex-1 py-3 rounded-xl font-black text-xs md:text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${activeTab === 'GLOBAL' ? 'bg-white text-blue-500 shadow-md border-2 border-blue-50' : 'text-gray-400 hover:bg-gray-200'}`}
             >
                 <Globe size={16} /> Global Players
             </button>
             {showSchoolTab && (
                 <button 
                    onClick={() => setActiveTab('SCHOOL')}
                    className={`flex-1 py-3 rounded-xl font-black text-xs md:text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${activeTab === 'SCHOOL' ? 'bg-white text-orange-500 shadow-md border-2 border-orange-50' : 'text-gray-400 hover:bg-gray-200'}`}
                 >
                     <School size={16} /> School Groups
                 </button>
             )}
        </div>

        {/* Content - Scrollable Parent */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50 p-4 custom-scrollbar">
            {activeTab === 'GLOBAL' ? (
                renderList(globalRankings, 'PLAYER')
            ) : (
                renderList(schoolGroups, 'GROUP')
            )}
        </div>
      </div>
    </Modal>
  );
};