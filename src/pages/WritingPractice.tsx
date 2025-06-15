import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { ChevronLeft, Keyboard } from 'lucide-react';
import LevelNav from '../components/LevelNav';
import KoreanKeyboard from '../components/KoreanKeyboard';
import Hangul from 'hangul-js';
import { Switch } from '../components/ui/switch';

interface DisplayWord {
  id: string;
  hangul: string;
  translation: string;
  level: string;
  unit: number;
  example_context: string | null;
  example_context_translation: string | null;
}

export default function WritingPractice() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const supabase = useSupabaseClient();
  const user = useUser();

  const [allWords, setAllWords] = useState<DisplayWord[]>([]);
  const [currentWord, setCurrentWord] = useState<DisplayWord | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [loading, setLoading] = useState(true);
  const [useIntegratedKeyboard, setUseIntegratedKeyboard] = useState(true);

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
      } while (nextWord?.id === currentWord?.id && allWords.length > 1);
      setCurrentWord(nextWord);
      setInputValue('');
      setFeedback(null);
    } else {
      setCurrentWord(null);
    }
  }, [allWords, currentWord]);

  const speakKorean = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.8; // Slightly slower for better clarity
      utterance.volume = 1;
      
      // Ensure we have voices loaded
      const voices = window.speechSynthesis.getVoices();
      const koreanVoice = voices.find(voice => voice.lang === 'ko-KR');
      if (koreanVoice) {
        utterance.voice = koreanVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Cleanup speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Load voices when component mounts
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Some browsers need this to load voices
      window.speechSynthesis.getVoices();
    }
  }, []);

  const handleVerify = useCallback(() => {
    if (currentWord?.hangul) {
      if (inputValue === currentWord.hangul) {
        setFeedback('correct');
        // Small delay before speaking to ensure UI updates first
        setTimeout(() => {
          speakKorean(currentWord.hangul);
        }, 100);
        setTimeout(() => {
          selectNextWord();
        }, 700);
      } else {
        setFeedback('incorrect');
        // Small delay before speaking to ensure UI updates first
        setTimeout(() => {
          speakKorean(currentWord.hangul);
        }, 100);
      }
    }
  }, [currentWord, inputValue, selectNextWord, speakKorean]);

  const handleNext = useCallback(() => {
    selectNextWord();
  }, [selectNextWord]);

  const handleKeyPress = useCallback((char: string) => {
    setInputValue(prev => {
      // First disassemble the current input into jamo
      const disassembled = Hangul.disassemble(prev);
      // Add the new character
      disassembled.push(char);
      // Reassemble everything
      return Hangul.assemble(disassembled);
    });
    setFeedback(null);
  }, []);

  const handleSpace = useCallback(() => {
    setInputValue(prev => prev + ' ');
    setFeedback(null);
  }, []);

  const handleReturn = useCallback(() => {
    handleVerify();
  }, [handleVerify]);

  const handleBackspace = useCallback(() => {
    setInputValue(prev => prev.slice(0, -1));
    setFeedback(null);
  }, []);

  const handlePhysicalKeyPress = useCallback((event: KeyboardEvent) => {
    if (!useIntegratedKeyboard && !feedback) {
      const key = event.key;
      
      // Handle special keys
      if (key === 'Backspace') {
        handleBackspace();
      } else if (key === 'Enter') {
        handleVerify();
      } else if (key === ' ') {
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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setFeedback(null);
  }, []);

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
        <div className="text-lg">Loading writing practice...</div>
      </div>
    );
  }

  if (allWords.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-lg text-gray-500">No words found for this level to practice writing.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col py-4 container mx-auto">
      <LevelNav 
        title={`Writing ${levelId}`} 
        levelId={levelId!} 
        extraContent={keyboardToggleContent}
      />

      {/* Practice Area */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 px-6">
        {currentWord && (
          <>
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-800 mb-4">{currentWord.translation}</p>
            </div>

            <div className="w-full max-w-md">
              {!useIntegratedKeyboard ? (
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleVerify();
                    }
                  }}
                  placeholder="Type in Korean (한글)"
                  className={`w-full p-4 text-center text-3xl hangul bg-background focus:outline-none focus:border-transparent`}
                  autoFocus
                  disabled={feedback === 'correct'}
                />
              ) : (
                <p className="bg-background hangul w-full p-4 text-center !text-3xl focus:outline-none focus:border-none">
                  {inputValue}
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
                    onClick={handleNext}
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