import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { ChevronLeft, Volume2 } from 'lucide-react';
import LevelNav from '../components/LevelNav';
import KoreanKeyboard from '../components/KoreanKeyboard';
import { Switch } from '../components/ui/switch';
import ListenBtn from '../components/ListenBtn';
import Hangul from 'hangul-js';

interface DisplayWord {
  id: string;
  hangul: string;
  translation: string;
  level: string;
  unit: number;
  example_context: string | null;
  example_context_translation: string | null;
}

export default function ListeningPractice() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const supabase = useSupabaseClient();
  const user = useUser();

  const [allWords, setAllWords] = useState<DisplayWord[]>([]);
  const [currentWord, setCurrentWord] = useState<DisplayWord | null>(null);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [useIntegratedKeyboard, setUseIntegratedKeyboard] = useState(true);

  const speakWord = useCallback((text: string) => {
    if (!text) {
      console.warn('Cannot speak: text empty');
      return;
    }
    if (!window.speechSynthesis) {
      console.warn('SpeechSynthesis API not supported.');
      return;
    }

    // Immediately cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR'; // Set language to Korean
    utterance.rate = 1; 
    utterance.pitch = 1;

    // Try to find a Korean voice
    const voices = window.speechSynthesis.getVoices();
    const koreanVoice = voices.find(voice => voice.lang.includes('ko'));
    if (koreanVoice) {
      utterance.voice = koreanVoice;
      console.log('Using Korean voice:', koreanVoice.name);
    } else {
      console.warn('Korean voice (ko-KR) not found, using default.');
    }

    let timeoutId: NodeJS.Timeout;

    utterance.onstart = () => {
      console.log('Utterance started for:', text);
      setIsSpeaking(true); 
      timeoutId = setTimeout(() => {
        console.warn('Forcing isSpeaking to false after timeout for:', text);
        setIsSpeaking(false);
      }, 3000);
    };
    utterance.onend = () => {
      console.log('Utterance ended for:', text);
      setIsSpeaking(false);
      clearTimeout(timeoutId);
    };
    utterance.onerror = (event) => {
      if (event.error !== 'interrupted') {
        console.error('Utterance error for:', text, event);
      } else {
        console.warn('Utterance interrupted:', text);
      }
      setIsSpeaking(false);
      clearTimeout(timeoutId);
    };

    window.speechSynthesis.speak(utterance);

  }, [setIsSpeaking]);

  useEffect(() => {
    if (window.speechSynthesis) {
      // Load voices and set up onvoiceschanged listener
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('Voices loaded:', voices.map(v => `${v.name} (${v.lang})`));
        if (voices.length > 0) {
          setVoicesLoaded(true);
          // If we have a current word, try to speak it immediately
          if (currentWord?.hangul) {
            speakWord(currentWord.hangul);
          }
        }
      };

      // Try to load voices immediately
      loadVoices();

      // Also set up the listener for when voices change
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null; // Clean up
      };
    }
  }, [currentWord?.hangul, speakWord]);

  const fetchWords = useCallback(async () => {
    if (!levelId || !user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: wordsData, error } = await supabase
        .from('words')
        .select('id, hangul, translation, level, unit, example_context, example_context_translation')
        .eq('level', levelId);

      if (error) {
        console.error('Error fetching words:', error);
        return;
      }

      if (wordsData && wordsData.length > 0) {
        const validWords: DisplayWord[] = wordsData.filter(word => word.id && typeof word.id === 'string' && word.id.length > 0) as DisplayWord[];
        setAllWords(validWords);
        // Select initial random word
        const initialWord = validWords[Math.floor(Math.random() * validWords.length)];
        setCurrentWord(initialWord);
      } else {
        setAllWords([]);
        setCurrentWord(null);
      }
    } catch (error) {
      console.error('Unexpected error fetching words:', error);
    } finally {
      setLoading(false);
    }
  }, [levelId, user?.id, supabase]);

  useEffect(() => {
    if (user?.id) {
      fetchWords();
    }
  }, [user?.id, fetchWords]);

  const selectNextWord = useCallback(() => {
    if (allWords.length > 0) {
      let nextWord;
      do {
        nextWord = allWords[Math.floor(Math.random() * allWords.length)];
      } while (nextWord?.id === currentWord?.id && allWords.length > 1); // Avoid repeating the same word immediately if more than one word
      setCurrentWord(nextWord);
      setUserInput('');
      setFeedback(null);
      // Ensure speaking state is reset when moving to next word
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false); // Manually set to false for clean state
    } else {
      setCurrentWord(null);
    }
  }, [allWords, currentWord]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
    setFeedback(null);
  }, []);

  const handleVerify = useCallback(() => {
    if (currentWord?.hangul) {
      if (userInput === currentWord.hangul) {
        setFeedback('correct');
        // Auto-advance on correct answer
        setTimeout(() => {
          selectNextWord();
        }, 700); 
      } else {
        setFeedback('incorrect');
      }
    }
  }, [currentWord, userInput, selectNextWord]);

  const handleKeyPress = useCallback((char: string) => {
    if (feedback) return; // Don't allow input when feedback is shown
    setUserInput(prev => {
      // First disassemble the current input into jamo
      const disassembled = Hangul.disassemble(prev);
      // Add the new character
      disassembled.push(char);
      // Reassemble everything
      return Hangul.assemble(disassembled);
    });
    setFeedback(null);
  }, [feedback]);

  const handleSpace = useCallback(() => {
    if (feedback) return; // Don't allow input when feedback is shown
    setUserInput(prev => prev + ' ');
    setFeedback(null);
  }, [feedback]);

  const handleReturn = useCallback(() => {
    handleVerify();
  }, [handleVerify]);

  const handleBackspace = useCallback(() => {
    if (feedback) return; // Don't allow input when feedback is shown
    setUserInput(prev => prev.slice(0, -1));
    setFeedback(null);
  }, [feedback]);

  const handlePhysicalKeyPress = useCallback((event: KeyboardEvent) => {
    if (!useIntegratedKeyboard && !feedback) {
      const key = event.key;
      
      // Handle special keys
      if (key === 'Backspace') {
        event.preventDefault(); // Prevent default to avoid double handling
        handleBackspace();
      } else if (key === 'Enter') {
        event.preventDefault(); // Prevent default to avoid double handling
        handleVerify();
      } else if (key === ' ') {
        event.preventDefault(); // Prevent default to avoid double handling
        handleSpace();
      }
    }
  }, [useIntegratedKeyboard, feedback, handleBackspace, handleVerify, handleSpace]);

  useEffect(() => {
    window.addEventListener('keydown', handlePhysicalKeyPress);
    return () => {
      window.removeEventListener('keydown', handlePhysicalKeyPress);
    };
  }, [handlePhysicalKeyPress]);

  const handleListenAgain = useCallback(() => {
    if (currentWord?.hangul && voicesLoaded) { // Only listen again if voices are loaded
      console.log('Listen again trigger for:', currentWord.hangul);
      speakWord(currentWord.hangul);
    }
  }, [currentWord?.hangul, speakWord, voicesLoaded]);

  const handleNextWord = useCallback(() => {
    selectNextWord();
  }, [selectNextWord]);

  const keyboardToggleContent = (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Use Keyboard</span>
      <Switch
        checked={useIntegratedKeyboard}
        onCheckedChange={setUseIntegratedKeyboard}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-lg">Loading listening practice...</div>
      </div>
    );
  }

  if (allWords.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-lg text-gray-500">No words found for this level to practice listening.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col py-4 container mx-auto">
      <LevelNav 
        title={`Listening ${levelId}`} 
        levelId={levelId!} 
        extraContent={keyboardToggleContent}
      />

      {/* Practice Area */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 px-6">
        {currentWord && (
          <>
            <div className="flex justify-center mb-8">
              <ListenBtn handleListen={handleListenAgain} />
            </div>

            <div className="w-full max-w-md">
              {!useIntegratedKeyboard ? (
                <input
                  type="text"
                  value={userInput}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleVerify();
                    } else if (e.key === 'Backspace') {
                      e.preventDefault();
                      handleBackspace();
                    }
                  }}
                  placeholder="Type in Korean (한글)"
                  className={`w-full p-4 text-center text-3xl hangul bg-background focus:outline-none focus:border-transparent`}
                  autoFocus
                  disabled={feedback === 'correct'}
                />
              ) : (
                <p className="bg-background hangul w-full p-4 text-center !text-3xl focus:outline-none focus:border-none">
                  {userInput}
                </p>
              )}

              {feedback === null && (
                <button 
                  onClick={handleVerify}
                  className="button mt-4 w-full"
                >
                  Verify
                </button>
              )}
              {feedback === 'correct' && (
                <p className="text-green-600 text-center mt-2 text-lg">Correct!</p>
              )}
              {feedback === 'incorrect' && currentWord?.hangul && (
                <>
                  <p className="text-red-600 text-center mt-2 text-lg hangul font-semibold">{currentWord.hangul}</p>
                  <button 
                    onClick={handleNextWord}
                    className="button mt-4 w-full"
                  >
                    Next
                  </button>
                </>
              )}
            </div>

            {useIntegratedKeyboard && (
              <KoreanKeyboard
                onKeyPress={handleKeyPress}
                onSpace={handleSpace}
                onReturn={handleReturn}
                onBackspace={handleBackspace}
                disabled={feedback === 'correct' || feedback === 'incorrect'}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
} 