import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { ChevronLeft, RefreshCw, Volume2 } from 'lucide-react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { levelsDescription } from '../data/levelDescription'
import { Word, DisplayWord } from '../models/Word'
import { useSpeech } from 'react-text-to-speech'
import LevelNav from '../components/LevelNav'
import ListenBtn from '../components/ListenBtn'
import Tag from '../components/Tag'
import { Switch } from '../components/ui/switch'

export default function Flashcards() {
  const { levelId } = useParams<{ levelId: string }>()
  const navigate = useNavigate()
  const supabase = useSupabaseClient()
  const user = useUser()

  const [allWords, setAllWords] = useState<DisplayWord[]>([])
  const [words, setWords] = useState<DisplayWord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [levelDescription, setLevelDescription] = useState('')
  const [showHangulFirst, setShowHangulFirst] = useState(true)

  // Ref to hold the latest words array for accurate index calculation
  const wordsRef = React.useRef(words);

  useEffect(() => {
    wordsRef.current = words;
    // Ensure currentCardIndex is valid after words array changes
    if (words.length > 0 && currentCardIndex >= words.length) {
      setCurrentCardIndex(0);
    } else if (words.length === 0 && currentCardIndex !== 0) {
      setCurrentCardIndex(0); // If words becomes empty, reset index to 0
    }
  }, [words]); // Only depend on words to prevent infinite loop and ensure index is always valid

  const fetchWords = useCallback(async () => {
    if (!levelId || !user?.id) {
      console.log('Waiting for user or levelId:', { userId: user?.id, levelId });
      setLoading(false);
      return;
    }

    setLoading(true);
    setShowAnswer(false);
    setCurrentCardIndex(0);

    try {
      const currentLevel = levelsDescription.find(lvl => lvl.level === levelId);
      if (currentLevel) {
        setLevelDescription(currentLevel.description || '');
      }

      console.log('Fetching words for level:', levelId);

      const { data: wordsData, error: wordsError } = await supabase
        .from('words')
        .select('id, hangul, translation, level, unit, example_context, example_context_translation')
        .eq('level', levelId);

      if (wordsError) {
        console.error('Error fetching words for flashcards:', wordsError);
        return;
      }

      if (!wordsData || wordsData.length === 0) {
        console.error('No words found for level:', levelId);
        return;
      }

      // Filter out any words with invalid IDs and ensure they are valid UUIDs
      const validWords = wordsData.filter(word => {
        const isValid = word.id && 
                       typeof word.id === 'string' && 
                       word.id.length > 0 && 
                       /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(word.id);
        if (!isValid) {
          console.warn('Invalid word ID found:', word);
        }
        return isValid;
      });

      if (validWords.length === 0) {
        console.error('No valid words found after filtering');
        return;
      }

      const wordIds = validWords.map(w => w.id);

      // Only proceed with user words fetch if we have valid IDs
      let userWordMap = new Map<string, boolean>();
      if (wordIds.length > 0) {
        const { data: userWordsData, error: userWordsError } = await supabase
          .from('user_word')
          .select('word_id, showFlashcard')
          .eq('user_id', user.id)
          .in('word_id', wordIds);

        if (userWordsError) {
          console.error('Error fetching user words for flashcards:', userWordsError);
        } else if (userWordsData) {
          userWordsData.forEach(uw => {
            if (uw.word_id && typeof uw.showFlashcard === 'boolean') {
              userWordMap.set(uw.word_id, uw.showFlashcard);
            }
          });
        }
      }

      // Create all words array for progress tracking
      const allWordsArray: DisplayWord[] = validWords.map(word => ({
        ...word,
        showFlashcard: userWordMap.get(word.id) ?? true,
      }));

      // Create filtered array for flashcards (only unlearned words)
      const unlearnedWords: DisplayWord[] = allWordsArray
        .filter(word => word.showFlashcard)
        .sort(() => Math.random() - 0.5);

      console.log('All words:', allWordsArray.length, 'Unlearned words:', unlearnedWords.length);
      setAllWords(allWordsArray);
      setWords(unlearnedWords);
    } catch (error) {
      console.error('Error in fetchWords:', error);
    } finally {
      setLoading(false);
    }
  }, [levelId, supabase, user])

  useEffect(() => {
    if (user?.id) {
      fetchWords();
    }
  }, [user?.id, fetchWords]);

  const handleShowAnswer = () => {
    setShowAnswer(prev => !prev)
  }

  const updateWordStatus = async (wordId: string, status: boolean) => {
    if (!user?.id || !wordId) {
      console.error('Missing user ID or word ID:', { userId: user?.id, wordId });
      return;
    }

    console.log('Attempting to update word status for:', wordId, 'with status:', status);

    try {
      // First, verify the word exists in the words table and get its data
      const { data: wordData, error: wordError } = await supabase
        .from('words')
        .select('id, level')
        .eq('id', wordId)
        .single();

      if (wordError) {
        console.error('Error checking word existence:', wordError);
        return;
      }

      if (!wordData) {
        console.error(`Word with id ${wordId} does not exist in words table`);
        return;
      }

      // Check if the word is already in user_word
      const { data: existingUserWord, error: checkError } = await supabase
        .from('user_word')
        .select('word_id')
        .eq('user_id', user.id)
        .eq('word_id', wordId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing user word:', checkError);
        return;
      }

      let result;
      if (existingUserWord) {
        // Update existing record
        console.log('Attempting to UPDATE user_word with:', { userId: user.id, wordId, showFlashcard: status });
        result = await supabase
          .from('user_word')
          .update({ showFlashcard: status })
          .eq('user_id', user.id)
          .eq('word_id', wordId);
      } else {
        // Insert new record
        console.log('Attempting to INSERT new user_word record with:', { userId: user.id, wordId, showFlashcard: status });
        result = await supabase
          .from('user_word')
          .insert({
            user_id: user.id,
            word_id: wordId,
            showFlashcard: status
          });
      }

      if (result.error) {
        console.error(`Error updating word status for ${wordId}:`, result.error);
        if (result.error.code === '23503') {
          console.log('Foreign key error detected, refreshing words list...');
          await fetchWords();
        }
      } else {
        console.log('Successfully updated word status:', { wordId, status, data: result.data });
        // Update both states
        setAllWords(prev => prev.map(word => 
          word.id === wordId ? { ...word, showFlashcard: status } : word
        ));
        // If marking as known, remove from words list
        if (!status) {
          setWords(prev => prev.filter(word => word.id !== wordId));
        }
      }
    } catch (error) {
      console.error('Unexpected error in updateWordStatus:', error);
      if (error instanceof Error && error.message.includes('foreign key')) {
        await fetchWords();
      }
    }
  };

  const handleKnow = async () => {
    if (currentWord) {
      console.log('Handling "I Know" for word:', currentWord);
      await updateWordStatus(currentWord.id, false);
      setShowAnswer(false);
      // The useEffect below will handle resetting currentCardIndex if words becomes empty
      // or if the current index is out of bounds for the new words array.
    }
  };

  const handleDontKnow = async () => {
    if (currentWord) {
      console.log('Handling "I Don\'t Know" for word:', currentWord);
      await updateWordStatus(currentWord.id, true);
      setShowAnswer(false);
      // Advance to next word if available
      if (currentCardIndex < words.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
      }
    }
  };

  const handleReset = async () => {
    if (!user?.id || !levelId) return;

    setLoading(true);
    try {
      // First, get all words for this level
      const { data: wordsData, error: wordsError } = await supabase
        .from('words')
        .select('id')
        .eq('level', levelId);

      if (wordsError) {
        console.error('Error fetching words for reset:', wordsError);
        return;
      }

      if (!wordsData || wordsData.length === 0) {
        console.error('No words found for level:', levelId);
        return;
      }

      const wordIds = wordsData.map(w => w.id);

      // Create entries with showFlashcard = true
      const newEntries = wordIds.map(wordId => ({
        user_id: user.id,
        word_id: wordId,
        showFlashcard: true
      }));

      // Use upsert to handle both new and existing records
      const { error: upsertError } = await supabase
        .from('user_word')
        .upsert(newEntries, {
          onConflict: 'user_id,word_id'
        });

      if (upsertError) {
        console.error('Error upserting user words:', upsertError);
      } else {
        console.log('Flashcards reset successfully.');
        // Update states directly first
        setAllWords(prev => prev.map(word => ({ ...word, showFlashcard: true })));
        setWords(prev => allWords.map(word => ({ ...word, showFlashcard: true })).sort(() => Math.random() - 0.5));
        // Then refetch to ensure everything is in sync
        await fetchWords();
      }
    } catch (error) {
      console.error('Error in handleReset:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentWord = words[currentCardIndex]
  const { start: startSpeech } = useSpeech({ 
    text: currentWord?.hangul || '', 
    lang: 'ko-KR',
    rate: 0.9,
    pitch: 1,
    volume: 1
  });

  const handleListen = useCallback(() => {
    if (currentWord?.hangul) {
      window.speechSynthesis.cancel();
      startSpeech();
    }
  }, [currentWord?.hangul, startSpeech]);

  const learnedWordsCount = allWords.filter(word => !word.showFlashcard).length;
  const totalWordsCount = allWords.length;
  const progressPercentage = totalWordsCount > 0 ? (learnedWordsCount / totalWordsCount) * 100 : 0;


  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-lg">Loading flashcards...</div>
      </div>
    )
  }

  if (allWords.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-lg text-gray-500">No flashcards found for this level.</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col container mx-auto py-4">
      <LevelNav 
        title={`Flashcards ${levelId}`}
        levelId={levelId!}
        showResetButton={true}
        onReset={handleReset}
        extraContent={
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show Hangul First</span>
            <Switch
              checked={showHangulFirst}
              onCheckedChange={setShowHangulFirst}
            />
          </div>
        }
      />

      {/* Progress Bar */}
      <div className="mb-6 px-6">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Learned {learnedWordsCount} of {totalWordsCount}</span>
          <span>{progressPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-primary/5 rounded-full h-2.5">
          <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>

      {words.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary mb-2">Congratulations</h2>
            <p className="text-lg text-gray-600">You've learned all the words in this level</p>
          </div>
        </div>
      ) : (
        <>
          {/* Listen Button */}
          <ListenBtn 
            handleListen={handleListen}
          />

          {/* Flashcard */}
          <div className="flex-1 flex items-center justify-center mb-8 px-6">
            <div className="relative w-full md:w-1/2 lg:w-1/2 xl:w-1/2 max-w-2xl h-[300px] perspective-1000">
              <div className="relative w-full h-full text-center transform-style-3d">
                {/* Front of the card */}
                <motion.div
                  className="absolute w-full h-full bg-white rounded-lg p-8 flex flex-col justify-between items-center backface-hidden"
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: showAnswer ? 180 : 0 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 100, damping: 15 }}
                  onClick={handleShowAnswer}
                >
                  <Tag text={`Unit ${currentWord?.unit}`} />

                  <div className="flex-1 flex flex-col justify-center items-center">
                    <p className="text-3xl font-bold mb-2 text-title hangul">
                      {showHangulFirst ? currentWord?.hangul : currentWord?.translation}
                    </p>
                  </div>

                  <span className="text-gray-400 text-sm mt-4">Tap to reveal meaning</span>
                </motion.div>

                {/* Back of the card */}
                <motion.div
                  className="absolute w-full h-full bg-white rounded-lg p-8 flex flex-col justify-between items-center backface-hidden"
                  initial={{ rotateY: -180 }}
                  animate={{ rotateY: showAnswer ? 0 : -180 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 100, damping: 15 }}
                  onClick={handleShowAnswer}
                >
                  <Tag text={`Unit ${currentWord?.unit}`} />
                  
                  <div className="flex-1 flex flex-col justify-center items-center">
                    <p className="text-3xl font-bold mb-2 text-primary hangul">
                      {showHangulFirst ? currentWord?.translation : currentWord?.hangul}
                    </p>
                  </div>

                  <span className="text-gray-400 text-sm mt-4">Tap to flip back</span>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex w-full items-center justify-center space-x-4 px-6">
            <button onClick={handleDontKnow} className="button w-1/2 max-w-xs px-6 py-3">
              I don't know
            </button>
            <button onClick={handleKnow} className="button w-1/2 max-w-xs px-6 py-3">
              I know
            </button>
          </div>
        </>
      )}
    </div>
  );
} 