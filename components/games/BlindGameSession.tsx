import React, { useEffect, useRef, useState } from 'react';
import { liveClient } from '../../services/geminiService';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../../services/audioUtils';
import { LiveServerMessage, Modality, Type } from '@google/genai';
import { GameType } from '../../types';
import { Mic, MicOff, Headphones, Activity } from 'lucide-react';
import { Button } from '../UI';

interface Props {
  gameType: GameType;
  level: number;
  onScore: (correct: boolean) => void;
  onExit: () => void;
}

export const BlindGameSession: React.FC<Props> = ({ gameType, level, onScore, onExit }) => {
  const [connected, setConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    initSession();
    return () => cleanupSession();
  }, [gameType, level]);

  const cleanupSession = () => {
    setConnected(false);
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close()).catch(() => {});
        sessionPromiseRef.current = null;
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    if (inputCtxRef.current) inputCtxRef.current.close();
  };

  const initSession = async () => {
    try {
        cleanupSession();

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = ctx;
        const inputCtx = new AudioContext({ sampleRate: 16000 });
        inputCtxRef.current = inputCtx;

        let stream;
        try {
             stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (mediaError) {
             console.error("Microphone permission denied:", mediaError);
             alert("Microphone access is required for Blind Mode. Please allow permissions in your browser settings and try again.");
             onExit();
             return;
        }
        
        streamRef.current = stream;

        // Tool to report score
        const tools = [{
            functionDeclarations: [{
                name: "report_result",
                description: "Call this when the user answers a question correctly or incorrectly.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        isCorrect: { type: Type.BOOLEAN },
                        userAnswer: { type: Type.STRING }
                    },
                    required: ["isCorrect"]
                }
            }]
        }];

        let contextPrompt = "";
        switch (gameType) {
            case GameType.MATHS:
                contextPrompt = `You are hosting a Mental Math game for a blind child (Level ${level}). 
                1. Greet them warmly and say "Let's do some Math!".
                2. Ask a simple arithmetic question suitable for level ${level}.
                3. Wait for their voice answer.
                4. If correct, be enthusiastic, say "Correct!", and call report_result(true).
                5. If wrong, say "Not quite, the answer was [X]", and call report_result(false).
                6. Immediately ask the next question.`;
                break;
            case GameType.AFRICAN_GK:
            case GameType.UNIVERSE_GK:
                contextPrompt = `You are hosting a Trivia Game about ${gameType === GameType.AFRICAN_GK ? 'Africa' : 'Space'} for a blind child (Level ${level}).
                1. Greet them and say "Let's explore!".
                2. Ask a multiple choice question but read the options clearly.
                3. Wait for them to say the answer or option letter.
                4. If correct, congratulate them and call report_result(true).
                5. If wrong, correct them gently and call report_result(false).
                6. Move to the next question.`;
                break;
            case GameType.LANG_SPEAK:
            case GameType.LANG_LISTEN:
                contextPrompt = `You are a Language Tutor for a blind child (Level ${level}).
                1. Greet them.
                2. Give them a word to spell, or a short sentence to repeat, or tell a 2-sentence story and ask a question about it.
                3. Listen to their response.
                4. Provide feedback. Call report_result(true) if good, report_result(false) if needs improvement.
                5. Continue with a new challenge.`;
                break;
            default:
                contextPrompt = "You are a helpful assistant.";
        }

        const sessionPromise = liveClient.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                tools: tools,
                systemInstruction: contextPrompt,
            },
            callbacks: {
                onopen: () => {
                    setConnected(true);
                    setMicActive(true);
                    
                    // Audio Input Pipeline
                    const source = inputCtx.createMediaStreamSource(stream);
                    const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                    processor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        sessionPromise.then(session => session.sendRealtimeInput({ media: createPcmBlob(inputData) }));
                    };
                    source.connect(processor);
                    processor.connect(inputCtx.destination);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    // Audio Output Pipeline
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && audioContextRef.current) {
                        setIsTalking(true);
                        const ctx = audioContextRef.current;
                        if (ctx.state === 'suspended') await ctx.resume();
                        const buffer = await decodeAudioData(base64ToUint8Array(audioData), ctx);
                        const source = ctx.createBufferSource();
                        source.buffer = buffer;
                        source.connect(ctx.destination);
                        source.onended = () => setIsTalking(false);
                        
                        const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
                        source.start(startTime);
                        nextStartTimeRef.current = startTime + buffer.duration;
                    }

                    // Handle Tool Calls (Score)
                    if (msg.toolCall) {
                        for (const fc of msg.toolCall.functionCalls) {
                            if (fc.name === 'report_result') {
                                const args = fc.args as any;
                                onScore(args.isCorrect);
                                sessionPromise.then(session => session.sendToolResponse({
                                    functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Score recorded" } }]
                                }));
                            }
                        }
                    }
                },
                onclose: () => setConnected(false),
                onerror: (e) => console.error(e)
            }
        });
        sessionPromiseRef.current = sessionPromise;

    } catch (e) {
        console.error("Blind Session Init Error", e);
        alert("An error occurred while initializing the game session. Please check your connection and try again.");
        onExit();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-black rounded-3xl p-6 relative overflow-hidden border-8 border-gray-800">
        {/* Visualizer Background for "feeling" the game if partial sight */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${isTalking ? 'opacity-30' : 'opacity-5'}`}>
             <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 animate-pulse"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8">
            <div className={`w-40 h-40 rounded-full flex items-center justify-center border-8 transition-all duration-500 ${isTalking ? 'border-green-400 bg-green-900 shadow-[0_0_50px_#4ade80]' : 'border-blue-500 bg-blue-900'}`}>
                <Headphones size={80} className="text-white" />
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-4xl font-black text-white uppercase tracking-widest">
                    {gameType.replace('_', ' ')}
                </h2>
                <p className="text-xl text-gray-400 font-bold animate-pulse">
                    {isTalking ? "Gemini is speaking..." : "Listening to you..."}
                </p>
            </div>

            <div className="flex items-center gap-4 mt-8">
                <div className={`p-4 rounded-full ${micActive ? 'bg-red-600 animate-pulse' : 'bg-gray-700'}`}>
                    {micActive ? <Mic size={32} className="text-white" /> : <MicOff size={32} className="text-gray-400" />}
                </div>
            </div>

            <Button onClick={onExit} variant="neutral" className="mt-8 px-12 py-6 text-2xl font-black uppercase">
                End Game
            </Button>
        </div>
    </div>
  );
};