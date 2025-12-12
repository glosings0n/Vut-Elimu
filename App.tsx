import React, { useState, useEffect } from 'react';
import { AppState, GameType, UserMode, UserRole, UserProfile, UserStats } from './types';
import { generateInitialQuestions } from './services/geminiService';
import { soundService } from './services/soundService';
import { firebaseService } from './services/firebase';
import { speak, stopSpeaking } from './services/accessibilityService';
import { Button, Card, LoadingScreen, LoadingSpinner, Modal } from './components/UI';
import { AvatarCreator } from './components/AvatarCreator';
import { GameContainer } from './components/games/GameContainer';
import { MathGame } from './components/games/MathGame';
import { GKGame } from './components/games/GKGame';
import { LiveLanguageGame } from './components/games/LiveLanguageGame';
import { ListeningGame } from './components/games/ListeningGame';
import { BlindGameSession } from './components/games/BlindGameSession';
import { SideMenu } from './components/SideMenu';
import { SettingsModal } from './components/modals/SettingsModal';
import { GuideModal } from './components/modals/GuideModal';
import { HelpModal } from './components/modals/HelpModal';
import { ProfileModal } from './components/modals/ProfileModal';
import { AddGroupModal } from './components/modals/AddGroupModal';
import { LeaderboardModal } from './components/modals/LeaderboardModal';
import { Globe, Languages, Accessibility, GraduationCap, User, ArrowRight, School, Users, Eye, Ear, EyeOff, EarOff, Calculator, Rocket, MessageCircle, Plus, Medal, Crown, Trash2, Edit2, Trophy, Star, Check, X as XIcon, Pencil, Hand, ArrowLeft } from 'lucide-react';

const INITIAL_USER: UserProfile = {
  name: 'Player 1',
  level: 1,
  mode: UserMode.STANDARD,
  role: UserRole.PLAYER, 
  stats: { points: 0, gamesPlayed: 0 }
};

const SESSION_KEY = 'vut_elimu_user_session';

// --- FOOTER COMPONENT ---
const AppFooter = ({ fixed = false }: { fixed?: boolean }) => (
  <div className={`w-full flex items-center justify-center gap-4 text-white/60 font-bold text-xs md:text-sm tracking-widest font-fredoka pointer-events-none z-0 ${fixed ? 'absolute bottom-6 left-0 right-0' : 'py-8 mt-auto'}`}>
     <div className="h-px w-8 bg-white/40"></div>
     <span className="pointer-events-auto">Built by <a href="https://linktr.ee/glosings0n" target="_blank" rel="noopener noreferrer" className="text-[#FFC107] text-opacity-100 drop-shadow-sm hover:underline hover:text-white transition-colors normal-case text-base">@glosings0n</a> - 2k25</span>
     <div className="h-px w-8 bg-white/40"></div>
  </div>
);

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.LOADING);
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [schoolGroups, setSchoolGroups] = useState<UserProfile[]>([]); 
  const [globalRankings, setGlobalRankings] = useState<UserProfile[]>([]);
  const [questionsData, setQuestionsData] = useState<any>(null);
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [ropePosition, setRopePosition] = useState(0); 
  const [sessionScore, setSessionScore] = useState(0); 
  
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [isAttacking, setIsAttacking] = useState(false);
  const [idInput, setIdInput] = useState("");
  const [idError, setIdError] = useState("");
  
  // UX State
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserProfile | null>(null);

  // Identity Confirmation Modal
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [showConfirmUser, setShowConfirmUser] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [settings, setSettings] = useState({
    music: true,
    sound: true,
    language: 'EN' as 'EN' | 'FR' | 'SW'
  });

  // --- BLIND MODE GLOBAL TTS ---
  useEffect(() => {
    if (user.mode === UserMode.BLIND) {
        let lastReadText = "";

        const handleHover = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            // 1. Identify if we are inside an interactive element (Button, Input, Link)
            // We traverse up to find the main interactive container
            const interactive = target.closest('button, a, input, [role="button"], label');
            
            let elementToRead = interactive ? (interactive as HTMLElement) : target;
            
            // 2. Extract Text
            // Priority: aria-label -> value -> innerText
            let text = elementToRead.getAttribute('aria-label') || (elementToRead as HTMLInputElement).value || elementToRead.innerText;
            
            // If the target is NOT interactive, we only want to read it if it has direct text content
            // to avoid reading huge container blocks when hovering whitespace.
            if (!interactive) {
                 // Check if it's a heading or paragraph directly
                 const isTextBlock = target.matches('h1, h2, h3, h4, h5, h6, p, span, li, div');
                 if (!isTextBlock) return; // Ignore random structural divs unless they have text

                 // Simple check: does it have non-empty text?
                 if (!text || text.trim().length === 0) return;
            }

            if (text) {
                // Clean text (remove excessive whitespace)
                text = text.replace(/\s+/g, ' ').trim();
                
                // 3. Speak only if new
                if (text.length > 0 && text !== lastReadText) {
                    lastReadText = text;
                    speak(text);
                }
            }
        };

        // Use capture to ensure we catch events
        window.addEventListener('mouseover', handleHover);
        
        // Initial state announcements
        if (appState === AppState.MODE_SELECT) speak("Select your mode. Standard, Blind, or Deaf.");
        if (appState === AppState.ROLE_SELECT) speak("Are you a School or an Individual Player?");
        if (appState === AppState.ID_ENTRY) speak("Please ask for assistance to enter your Login ID.");
        if (appState === AppState.DASHBOARD) speak("Welcome to the Dashboard. Select a game to play.");

        return () => {
            window.removeEventListener('mouseover', handleHover);
            stopSpeaking();
        };
    }
  }, [user.mode, appState]);

  // --- DEAF MODE LOGIC ---
  useEffect(() => {
      if (user.mode === UserMode.DEAF) {
          // Force Mute
          soundService.setLocked(true);
          setSettings(prev => ({ ...prev, music: false, sound: false }));
          
          // Stop BGM if playing
          const bgm = document.getElementById('bgm') as HTMLAudioElement;
          if (bgm) bgm.pause();
      } else {
          // Unlock if switching away (though rare)
          soundService.setLocked(false);
      }
  }, [user.mode]);

  useEffect(() => {
    const bgm = document.getElementById('bgm') as HTMLAudioElement;
    if (bgm && !soundService.isLocked()) {
        if (appState === AppState.GAME) {
            bgm.pause();
            return;
        }
        bgm.volume = 0.15;
        if (settings.music) {
            if (bgm.paused) bgm.play().catch(() => {});
        } else {
            bgm.pause();
        }
    }
  }, [settings.music, appState]);

  // Initial Load & Session Restoration
  useEffect(() => {
    const restoreSession = async () => {
        setLoadingMessage("Checking Session...");
        
        // 1. Pre-load Questions
        generateInitialQuestions(1).then(data => setQuestionsData(data));
        
        // 2. Check Browser Cache for User
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
            try {
                const sessionUser = JSON.parse(savedSession) as UserProfile;
                if (sessionUser && sessionUser.id) {
                    console.log("Restoring session for:", sessionUser.id);
                    // Verify with DB again to get latest stats AND ensure user still exists
                    const freshUser = await firebaseService.getUser(sessionUser.id, sessionUser.role as UserRole);
                    
                    if (freshUser) {
                        setUser(freshUser);
                        // Refresh local storage with normalized data
                        localStorage.setItem(SESSION_KEY, JSON.stringify(freshUser));
                        
                        // Fetch Global Leaderboard for everyone
                        firebaseService.getGlobalLeaderboard().then(setGlobalRankings);

                        if (freshUser.role === UserRole.SCHOOL) {
                             const groups = await firebaseService.getSchoolGroups(freshUser.id!);
                             setSchoolGroups(groups);
                             setAppState(AppState.GROUP_SELECT);
                        } else if (freshUser.role === UserRole.GROUP && freshUser.parentId) {
                             // Fetch sibling groups for leaderboard context
                             const groups = await firebaseService.getSchoolGroups(freshUser.parentId);
                             setSchoolGroups(groups);
                             setAppState(AppState.DASHBOARD);
                        } else {
                             setAppState(AppState.DASHBOARD);
                        }
                        return; // Successfully restored
                    } else {
                        // User was deleted from DB, clear session
                         console.warn("User doc not found, clearing session.");
                         localStorage.removeItem(SESSION_KEY);
                    }
                }
            } catch (e) {
                console.error("Session restore failed", e);
                localStorage.removeItem(SESSION_KEY);
            }
        }

        // No session or invalid, go to mode select
        await new Promise(r => setTimeout(r, 1500)); 
        setAppState(AppState.MODE_SELECT);
    };

    restoreSession();
  }, []);

  const handleScore = (correct: boolean) => {
     if (correct) {
         soundService.playCorrect();
         // Blind mode specific feedback is now handled in BlindGameSession via Live API, 
         // but global score updates still happen here.
         if (user.mode === UserMode.BLIND) {
             // Optional: Local UI feedback sounds already played by service
         } 
         
         const pullStrength = 20; 
         setRopePosition(prev => {
             const newPos = prev + pullStrength;
             if (newPos >= 100) setTimeout(handleLevelUp, 2000); 
             return Math.min(newPos, 100);
         }); 
         setSessionScore(prev => prev + 20); 
     } else {
         soundService.playIncorrect();
         setRopePosition(prev => Math.max(prev - 20, -100)); 
         setIsAttacking(true);
         setTimeout(() => setIsAttacking(false), 600);
     }
  };

  const handleLevelUp = async () => {
      const nextLevel = user.level + 1;
      const newTotalPoints = (user.stats.points || 0) + sessionScore;
      
      if (user.mode === UserMode.BLIND) speak(`Level Up! You are now level ${nextLevel}.`);

      const updatedUser: UserProfile = { 
          ...user, 
          level: nextLevel, 
          stats: { ...user.stats, points: newTotalPoints } 
      };
      
      setUser(updatedUser);
      // Save to persistence
      if (updatedUser.role !== UserRole.GROUP) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
      }

      await firebaseService.updateUserProgress(updatedUser);

      if (user.role === UserRole.GROUP) {
          setSchoolGroups(prev => prev.map(g => g.id === user.id ? updatedUser : g));
      } else if (user.role === UserRole.PLAYER) {
          // If we are a player, refresh global leaderboard
          firebaseService.getGlobalLeaderboard().then(setGlobalRankings);
      }

      setLoadingMessage(`Level Up! Generating Level ${nextLevel} Questions...`);
      setRopePosition(0);
      setSessionScore(0);
      setAppState(AppState.DASHBOARD);
      
      generateInitialQuestions(nextLevel).then(data => setQuestionsData(data));
  };

  const resetGame = () => {
      setRopePosition(0);
      setSessionScore(0);
      setAppState(AppState.DASHBOARD);
      setSelectedGame(null);
      setIsAttacking(false);
  };

  const handleLogout = () => {
      localStorage.removeItem(SESSION_KEY);
      setShowProfile(false);
      setUser(INITIAL_USER);
      setSchoolGroups([]);
      setSessionScore(0);
      setIdInput("");
      setAppState(AppState.MODE_SELECT);
  };

  const handleSwitchGroup = () => {
      setShowProfile(false);
      setAppState(AppState.GROUP_SELECT);
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow only A-Z and 0-9, max 10 chars
      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (val.length <= 10) {
          setIdInput(val);
          setIdError("");
      }
  };

  const handleIdSubmit = async () => {
      if (!idInput) return;
      if (idInput.length < 5) {
          setIdError("ID must be 5 to 10 characters.");
          return;
      }
      setIsCheckingUser(true);
      
      try {
          const existingUser = await firebaseService.getUser(idInput, user.role as UserRole);
          
          if (existingUser) {
              setFoundUser(existingUser);
              setShowConfirmUser(true);
          } else {
              // Create New
              const newUser: UserProfile = {
                  ...user,
                  id: idInput,
                  name: idInput, 
                  stats: { points: 0, gamesPlayed: 0 },
                  level: 1
              };
              
              await firebaseService.createUser(newUser);
              finalizeLogin(newUser);
          }
      } catch (e) {
          console.error("Login Error", e);
          setIdError("Login failed. Try again.");
      } finally {
          setIsCheckingUser(false);
      }
  };

  const finalizeLogin = async (loggedUser: UserProfile) => {
      setUser(loggedUser);
      // Persist session
      localStorage.setItem(SESSION_KEY, JSON.stringify(loggedUser));
      
      // Fetch Global Leaderboard for everyone
      firebaseService.getGlobalLeaderboard().then(setGlobalRankings);

      if (loggedUser.role === UserRole.SCHOOL) {
          const groups = await firebaseService.getSchoolGroups(loggedUser.id!);
          setSchoolGroups(groups);
          setAppState(AppState.GROUP_SELECT);
      } else if (loggedUser.role === UserRole.GROUP && loggedUser.parentId) {
          const groups = await firebaseService.getSchoolGroups(loggedUser.parentId);
          setSchoolGroups(groups);
          setAppState(AppState.DASHBOARD);
      } else {
          if (!loggedUser.photoURL) {
               setAppState(AppState.AVATAR_CREATOR);
          } else {
               setAppState(AppState.DASHBOARD);
          }
      }
      setShowConfirmUser(false);
  };

  const handleConfirmUser = () => {
      if (foundUser) {
          finalizeLogin(foundUser);
      }
  };

  const handleDenyUser = () => {
      setFoundUser(null);
      setShowConfirmUser(false);
      setAppState(AppState.ID_ENTRY);
      setIdInput(""); // Clear input to allow trying another
      setIdError("");
  };

  const handleSaveGroup = async (groupData: Partial<UserProfile>) => {
      if (!user.id && !user.parentId) return;
      const schoolId = user.role === UserRole.SCHOOL ? user.id : user.parentId;
      if (!schoolId) return;

      const newGroupData: UserProfile = {
          name: groupData.name!,
          mode: user.mode, 
          role: UserRole.GROUP,
          level: 1,
          stats: { points: 0, gamesPlayed: 0 },
          photoURL: groupData.photoURL || "",
          ...groupData
      };
      
      const savedGroup = await firebaseService.saveSchoolGroup(schoolId, newGroupData);
      if (savedGroup) {
          if (editingGroup) {
              setSchoolGroups(prev => prev.map(g => g.id === editingGroup.id ? savedGroup : g));
          } else {
              setSchoolGroups([...schoolGroups, savedGroup]);
          }
      }

      setEditingGroup(null);
  };

  const handleDeleteGroup = async (groupName: string) => {
      const group = schoolGroups.find(g => g.name === groupName);
      if (!group || !user.id) return;
      
      if (window.confirm(`Are you sure you want to delete ${groupName}?`)) {
          setSchoolGroups(prev => prev.filter(g => g.name !== groupName));
          await firebaseService.deleteSchoolGroup(user.id, groupName);
      }
  };

  const openAddGroup = () => {
      setEditingGroup(null);
      setShowAddGroup(true);
  };

  const openEditGroup = (group: UserProfile) => {
      setEditingGroup(group);
      setShowAddGroup(true);
  };

  const selectGroup = (group: UserProfile) => {
      setUser(group);
      setAppState(AppState.DASHBOARD);
  };

  const onAvatarCreated = async (url: string) => {
      // 1. Show loading state immediately to indicate upload process
      setLoadingMessage("Saving your hero...");
      setAppState(AppState.LOADING);

      // 2. Prepare user update
      const updatedUser = { ...user, photoURL: url };
      
      try {
          // 3. Perform the upload/update
          const finalUrl = await firebaseService.updateUserProgress(updatedUser);
          
          // 4. Update local state with final URL (which might be the uploaded storage URL)
          const finalUser = { ...updatedUser, photoURL: finalUrl || url };
          setUser(finalUser);
          localStorage.setItem(SESSION_KEY, JSON.stringify(finalUser));
          
          // 5. Navigate to Dashboard
          setAppState(AppState.DASHBOARD);
      } catch (error) {
          console.error("Avatar save failed", error);
          setLoadingMessage("Error saving avatar.");
          setTimeout(() => setAppState(AppState.DASHBOARD), 2000);
      }
  };

  // --- UI RENDER HELPERS ---
  const GlobalUI = () => (
    <>
      <SideMenu 
        onSettingsClick={() => setShowSettings(true)}
        onGuideClick={() => setShowGuide(true)}
        onHelpClick={() => setShowHelp(true)}
        onLeaderboardClick={() => {
            // Refresh rankings when opening
            firebaseService.getGlobalLeaderboard().then(setGlobalRankings);
            if (user.parentId) {
                firebaseService.getSchoolGroups(user.parentId).then(setSchoolGroups);
            }
            setShowLeaderboard(true);
        }}
      />
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        settings={settings}
        onUpdateSettings={setSettings}
        userMode={user.mode}
      />
      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <LeaderboardModal 
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        globalRankings={globalRankings}
        schoolGroups={schoolGroups}
        currentUser={user}
      />
      <ProfileModal 
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
        onLogout={handleLogout}
        onSwitchGroup={user.role === UserRole.GROUP ? handleSwitchGroup : undefined}
      />
      <AddGroupModal 
        isOpen={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        onSave={handleSaveGroup}
        initialData={editingGroup}
      />
      
      {/* Loading Modal for User Login */}
      <Modal isOpen={isCheckingUser} onClose={() => {}}>
         <div className="bg-white rounded-3xl p-10 flex flex-col items-center justify-center border-4 border-white shadow-xl">
             <LoadingSpinner variant="blue" />
             <p className="mt-6 text-gray-500 font-bold animate-pulse text-lg tracking-wider uppercase">Connecting...</p>
         </div>
      </Modal>

      {/* Confirm Identity Modal */}
      {showConfirmUser && foundUser && (
        <Modal isOpen={showConfirmUser} onClose={() => {}}>
            <div className="bg-white rounded-[2rem] p-6 text-center shadow-2xl border-4 border-white max-w-sm w-full mx-auto">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-blue-200">
                    {foundUser.photoURL ? (
                        <img src={foundUser.photoURL} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <User size={40} className="text-blue-500" />
                    )}
                </div>
                <h2 className="text-2xl font-black text-gray-800 uppercase mb-2">Welcome Back!</h2>
                <p className="text-gray-500 font-bold mb-6">
                    We found a profile for <span className="text-blue-500 font-black">"{foundUser.name}"</span>. Is this you?
                </p>
                
                <div className="space-y-3">
                    <Button onClick={handleConfirmUser} variant="secondary" className="w-full" icon={<Check />}>
                        YES, IT'S ME
                    </Button>
                    <Button onClick={handleDenyUser} variant="neutral" className="w-full" icon={<XIcon />}>
                        NO, WRONG ID
                    </Button>
                </div>
            </div>
        </Modal>
      )}
    </>
  );

  // -- RENDERERS --
  
  // (Rest of the render methods remain largely the same, mostly handled by GlobalUI being included)

  if (appState === AppState.LOADING) {
    return <LoadingScreen text={loadingMessage} />;
  }

  if (appState === AppState.MODE_SELECT) {
    return (
      <div className="min-h-screen bg-[#00AEEF] flex items-center justify-center p-4 relative">
        <GlobalUI />
        <Card className="max-w-md w-full text-center relative z-10" title="Select Mode" watermark={<EyeOff />}>
          <div className="space-y-4">
            <Button 
                className="w-full text-lg h-24 justify-start pl-8" 
                icon={<Eye size={32} />}
                onClick={() => { setUser({...user, mode: UserMode.STANDARD}); setAppState(AppState.ROLE_SELECT); }}
                aria-label="Start Standard Mode, I can see and hear"
            >
                <div className="flex flex-col items-start">
                  <span className="font-black text-xl">Start Standard</span>
                  <span className="text-xs opacity-80 font-bold">I can see and hear</span>
                </div>
            </Button>
            <Button 
                className="w-full text-lg h-24 justify-start pl-8" 
                variant="warning" 
                icon={<EyeOff size={32} />} 
                onClick={() => { setUser({...user, mode: UserMode.BLIND}); setAppState(AppState.ROLE_SELECT); }}
                aria-label="Start Blind Mode, Auditory Assistant On"
            >
                <div className="flex flex-col items-start">
                  <span className="font-black text-xl text-amber-900">Start Blind Mode</span>
                  <span className="text-xs opacity-80 font-bold text-amber-800">Auditory Assistant On</span>
                </div>
            </Button>
            <Button 
                className="w-full text-lg h-24 justify-start pl-8" 
                variant="accent" 
                icon={<EarOff size={32} />} 
                onClick={() => { setUser({...user, mode: UserMode.DEAF}); setAppState(AppState.ROLE_SELECT); }}
                aria-label="Start Deaf Mode, Visuals Only"
            >
                <div className="flex flex-col items-start">
                  <span className="font-black text-xl">Start Deaf Mode</span>
                  <span className="text-xs opacity-80 font-bold">Visuals Only (No Sound)</span>
                </div>
            </Button>
          </div>
        </Card>
        <AppFooter fixed />
      </div>
    );
  }

  if (appState === AppState.ROLE_SELECT) {
    return (
      <div className="min-h-screen bg-[#00AEEF] flex items-center justify-center p-4 relative">
        <GlobalUI />
        <Card className="max-w-md w-full text-center relative z-10" title="Who are you?" watermark={<Users />}>
          <div className="space-y-4">
            <Button 
                className="w-full text-lg h-28 justify-start pl-8" 
                icon={<School size={40} />}
                onClick={() => { setUser({...user, role: UserRole.SCHOOL}); setAppState(AppState.ID_ENTRY); }}
                aria-label="Start as School, Play as a Class"
            >
                <div className="flex flex-col items-start">
                  <span className="font-black text-xl">Start as School</span>
                  <span className="text-xs opacity-80 font-bold">Play as a Class</span>
                </div>
            </Button>
            <Button 
                className="w-full text-lg h-28 justify-start pl-8" 
                variant="secondary"
                icon={<User size={40} />}
                onClick={() => { setUser({...user, role: UserRole.PLAYER}); setAppState(AppState.ID_ENTRY); }}
                aria-label="Start as Player, Play Solo"
            >
                <div className="flex flex-col items-start">
                   <span className="font-black text-xl">Start as Player</span>
                   <span className="text-xs opacity-80 font-bold">Play Solo</span>
                </div>
            </Button>
          </div>
        </Card>
        <AppFooter fixed />
      </div>
    );
  }

  if (appState === AppState.ID_ENTRY) {
      const isSchool = user.role === UserRole.SCHOOL;
      return (
        <div className="min-h-screen bg-[#00AEEF] flex items-center justify-center p-4 relative">
            <GlobalUI />
            
            {/* Main Content Area */}
            <div className="w-full max-w-md relative z-10">
                
                {/* Back Button - Positioned outside the Card to avoid overlap and z-index issues */}
                <div className="absolute -top-16 left-0 z-20">
                    <Button 
                        onClick={() => { soundService.playClick(); setAppState(AppState.ROLE_SELECT); setIdInput(""); setIdError(""); }} 
                        variant="neutral" 
                        className="!w-12 !h-12 !rounded-full !p-0 border-4 border-white shadow-lg"
                        aria-label="Go Back"
                    >
                        <ArrowLeft size={24} />
                    </Button>
                </div>

                <Card className="w-full relative pt-12" title={isSchool ? "SCHOOL LOGIN" : "PLAYER LOGIN"} watermark={<User />}>
                    <div className="space-y-6 pt-2">
                        <div>
                            <label className="block text-gray-400 font-black text-xs uppercase tracking-wider mb-2 ml-2">
                                {isSchool ? "SCHOOL CODE (5-10 CHARS)" : "PLAYER ID (5-10 CHARS)"}
                            </label>
                            <div className="relative group">
                            <input 
                                type="text"
                                value={idInput}
                                onChange={handleIdChange}
                                className="w-full p-5 rounded-2xl bg-white border-[6px] border-gray-100 focus:border-[#F7931E] outline-none font-black text-2xl text-gray-700 transition-all uppercase text-center placeholder-gray-300 shadow-inner"
                                placeholder="CODE"
                                aria-label={isSchool ? "Enter School Code" : "Enter Player ID"}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none group-focus-within:text-[#F7931E] transition-colors">
                                {isSchool ? <School size={28} /> : <User size={28} />}
                            </div>
                            </div>
                            {idError && <p className="text-red-500 font-bold text-xs mt-2 ml-2">{idError}</p>}
                        </div>
                        
                        <Button 
                            onClick={handleIdSubmit} 
                            className="w-full text-lg py-5" 
                            disabled={!idInput || isCheckingUser}
                            aria-label="Start Game"
                        >
                            <div className="flex flex-row items-center gap-2">
                                <span>START GAME</span>
                                <ArrowRight size={24} strokeWidth={3} />
                            </div>
                        </Button>
                    </div>
                </Card>
            </div>
            <AppFooter fixed />
        </div>
      );
  }

  // Group Select & Avatar Creator omitted for brevity as they follow similar pattern, standard buttons will work with global listener
  
  if (appState === AppState.GROUP_SELECT) {
      const sortedGroups = [...schoolGroups].sort((a, b) => (b.stats?.points || 0) - (a.stats?.points || 0));

      return (
        <div className="min-h-screen bg-[#00AEEF] p-4 flex flex-col items-center">
             <GlobalUI />
             
             {/* --- SCHOOL PROFILE HEADER --- */}
             <div className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mb-8 mt-2 gap-4">
                 {/* Profile Section */}
                 <div 
                    onClick={() => { soundService.playClick(); setShowProfile(true); }}
                    className="flex items-center gap-4 bg-black/10 p-2 pr-6 rounded-full backdrop-blur-sm border-2 border-white/20 cursor-pointer hover:bg-black/20 hover:scale-105 transition-all group"
                 >
                     <div className="w-16 h-16 bg-white rounded-full border-4 border-white flex items-center justify-center text-3xl shadow-md text-[#00AEEF] overflow-hidden group-hover:scale-110 transition-transform">
                         {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <School size={32} />}
                     </div>
                     <div className="text-white">
                         <p className="font-bold text-xs opacity-90 uppercase tracking-widest">School Dashboard</p>
                         <h2 className="text-2xl font-black uppercase leading-none drop-shadow-md">{user.name}</h2>
                     </div>
                 </div>
                 
                 {/* Stats */}
                 <div className="flex gap-3">
                    <div className="bg-[#F7931E] px-5 py-2 rounded-full text-white font-black border-4 border-[#C97818] shadow-lg flex items-center gap-2">
                        <Users size={20} />
                        <span className="text-xl">{schoolGroups.length} Groups</span>
                    </div>
                     <div className="bg-[#8CC63F] px-5 py-2 rounded-full text-white font-black border-4 border-[#65912A] shadow-lg flex items-center gap-2">
                        <Trophy size={20} />
                        <span className="text-xl">{user.stats.points} Pts</span>
                    </div>
                 </div>
             </div>

             {/* --- GROUPS GRID --- */}
             <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-24">
                 
                 {/* Add New Group Button */}
                 <button 
                    onClick={() => { soundService.playClick(); openAddGroup(); }}
                    className="aspect-[4/5] rounded-[2rem] border-4 border-dashed border-white/40 hover:border-white bg-white/10 hover:bg-white/20 flex flex-col items-center justify-center gap-4 transition-all group active:scale-95"
                 >
                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <Plus size={40} className="text-white" strokeWidth={3} />
                    </div>
                    <span className="font-black text-white uppercase tracking-wider text-lg">Add Group</span>
                 </button>

                 {/* Group Cards */}
                 {sortedGroups.map((group, idx) => (
                     <div 
                        key={idx}
                        onClick={() => { soundService.playClick(); selectGroup(group); }}
                        className="relative aspect-[4/5] bg-white rounded-[2rem] overflow-hidden shadow-xl border-4 border-white group cursor-pointer transition-all hover:-translate-y-2 hover:shadow-2xl flex flex-col"
                     >
                        {/* Image Section */}
                        <div className="h-[65%] w-full relative bg-gray-100 overflow-hidden">
                             {group.photoURL ? (
                                 <img src={group.photoURL} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 pattern-dots">
                                     <Users size={48} />
                                 </div>
                             )}
                             
                             {/* Gradient Overlay */}
                             <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>

                             {/* Level Badge (Top Left) */}
                             <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-lg font-black text-xs border-2 border-white shadow-sm flex items-center gap-1 z-10">
                                 <Star size={12} fill="currentColor" /> LVL {group.level}
                             </div>

                             {/* Actions (Top Right) */}
                             <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); soundService.playClick(); openEditGroup(group); }}
                                    className="p-2 bg-white text-blue-500 rounded-full shadow-lg hover:bg-blue-50 transition-transform hover:scale-110"
                                    title="Edit"
                                 >
                                     <Edit2 size={16} strokeWidth={3} />
                                 </button>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); soundService.playClick(); handleDeleteGroup(group.name); }}
                                    className="p-2 bg-white text-red-500 rounded-full shadow-lg hover:bg-red-50 transition-transform hover:scale-110"
                                    title="Delete"
                                 >
                                     <Trash2 size={16} strokeWidth={3} />
                                 </button>
                             </div>
                        </div>
                        
                        {/* Info Section */}
                         <div className="flex-1 bg-white p-4 flex flex-col justify-between relative z-10">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 leading-tight line-clamp-2 uppercase group-hover:text-[#00AEEF] transition-colors">
                                    {group.name}
                                </h3>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2 pt-2 border-t-2 border-gray-100">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Score</span>
                                    <span className="text-lg font-black text-orange-500 leading-none">{group.stats.points}</span>
                                </div>
                                <div className="bg-[#00AEEF] p-2 rounded-full text-white shadow-md transform group-hover:rotate-12 transition-transform">
                                    <ArrowRight size={20} strokeWidth={3} />
                                </div>
                            </div>
                         </div>
                     </div>
                 ))}
             </div>
             
             <AppFooter />
        </div>
      );
  }

  if (appState === AppState.AVATAR_CREATOR) {
    return (
       <div className="min-h-screen bg-[#00AEEF] flex flex-col relative">
          <GlobalUI />
          <AvatarCreator 
             onAvatarCreated={onAvatarCreated}
             onSkip={() => setAppState(AppState.DASHBOARD)}
          />
          <AppFooter fixed />
       </div>
    );
  }

  if (appState === AppState.DASHBOARD) {
    const startGame = (type: GameType) => {
        // Only preload visual questions if NOT blind
        if (user.mode !== UserMode.BLIND && !questionsData) {
            setLoadingMessage(`Generating Level ${user.level} questions...`);
            generateInitialQuestions(user.level).then(data => setQuestionsData(data));
        }
        setSelectedGame(type);
        setAppState(AppState.GAME);
    };
    
    const isBlind = user.mode === UserMode.BLIND;
    const isDeaf = user.mode === UserMode.DEAF;

    return (
      <div className="min-h-screen bg-[#00AEEF] p-4 flex flex-col items-center">
         <GlobalUI />
         {/* Top Bar */}
         <div className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center mb-8 mt-2 gap-4">
             {/* Profile Section */}
             <div 
                onClick={() => { soundService.playClick(); setShowProfile(true); }}
                className="flex items-center gap-4 bg-black/10 p-2 pr-6 rounded-full backdrop-blur-sm border-2 border-white/20 cursor-pointer hover:bg-black/20 hover:scale-105 transition-all"
                title="View Profile"
                aria-label={`Profile: ${user.name}, Level ${user.level}`}
             >
                 {user.photoURL ? (
                     <img src={user.photoURL} className="w-14 h-14 rounded-full border-2 border-white shadow-md bg-white object-cover" alt="Profile"/>
                 ) : (
                     <div className="w-14 h-14 bg-white rounded-full border-2 border-white flex items-center justify-center text-2xl shadow-md text-[#00AEEF]">
                         {user.role === UserRole.SCHOOL ? <School /> : <User />}
                     </div>
                 )}
                 <div className="text-white">
                     <p className="font-bold text-xs opacity-90 uppercase tracking-widest">{user.role}</p>
                     <h2 className="text-xl font-black uppercase leading-none">{user.name}</h2>
                 </div>
             </div>
             
             <div className="bg-[#F7931E] px-6 py-3 rounded-full text-white font-black border-4 border-[#C97818] shadow-lg flex items-center gap-2">
                 <span>🏆 SCORE:</span>
                 <span className="text-2xl">{user.stats.points}</span>
             </div>
         </div>

         {/* Dashboard Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl mb-12">
            <Card 
              className="transform transition hover:-translate-y-2 cursor-pointer group !p-6 border-b-8" 
              title="Maths"
              watermark={<Calculator />}
            >
               <div className="flex flex-col items-center space-y-4">
                   <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-5xl group-hover:scale-110 transition-transform shadow-inner border-4 border-blue-100">🧮</div>
                   <p className="text-center text-gray-500 text-xs font-bold uppercase tracking-wide">Arithmetic Challenge</p>
                   <Button onClick={() => startGame(GameType.MATHS)} className="w-full" aria-label="Play Maths Game">Play</Button>
               </div>
            </Card>

            <Card 
              className="transform transition hover:-translate-y-2 cursor-pointer group !p-6 border-b-8" 
              title="African GK"
              watermark={<Globe />}
            >
               <div className="flex flex-col items-center space-y-4">
                   <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-5xl group-hover:scale-110 transition-transform shadow-inner border-4 border-green-100">🌍</div>
                   <p className="text-center text-gray-500 text-xs font-bold uppercase tracking-wide">Know Your Continent</p>
                   <Button onClick={() => startGame(GameType.AFRICAN_GK)} variant="secondary" className="w-full" aria-label="Play African General Knowledge Game">Play</Button>
               </div>
            </Card>
            
            <Card 
              className="transform transition hover:-translate-y-2 cursor-pointer group !p-6 border-b-8" 
              title="Universe GK"
              watermark={<Rocket />}
            >
               <div className="flex flex-col items-center space-y-4">
                   <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center text-5xl group-hover:scale-110 transition-transform shadow-inner border-4 border-purple-100">🚀</div>
                   <p className="text-center text-gray-500 text-xs font-bold uppercase tracking-wide">Space & Science</p>
                   <Button onClick={() => startGame(GameType.UNIVERSE_GK)} variant="accent" className="w-full" aria-label="Play Universe General Knowledge Game">Play</Button>
               </div>
            </Card>

            <Card 
              className="transform transition hover:-translate-y-2 cursor-pointer group !p-6 border-b-8" 
              title={isDeaf ? "Visual Lang" : "Language"}
              watermark={<MessageCircle />}
            >
               <div className="flex flex-col items-center space-y-4">
                   <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center text-5xl group-hover:scale-110 transition-transform shadow-inner border-4 border-yellow-100">
                       {isDeaf ? "👋" : "🗣️"}
                   </div>
                   <p className="text-center text-gray-500 text-xs font-bold uppercase tracking-wide">
                       {isDeaf ? "Sign & Write" : "Speak, Listen & Write"}
                   </p>
                   
                   <div className="grid grid-cols-2 gap-2 w-full">
                        {!isDeaf && (
                            <>
                                <Button onClick={() => startGame(GameType.LANG_SPEAK)} variant="warning" className="p-2 text-sm" aria-label="Play Speaking Game">Speak</Button>
                                <Button onClick={() => startGame(GameType.LANG_LISTEN)} variant="accent" className="p-2 text-sm" aria-label="Play Listening Game">Listen</Button>
                            </>
                        )}
                        
                        {!isBlind && !isDeaf && (
                            <Button onClick={() => startGame(GameType.LANG_READ)} variant="secondary" className="p-2 text-sm">Read</Button>
                        )}

                        {!isBlind && (
                             <Button onClick={() => startGame(GameType.LANG_WRITE)} variant="primary" className="p-2 text-sm">Write</Button>
                        )}

                        {isDeaf && (
                             <Button onClick={() => startGame(GameType.LANG_SIGN)} variant="secondary" className="p-2 text-sm">Sign</Button>
                        )}
                   </div>
               </div>
            </Card>
         </div>
         <AppFooter />
      </div>
    );
  }

  // --- GAME VIEW ---
  
  if (appState === AppState.GAME && selectedGame) {
      // BLIND MODE: Direct to Live Audio Session
      if (user.mode === UserMode.BLIND) {
          return (
             <GameContainer 
                user={user} 
                ropePosition={ropePosition} 
                score={sessionScore} 
                onExit={resetGame}
                title={selectedGame.replace('_', ' ')}
                isAttacking={false}
             >
                 <BlindGameSession 
                    gameType={selectedGame}
                    level={user.level}
                    onScore={handleScore}
                    onExit={resetGame}
                 />
             </GameContainer>
          );
      }

      // STANDARD/DEAF MODES: Load Visual Questions if needed
      const needsQuestions = [GameType.MATHS, GameType.AFRICAN_GK, GameType.UNIVERSE_GK].includes(selectedGame);
      const isDataReady = questionsData && (
          (selectedGame === GameType.MATHS && questionsData.math?.length > 0) ||
          (selectedGame === GameType.AFRICAN_GK && questionsData.african_gk?.length > 0) ||
          (selectedGame === GameType.UNIVERSE_GK && questionsData.universe_gk?.length > 0)
      );

      if (needsQuestions && !isDataReady) {
          return <LoadingScreen text={`Preparing Level ${user.level} Questions...`} onCancel={resetGame} />;
      }

      let gameComponent;
      const isBlind = user.mode === UserMode.BLIND; // Should be false here but kept for logic safety

      switch (selectedGame) {
          case GameType.MATHS:
              gameComponent = <MathGame 
                  questions={questionsData?.math || []} 
                  onCorrect={() => handleScore(true)} 
                  onIncorrect={() => handleScore(false)} 
                  isBlindMode={isBlind}
              />;
              break;
          case GameType.AFRICAN_GK:
              gameComponent = <GKGame 
                  questions={questionsData?.african_gk || []}
                  onCorrect={() => handleScore(true)} 
                  onIncorrect={() => handleScore(false)} 
                  isBlindMode={isBlind}
              />;
              break;
          case GameType.UNIVERSE_GK:
               gameComponent = <GKGame 
                  questions={questionsData?.universe_gk || []}
                  onCorrect={() => handleScore(true)} 
                  onIncorrect={() => handleScore(false)} 
                  isBlindMode={isBlind}
              />;
              break;
          case GameType.LANG_SPEAK:
              gameComponent = <LiveLanguageGame 
                  mode="SPEAK"
                  level={user.level}
                  onCorrect={() => handleScore(true)}
                  onIncorrect={() => handleScore(false)}
              />;
              break;
          case GameType.LANG_LISTEN:
              gameComponent = <ListeningGame 
                  level={user.level}
                  onCorrect={() => handleScore(true)}
                  onIncorrect={() => handleScore(false)}
              />;
              break;
          case GameType.LANG_WRITE:
              gameComponent = <LiveLanguageGame 
                  mode="WRITE"
                  level={user.level}
                  onCorrect={() => handleScore(true)}
                  onIncorrect={() => handleScore(false)}
              />;
              break;
          case GameType.LANG_READ:
              gameComponent = <LiveLanguageGame 
                  mode="READ"
                  level={user.level}
                  onCorrect={() => handleScore(true)}
                  onIncorrect={() => handleScore(false)}
              />;
              break;
          case GameType.LANG_SIGN:
              gameComponent = <LiveLanguageGame 
                  mode="SIGN"
                  level={user.level}
                  onCorrect={() => handleScore(true)}
                  onIncorrect={() => handleScore(false)}
              />;
              break;
          default:
              gameComponent = <div>Game Under Construction</div>;
      }

      return (
          <GameContainer 
             user={user} 
             ropePosition={ropePosition} 
             score={sessionScore} 
             onExit={resetGame}
             title={selectedGame.replace('_', ' ')}
             isAttacking={isAttacking}
          >
             <GlobalUI />
             {gameComponent}
          </GameContainer>
      );
  }

  return <div>Error State</div>;
}