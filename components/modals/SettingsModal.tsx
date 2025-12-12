import React from 'react';
import { Settings as SettingsIcon, Volume2, Music, X, Globe, Check, VolumeX } from 'lucide-react';
import { Modal } from '../UI';
import { soundService } from '../../services/soundService';
import { UserMode } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    music: boolean;
    sound: boolean;
    language: 'EN' | 'FR' | 'SW';
  };
  onUpdateSettings: (newSettings: any) => void;
  userMode?: UserMode | string;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onUpdateSettings, userMode }) => {
  if (!isOpen) return null;

  const isDeafMode = userMode === UserMode.DEAF;

  const toggleSound = () => {
    if (isDeafMode) return;
    const newVal = !settings.sound;
    onUpdateSettings({ ...settings, sound: newVal });
    soundService.setSoundEnabled(newVal);
    soundService.playClick();
  };

  const toggleMusic = () => {
    if (isDeafMode) return;
    const newVal = !settings.music;
    onUpdateSettings({ ...settings, music: newVal });
    soundService.playClick();
  };

  const setLanguage = (lang: 'EN' | 'FR' | 'SW') => {
    onUpdateSettings({ ...settings, language: lang });
    soundService.playClick();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl relative border-4 border-white">
        {/* Header */}
        <div className="bg-white p-6 pb-2">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <SettingsIcon className="text-gray-700" size={20} />
                </div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">Settings</h2>
            </div>
        </div>

        <div className="p-6 pt-2">
          {/* Language Selection */}
          <div className="mb-8">
            <label className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest mb-3">
                <Globe size={14} /> Language
            </label>
            <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1 shadow-inner">
              {(['EN', 'FR', 'SW'] as const).map((lang) => {
                  const isActive = settings.language === lang;
                  return (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`flex-1 py-3 rounded-xl font-black text-sm transition-all relative overflow-hidden ${
                        isActive 
                          ? 'bg-[#00AEEF] text-white shadow-lg scale-100' 
                          : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                      }`}
                    >
                      {lang}
                      {isActive && <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full"></div>}
                    </button>
                  );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-4 mb-8">
            {isDeafMode && (
                <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs font-bold text-center border-2 border-red-100 mb-2">
                    Sound disabled in Deaf Mode
                </div>
            )}
            
            {/* Music Toggle */}
            <div 
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${!isDeafMode ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'} ${settings.music && !isDeafMode ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}
                onClick={toggleMusic}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${settings.music && !isDeafMode ? 'bg-purple-500 text-white shadow-md' : 'bg-gray-200 text-gray-500'}`}>
                  {isDeafMode ? <VolumeX size={24} /> : <Music size={24} />}
                </div>
                <div>
                    <span className={`block font-black text-lg ${settings.music && !isDeafMode ? 'text-purple-900' : 'text-gray-600'}`}>Music</span>
                    <span className="text-xs font-bold text-gray-400">{isDeafMode ? 'Locked Off' : settings.music ? 'On' : 'Off'}</span>
                </div>
              </div>
              <div className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${settings.music && !isDeafMode ? 'bg-purple-500' : 'bg-gray-300'}`}>
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${settings.music && !isDeafMode ? 'translate-x-6' : ''}`} />
              </div>
            </div>

            {/* Sound Toggle */}
            <div 
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${!isDeafMode ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'} ${settings.sound && !isDeafMode ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}
                onClick={toggleSound}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${settings.sound && !isDeafMode ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-200 text-gray-500'}`}>
                  {isDeafMode ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </div>
                <div>
                    <span className={`block font-black text-lg ${settings.sound && !isDeafMode ? 'text-orange-900' : 'text-gray-600'}`}>Sound FX</span>
                    <span className="text-xs font-bold text-gray-400">{isDeafMode ? 'Locked Off' : settings.sound ? 'On' : 'Off'}</span>
                </div>
              </div>
              <div className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${settings.sound && !isDeafMode ? 'bg-orange-500' : 'bg-gray-300'}`}>
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${settings.sound && !isDeafMode ? 'translate-x-6' : ''}`} />
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white font-black py-4 rounded-xl shadow-[0_4px_0_#991B1B] active:shadow-none active:translate-y-1 transition-all text-lg tracking-wider"
          >
            CLOSE
          </button>
        </div>
      </div>
    </Modal>
  );
};