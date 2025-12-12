
export const speak = (text: string) => {
  if (!text) return;
  // Cancel previous speech to avoid queue buildup
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9; // Slightly slower for better comprehension
  utterance.pitch = 1.1; // Friendly pitch
  utterance.volume = 1;
  
  // Try to find a good English voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('en')) || voices.find(v => v.lang.includes('en'));
  if (preferredVoice) utterance.voice = preferredVoice;

  window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
    window.speechSynthesis.cancel();
};

export class SpeechRecognizer {
    recognition: any;
    isListening: boolean = false;
    
    constructor(onResult: (text: string) => void, onEnd?: () => void) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                console.log("Heard:", text);
                onResult(text);
            };

            this.recognition.onend = () => {
                this.isListening = false;
                if (onEnd) onEnd();
            };

            this.recognition.onerror = (event: any) => {
                console.warn("Speech recognition error", event.error);
                this.isListening = false;
            };
        } else {
            console.warn("Speech Recognition not supported in this browser.");
        }
    }

    start() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
                this.isListening = true;
            } catch(e) {
                console.warn("Failed to start recognition", e);
            }
        }
    }

    stop() {
        if (this.recognition) {
            try {
                this.recognition.stop();
                this.isListening = false;
            } catch(e) {}
        }
    }
}

// Helper to convert number words to digits for Math Game
export const wordToNumber = (text: string): string => {
    const map: {[key:string]: string} = {
        'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
        'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
        'ten': '10'
    };
    
    // Clean text
    const clean = text.toLowerCase().trim().replace('.', '');
    
    // Check direct map
    if (map[clean]) return map[clean];
    
    // Check if it's already a number
    if (!isNaN(Number(clean))) return clean;
    
    return clean;
};
