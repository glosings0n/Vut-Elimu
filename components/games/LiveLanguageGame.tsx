import React, { useEffect, useRef, useState } from 'react';
import { liveClient, evaluateWriting, generateReadingParagraph } from '../../services/geminiService';
import { base64ToUint8Array, createPcmBlob, decodeAudioData } from '../../services/audioUtils';
import { Button, LoadingSpinner } from '../UI';
import { Mic, MicOff, Volume2, Sparkles, Lightbulb, Ear, MessageSquare, Activity, Pencil, Trash2, CheckCircle, RotateCcw, Eraser, Play, BookOpen, SkipForward, Video, VideoOff, Hand } from 'lucide-react';
import { LiveServerMessage, Modality, Type } from '@google/genai';
import { soundService } from '../../services/soundService';

interface Props {
  onCorrect: () => void;
  onIncorrect: () => void;
  mode: 'SPEAK' | 'LISTEN' | 'WRITE' | 'READ' | 'SIGN';
  level?: number;
}

interface Feedback {
    type: 'PRONUNCIATION' | 'GRAMMAR' | 'VOCABULARY' | 'GENERAL' | 'SUCCESS';
    message: string;
}

// Words for the Speaking Game
const SPEAKING_WORDS = [
    "Challenge", "Beautiful", "Together", "School", "Education", 
    "Friendship", "Victory", "Learn", "Future", "Knowledge", 
    "Africa", "Science", "History", "Family", "Respect"
];

// Words for the Writing Game
const WRITING_WORDS = ["A", "B", "C", "1", "2", "3", "CAT", "DOG", "SUN", "MOM", "DAD", "HI"];

export const LiveLanguageGame: React.FC<Props> = ({ onCorrect, onIncorrect, mode, level = 1 }) => {
  // --- COMMON STATE ---
  const [pulse, setPulse] = useState(false);
  const [targetWord, setTargetWord] = useState("");
  const [readingText, setReadingText] = useState("");
  const [loadingText, setLoadingText] = useState(false);

  // --- LIVE AUDIO/VIDEO STATE (SPEAK/LISTEN/READ/SIGN) ---
  const [connected, setConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [modelResponseText, setModelResponseText] = useState(""); // For Deaf users to read
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const micActiveRef = useRef(false);
  const currentWordRef = useRef(""); 
  const readingTextRef = useRef(""); 
  
  // Video Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasVideoRef = useRef<HTMLCanvasElement>(null);
  const videoIntervalRef = useRef<number | null>(null);

  // --- WRITING STATE (WRITE) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [writingFeedback, setWritingFeedback] = useState<{correct: boolean, feedback: string} | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  
  // --- PULSE EFFECT ---
  useEffect(() => {
    if (mode === 'WRITE') {
        const interval = setInterval(() => setPulse(p => !p), 2000);
        return () => clearInterval(interval);
    }
    if (!connected) return;
    const interval = setInterval(() => setPulse(p => !p), 1000); 
    return () => clearInterval(interval);
  }, [connected, mode]);

  // --- INITIALIZATION & WORD LOGIC ---

  useEffect(() => {
    // Set initial content
    if (mode === 'READ') {
        loadReadingContent();
    } else if (mode === 'SIGN') {
        setTargetWord("Start Signing");
    } else {
        nextWord(true); 
    }
    
    if (mode === 'WRITE') {
        setTimeout(handleResize, 100);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }
  }, [mode]);

  const loadReadingContent = async () => {
      setLoadingText(true);
      const text = await generateReadingParagraph(level);
      setReadingText(text);
      readingTextRef.current = text;
      setFeedback(null);
      setTranscript("");
      setLoadingText(false);
      
      // Restart session to update context
      if (connected) {
          restartSession();
      }
  };

  const nextWord = (isInitial = false) => {
      if (mode === 'READ') {
          loadReadingContent();
          return;
      }
      if (mode === 'SIGN') {
          setTranscript("");
          setModelResponseText("");
          return;
      }

      const list = mode === 'WRITE' ? WRITING_WORDS : SPEAKING_WORDS;
      let newWord = "";
      do {
          newWord = list[Math.floor(Math.random() * list.length)];
      } while (newWord === targetWord && list.length > 1);
      
      setTargetWord(newWord);
      currentWordRef.current = newWord;
      
      setFeedback(null);
      setWritingFeedback(null);
      setTranscript("");
      if (mode === 'WRITE') clearCanvas();

      if (!isInitial && mode === 'SPEAK' && connected) {
          restartSession();
      }
  };

  // --- WRITING CANVAS FUNCTIONS --- 
  const initializeCanvas = (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
  };
  const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
          const rect = canvas.parentElement.getBoundingClientRect();
          canvas.width = rect.width;
          canvas.height = rect.height;
          initializeCanvas(canvas);
      }
  };
  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const stopDrawing = () => setIsDrawing(false);
  const clearCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas) initializeCanvas(canvas);
      setWritingFeedback(null);
  };
  const checkWriting = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setIsChecking(true);
      const imageData = canvas.toDataURL("image/png");
      try {
          const result = await evaluateWriting(imageData, targetWord);
          setWritingFeedback(result);
          if (result.correct) {
              soundService.playCorrect();
              onCorrect();
              setTimeout(() => { nextWord(); setIsChecking(false); }, 2000);
          } else {
              soundService.playIncorrect();
              onIncorrect();
              setIsChecking(false);
          }
      } catch (e) {
          setWritingFeedback({ correct: false, feedback: "Error checking. Try again." });
          setIsChecking(false);
      }
  };

  // --- LIVE AUDIO/VIDEO LOGIC (SPEAK/READ/SIGN) ---

  const tools = [{
    functionDeclarations: [{
      name: "evaluate_attempt",
      description: "Evaluate the student's speaking or reading attempt.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          isCorrect: { type: Type.BOOLEAN },
          feedbackType: { type: Type.STRING, enum: ["PRONUNCIATION", "SUCCESS", "GENERAL"] },
          specificTip: { type: Type.STRING },
        },
        required: ["isCorrect", "feedbackType", "specificTip"]
      }
    }]
  }];

  const closeSession = async () => {
      setConnected(false);
      setMicActive(false);
      setVideoActive(false);
      micActiveRef.current = false;
      
      if (videoIntervalRef.current) {
          clearInterval(videoIntervalRef.current);
          videoIntervalRef.current = null;
      }

      if (sessionPromiseRef.current) {
          try {
              const session = await sessionPromiseRef.current;
              // Check if close method exists (it should)
              if (session && typeof session.close === 'function') {
                  session.close();
              }
          } catch(e) { console.warn("Session close error", e); }
          sessionPromiseRef.current = null;
      }
      
      // Stop Tracks
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
      }
      
      // Close Contexts
      if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
      }
      if (inputCtxRef.current) {
          inputCtxRef.current.close();
          inputCtxRef.current = null;
      }
  };

  const restartSession = async () => {
      await closeSession();
      // Small delay to ensure cleanup
      setTimeout(initSession, 100);
  };

  const initSession = async () => {
    try {
        setFeedback(null);
        await closeSession(); // Ensure fresh start

        // Prepare System Instruction with Dynamic Content
        const dynamicContent = mode === 'READ' ? readingTextRef.current : currentWordRef.current;
        let instruction = "";
        
        if (mode === 'READ') {
            instruction = `You are a Reading Tutor for a child. The child is reading this text: "${dynamicContent}". Listen to them. If they read it correctly, say "Great job!" and call evaluate_attempt(true). If they struggle, help them.`;
        } else if (mode === 'SIGN') {
            instruction = `You are a Sign Language & Visual Communication partner for a Deaf user. They cannot hear you, but they will read your text response. Watch their video feed. Engage in a simple, friendly conversation. Interpret their signs or gestures. Reply with short, encouraging sentences suitable for reading.`;
        } else {
             instruction = `You are a Pronunciation Coach. The target word is "${dynamicContent}". Listen to the user. If they say it correctly, call evaluate_attempt(true). If not, give a short tip.`;
        }

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = ctx;
        const inputCtx = new AudioContext({ sampleRate: 16000 });
        inputCtxRef.current = inputCtx;
        
        const constraints = mode === 'SIGN' ? { video: true, audio: false } : { audio: true };
        
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (mediaError) {
            console.error("Media Permission Denied:", mediaError);
            alert("This game requires permission to access your microphone and/or camera. Please update your browser settings.");
            await closeSession();
            return;
        }
        
        streamRef.current = stream;

        // If SIGN mode, attach stream to video element
        if (mode === 'SIGN' && videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
        }

        const sessionPromise = liveClient.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    setConnected(true);
                    if (mode !== 'SIGN') {
                        setMicActive(true);
                        micActiveRef.current = true;
                        // Audio Input Setup
                        const source = inputCtx.createMediaStreamSource(stream);
                        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                        processor.onaudioprocess = (e) => {
                             if (!micActiveRef.current) return;
                             const inputData = e.inputBuffer.getChannelData(0);
                             sessionPromise.then(session => session.sendRealtimeInput({ media: createPcmBlob(inputData) }));
                        };
                        source.connect(processor);
                        processor.connect(inputCtx.destination);
                        sourceRef.current = source;
                        processorRef.current = processor;
                    } else {
                        setVideoActive(true);
                        // Video Input Setup
                         const canvas = canvasVideoRef.current || document.createElement('canvas');
                         const video = videoRef.current;
                         const ctx = canvas.getContext('2d');
                         
                         videoIntervalRef.current = window.setInterval(() => {
                             if (!video || !ctx || !videoActive) return;
                             canvas.width = video.videoWidth * 0.5; // Scale down for perf
                             canvas.height = video.videoHeight * 0.5;
                             ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                             const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
                             
                             sessionPromise.then(session => {
                                 session.sendRealtimeInput({ 
                                     media: { mimeType: 'image/jpeg', data: base64 } 
                                 });
                             });
                         }, 500); // 2 FPS is enough for gesture context usually, prevents overload
                    }
                },
                onmessage: async (msg: LiveServerMessage) => {
                    // Audio Playback (Only if NOT SIGN/DEAF or if needed for analysis)
                    // For SIGN mode, we might still receive audio, but user is deaf. 
                    // However, we still decode it in case we want to show a visualizer.
                    // BUT for Deaf mode, we rely on TRANSCRIPTION.
                    
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && audioContextRef.current && mode !== 'SIGN') {
                         const ctx = audioContextRef.current;
                         if (ctx.state === 'suspended') await ctx.resume();
                         const buffer = await decodeAudioData(base64ToUint8Array(audioData), ctx);
                         const source = ctx.createBufferSource();
                         source.buffer = buffer;
                         source.connect(ctx.destination);
                         const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
                         source.start(startTime);
                         nextStartTimeRef.current = startTime + buffer.duration;
                    }

                    // Transcript updates
                    const inputTx = msg.serverContent?.inputTranscription?.text;
                    if (inputTx) setTranscript(inputTx);
                    
                    // Model Transcription (Important for SIGN mode)
                    const outputTx = msg.serverContent?.outputTranscription?.text;
                    if (outputTx) setModelResponseText(prev => prev + outputTx);
                    
                    if (msg.serverContent?.turnComplete) {
                        // Clear buffer or handle turn end if needed
                        if (mode === 'SIGN') {
                            // Maybe auto-clear old text after a while
                            setTimeout(() => setModelResponseText(""), 8000);
                        }
                    }

                    // Tool Calls
                    if (msg.toolCall) {
                        for (const fc of msg.toolCall.functionCalls) {
                            if (fc.name === 'evaluate_attempt') {
                                const args = fc.args as any;
                                setFeedback({ 
                                    type: args.isCorrect ? 'SUCCESS' : args.feedbackType || 'PRONUNCIATION', 
                                    message: args.specificTip 
                                });

                                if (args.isCorrect) {
                                    soundService.playCorrect();
                                    onCorrect();
                                    setTimeout(() => {
                                        nextWord();
                                    }, 2000);
                                } else {
                                    onIncorrect();
                                }

                                sessionPromise.then(session => session.sendToolResponse({
                                    functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Evaluation received." } }]
                                }));
                            }
                        }
                    }
                },
                onclose: () => {
                    setConnected(false);
                    setMicActive(false);
                    setVideoActive(false);
                    micActiveRef.current = false;
                },
                onerror: (e) => {
                    console.error("Live API Error", e);
                    setConnected(false);
                }
            },
            config: {
                responseModalities: [Modality.AUDIO], // API Requirement: Must be AUDIO
                inputAudioTranscription: {}, 
                outputAudioTranscription: {}, // Required for Deaf/Sign mode to get text
                tools: tools,
                systemInstruction: instruction
            }
        });
        sessionPromiseRef.current = sessionPromise;
    } catch (e) {
        console.error("Init Error", e);
        // Clean up partially initialized session attempts if needed
        setConnected(false);
        alert("Failed to initialize game connection. Please try again.");
    }
  };

  const toggleMic = () => {
      if (inputCtxRef.current?.state === 'suspended') inputCtxRef.current.resume();
      const newState = !micActive;
      setMicActive(newState);
      micActiveRef.current = newState;
  };

  useEffect(() => {
      return () => {
          closeSession();
      };
  }, []);

  const getFeedbackColor = (type?: string) => {
      switch(type) {
          case 'SUCCESS': return 'bg-green-100 border-green-300 text-green-900';
          case 'PRONUNCIATION': return 'bg-purple-100 border-purple-300 text-purple-900';
          default: return 'bg-gray-100 border-gray-300 text-gray-700';
      }
  };

  // --- RENDER FOR WRITING MODE ---
  if (mode === 'WRITE') {
      return (
        <div className="h-full w-full flex flex-col md:flex-row gap-3 md:gap-6 overflow-hidden">
            {/* ... Existing Write Mode UI ... */}
            <div className="shrink-0 h-[140px] md:h-full md:w-[40%] flex flex-col gap-3">
                <div className={`flex-1 bg-yellow-50 rounded-xl border-4 ${writingFeedback?.correct ? 'border-green-300 bg-green-50' : 'border-yellow-200'} flex md:flex-col items-center justify-between md:justify-center p-4 md:p-6 text-center shadow-inner relative transition-colors duration-500`}>
                    <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-white/60 px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-gray-400 border border-white/50">Writing Pad</div>
                    <div className="flex flex-col items-center justify-center w-full">
                        <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px] md:text-xs mb-1 md:mb-4">Write this:</span>
                        <h1 className="text-6xl md:text-8xl font-black text-gray-800 tracking-wider drop-shadow-sm font-mono leading-none">{targetWord}</h1>
                    </div>
                    {/* Feedback Overlay code ... */}
                     <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {writingFeedback && (
                            <div className={`p-3 rounded-xl border-4 shadow-xl backdrop-blur-md animate-bounce-in z-20 max-w-[90%] ${writingFeedback.correct ? 'bg-green-100/95 border-green-400 text-green-800' : 'bg-red-50/95 border-red-300 text-red-800'}`}>
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    {writingFeedback.correct ? <CheckCircle size={20} /> : <Activity size={20} />}
                                    <span className="font-black uppercase text-sm">{writingFeedback.correct ? 'PERFECT!' : 'TRY AGAIN'}</span>
                                </div>
                                <p className="font-bold text-xs leading-tight">{writingFeedback.feedback}</p>
                            </div>
                        )}
                         {isChecking && (
                             <div className="bg-white/90 p-3 rounded-xl border-2 border-blue-200 flex flex-col items-center shadow-lg backdrop-blur-sm">
                                 <Sparkles className="animate-spin text-blue-500 mb-2" size={24} />
                                 <span className="font-black text-blue-500 uppercase tracking-widest text-xs animate-pulse">Checking...</span>
                             </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-3 min-h-0">
                <div className="relative flex-1 bg-white rounded-xl border-[6px] border-gray-200 shadow-sm overflow-hidden touch-none group">
                     <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#00AEEF 1px, transparent 1px)', backgroundSize: '100% 40px', marginTop: '40px' }}></div>
                     <div className="absolute left-6 md:left-10 top-0 bottom-0 w-0.5 bg-red-200 opacity-50 pointer-events-none"></div>
                     {!isDrawing && !writingFeedback && (
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                             <Pencil size={48} className="text-gray-400 animate-pulse" />
                             <span className="ml-2 font-black text-gray-300 uppercase">Draw Here</span>
                         </div>
                     )}
                     <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="w-full h-full cursor-crosshair active:cursor-none" />
                </div>
                <div className="grid grid-cols-3 gap-3 h-14 md:h-16 shrink-0">
                    <Button onClick={clearCanvas} variant="neutral" icon={<Eraser size={18} />} className="text-gray-400 text-sm md:text-base">Clear</Button>
                    <Button onClick={checkWriting} variant="secondary" icon={<CheckCircle size={20} />} disabled={isChecking} className="text-sm md:text-base">Check</Button>
                     <Button onClick={() => nextWord()} variant="primary" icon={<RotateCcw size={18} />} className="text-sm md:text-base">Skip</Button>
                </div>
            </div>
        </div>
      );
  }

  // --- RENDER FOR SIGN MODE (DEAF) ---
  if (mode === 'SIGN') {
      return (
        <div className="h-full w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-hidden">
            <canvas ref={canvasVideoRef} className="hidden" />
            
            {/* Left: Video Feed (User) */}
            <div className="h-full flex flex-col gap-4 relative">
                <div className="flex-1 bg-black rounded-xl border-[6px] border-gray-800 overflow-hidden relative shadow-lg">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    
                    {!connected && (
                         <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                             <VideoOff size={48} className="text-gray-500" />
                         </div>
                    )}
                    
                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full"></div> LIVE CAM
                    </div>
                </div>
                
                {/* Controls */}
                <div className="h-20 shrink-0 flex gap-4">
                     <Button 
                         onClick={connected ? closeSession : initSession} 
                         variant={connected ? 'danger' : 'secondary'} 
                         className="flex-1 text-lg shadow-xl"
                         icon={connected ? <VideoOff /> : <Video />}
                     >
                         {connected ? "STOP CAMERA" : "START SIGNING"}
                     </Button>
                </div>
            </div>

            {/* Right: Conversation (Text Output) */}
            <div className="h-full flex flex-col gap-4 bg-white rounded-xl border-[5px] border-blue-100 p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-8 bg-blue-100/50 z-0"></div>
                <div className="relative z-10 flex items-center gap-2 mb-2 px-2">
                    <Hand size={20} className="text-blue-500" />
                    <span className="font-black text-blue-900 uppercase tracking-widest text-xs">Visual Conversation</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar flex flex-col justify-end">
                    {/* Placeholder */}
                    {!connected && !modelResponseText && (
                        <div className="text-center text-gray-300 font-bold p-10 flex flex-col items-center">
                            <Hand size={48} className="mb-4 opacity-50" />
                            <p>Start the camera to chat using signs/gestures.</p>
                        </div>
                    )}

                    {/* AI Response Bubble */}
                    {modelResponseText && (
                        <div className="self-start bg-gray-100 rounded-2xl rounded-tl-none p-4 max-w-[90%] border-2 border-gray-200 animate-fade-in">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Gemini AI</span>
                            <p className="text-lg md:text-2xl font-black text-gray-800 leading-snug">
                                {modelResponseText}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  }

  // --- RENDER FOR SPEAK & READ MODES ---
  return (
    <div className="h-full w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-hidden">
        {/* Left: Target Content */}
        <div className="h-full flex flex-col gap-4">
            
            <div className={`flex-1 bg-white rounded-xl border-[5px] flex flex-col items-center justify-center p-6 text-center shadow-md relative overflow-hidden transition-all duration-500 ${feedback?.type === 'SUCCESS' ? 'border-green-400 bg-green-50' : 'border-blue-100'}`}>
                <div className="absolute top-3 left-3 flex gap-2">
                    {mode === 'READ' ? <BookOpen size={20} className="text-blue-300" /> : <Sparkles size={20} className="text-blue-300" />}
                </div>
                
                {loadingText ? (
                    <LoadingSpinner variant="blue" />
                ) : mode === 'READ' ? (
                    <div className="overflow-y-auto max-h-full w-full px-2">
                         <span className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2 block">Read this Paragraph:</span>
                         <p className="text-lg md:text-xl font-black text-gray-800 leading-relaxed text-left">
                            {readingText}
                         </p>
                    </div>
                ) : (
                    <>
                        <span className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">Say this word:</span>
                        <h1 className="text-3xl md:text-5xl font-black text-gray-800 tracking-tight drop-shadow-sm">"{targetWord}"</h1>
                    </>
                )}
                
                {transcript && connected && (
                   <div className="mt-4 px-4 py-2 bg-gray-100 rounded-full text-xs md:text-sm font-bold text-gray-500 truncate max-w-full animate-pulse">
                      Hearing: "{transcript}"
                   </div>
                )}
            </div>

            {/* Feedback / Tip Box */}
            <div className={`h-[120px] shrink-0 border-4 rounded-xl p-4 flex items-start gap-4 shadow-sm transition-all duration-500 ${feedback ? getFeedbackColor(feedback.type) : 'bg-gray-50 border-gray-100'}`}>
                {feedback ? (
                    <>
                        <div className="bg-white p-3 rounded-full shrink-0 border-2 border-current shadow-sm">
                            {feedback.type === 'SUCCESS' ? <Sparkles size={24} /> : <Lightbulb size={24} />}
                        </div>
                        <div className="overflow-y-auto max-h-full">
                            <h4 className="font-black text-xs uppercase tracking-widest mb-1 opacity-80">
                                {feedback.type}
                            </h4>
                            <p className="font-bold text-sm leading-snug">
                                {feedback.message}
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-gray-400 gap-2">
                         <Ear size={24} className="opacity-50" />
                         <span className="font-bold text-sm uppercase tracking-wide">
                            {mode === 'READ' ? "I'm listening to your reading..." : "Listening for the word..."}
                         </span>
                    </div>
                )}
            </div>
        </div>

        {/* Right: Interaction Controls */}
        <div className="flex flex-col items-center justify-center gap-6 h-full bg-white rounded-xl border-[5px] border-gray-100 p-6 relative overflow-hidden shadow-sm">
            
            {connected && pulse && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="w-64 h-64 bg-blue-400/10 rounded-full animate-ping"></div>
                </div>
            )}

            {!connected ? (
                <div className="flex flex-col items-center gap-6 relative z-10">
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center border-4 border-blue-100 shadow-inner">
                        <Mic size={48} className="text-blue-400"/>
                    </div>
                    <Button onClick={initSession} icon={<Play size={24} />} className="w-full px-10 text-xl py-4" variant="primary">
                        {mode === 'READ' ? "START READING" : "START SPEAKING"}
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-6 w-full z-10">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 border-[6px] border-white shadow-2xl ${micActive ? 'bg-red-500 scale-105 shadow-red-200' : 'bg-gray-200'}`}>
                        {micActive ? (
                            <Mic size={64} className="text-white animate-pulse"/>
                        ) : (
                            <MicOff size={64} className="text-gray-400"/>
                        )}
                    </div>
                    
                    <div className="flex flex-col items-center gap-3 w-full">
                        <Button 
                            onClick={toggleMic} 
                            variant={micActive ? "warning" : "secondary"} 
                            className="min-w-[240px] text-lg py-4 shadow-xl"
                        >
                            {micActive ? "STOP MIC" : "ACTIVATE MIC"}
                        </Button>
                        <p className={`text-xs font-black uppercase tracking-widest transition-colors ${micActive ? 'text-red-400 animate-pulse' : 'text-gray-300'}`}>
                            {micActive ? "LISTENING..." : "MICROPHONE PAUSED"}
                        </p>
                    </div>

                    <button onClick={() => nextWord()} className="text-gray-400 hover:text-gray-600 font-bold text-sm flex items-center gap-2 mt-2">
                        <SkipForward size={14} /> Skip {mode === 'READ' ? 'Paragraph' : 'Word'}
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};