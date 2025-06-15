import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import LevelNav from '../components/LevelNav';
import { Volume2 } from 'lucide-react';
import { Switch } from '../components/ui/switch';
import KoreanKeyboard from '../components/KoreanKeyboard';
import Hangul from 'hangul-js';

interface Word {
  id: string;
  hangul: string;
  translation: string;
  level: string;
  unit: number;
  example_context?: string;
  example_context_translation?: string;
  created_at: string;
}

interface UserWordRelation {
  word_id: string;
  user_id: string;
  writing: boolean;
  listening: boolean;
  meaning: boolean;
}

type QuestionType = 'writing' | 'listening' | 'meaning';

interface QuizQuestion {
  word: Word;
  type: QuestionType;
  options?: string[]; // For 'meaning' type questions
}

const QuizPage: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const session = useSession();
  const supabase = useSupabaseClient();
  const userId = session?.user?.id;

  const [words, setWords] = useState<Word[]>([]);
  const [userRelations, setUserRelations] = useState<UserWordRelation[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [progress, setProgress] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [synth, setSynth] = useState<SpeechSynthesis | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [incorrectAnswersCount, setIncorrectAnswersCount] = useState(0);
  const [quizInitialized, setQuizInitialized] = useState(false);
  const [useIntegratedKeyboard, setUseIntegratedKeyboard] = useState(true);

  // Ref to hold the selected option for meaning questions synchronously
  const selectedMeaningOptionRef = useRef<string | null>(null);

  // Initialize Web Speech API
  useEffect(() => {
    const s = window.speechSynthesis;
    setSynth(s);

    const loadVoices = () => {
      const availableVoices = s.getVoices();
      setVoices(availableVoices);
    };

    s.addEventListener('voiceschanged', loadVoices);
    loadVoices(); // Load voices initially

    return () => {
      s.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  const speakKorean = useCallback((text: string) => {
    if (!synth || !voices.length) {
      console.warn('Speech synthesis not available or no voices loaded.');
      return;
    }

    const koreanVoice = voices.find(voice => voice.lang === 'ko-KR' || voice.name.includes('Korean'));

    if (!koreanVoice) {
      console.warn('No Korean voice found.');
      setFeedback('No Korean voice found in your browser. Please check your system settings.');
      return;
    }

    // Clear any pending speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = koreanVoice;
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9; // Slightly slower for better clarity

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      setIsSpeaking(false);
      // Filter out 'interrupted' errors as they are often benign and expected with cancel()
      if (event.error !== 'interrupted') {
        setFeedback(`Speech error: ${event.error}`);
      }
    };

    synth.speak(utterance);
  }, [synth, voices]);

  // Function to generate questions (now returns questions instead of setting state)
  const generateQuizQuestions = useCallback((wordsToUse: Word[], userRelationsToUse: UserWordRelation[]): QuizQuestion[] => {
    if (!wordsToUse.length || !userId) {
      return [];
    }

    const eligibleQuestions: QuizQuestion[] = [];

    wordsToUse.forEach(word => {
      // Use the provided userRelationsToUse to find the relation
      const relation = userRelationsToUse.find(rel => rel.word_id === word.id);

      const availableTypes: QuestionType[] = [];
      if (!relation || !relation.writing) availableTypes.push('writing');
      if (!relation || !relation.listening) availableTypes.push('listening');
      if (!relation || !relation.meaning) availableTypes.push('meaning');

      availableTypes.forEach(type => {
        let options: string[] | undefined;
        if (type === 'meaning') {
          const otherWords = wordsToUse.filter(w => w.id !== word.id);
          const shuffledOtherWords = otherWords.sort(() => 0.5 - Math.random());
          const incorrectOptions = shuffledOtherWords.slice(0, 3).map(w => w.translation);
          options = [word.translation, ...incorrectOptions].sort(() => 0.5 - Math.random());
        }
        eligibleQuestions.push({ word, type, options });
      });
    });

    // If no eligible questions, return empty array
    if (eligibleQuestions.length === 0) {
        return [];
    }

    const shuffledQuestions = eligibleQuestions.sort(() => 0.5 - Math.random());
    // Select up to 10 questions, or all if less than 10 eligible
    return shuffledQuestions.slice(0, Math.min(10, shuffledQuestions.length));
  }, [userId]); // userId is the only dependency that affects the logic of generating questions and should be present for memoization.

  // New function to initialize the quiz, including data fetching and question generation
  const initializeQuiz = useCallback(async () => {
    console.log('initializeQuiz called.');
    if (!levelId || !userId) return;

    // Fetch words
    const { data: wordsData, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .eq('level', levelId);

    if (wordsError) {
      console.error('Error fetching words:', wordsError);
      setWords([]);
      setQuizCompleted(true);
      return;
    }
    const fetchedWords = wordsData || [];
    setWords(fetchedWords); // Update words state
    console.log('initializeQuiz - Fetched words:', fetchedWords);

    if (fetchedWords.length === 0) {
      setUserRelations([]);
      setQuizCompleted(true);
      setQuizInitialized(true);
      console.log('initializeQuiz - No words found for this level.');
      return;
    }

    // Fetch user relations
    const { data: relationsData, error: relationsError } = await supabase
      .from('user_word')
      .select('*')
      .eq('user_id', userId)
      .in('word_id', fetchedWords.map(word => word.id));

    if (relationsError) {
      console.error('Error fetching user relations:', relationsError);
      setUserRelations([]);
      setQuizCompleted(true);
      return;
    }
    const fetchedRelations = relationsData || [];
    setUserRelations(fetchedRelations); // Update userRelations state
    console.log('initializeQuiz - Fetched user relations:', fetchedRelations);

    // Generate quiz questions using the fetched data
    const newQuizQuestions = generateQuizQuestions(fetchedWords, fetchedRelations);
    setQuizQuestions(newQuizQuestions);
    setCurrentQuestionIndex(0);
    setQuizCompleted(newQuizQuestions.length === 0); // If no questions, set to completed
    setFeedback(null);
    setIsCorrect(null);
    setUserAnswer('');
    setProgress(0);
    setCorrectAnswersCount(0); // Reset counts for new quiz
    setIncorrectAnswersCount(0); // Reset counts for new quiz
    selectedMeaningOptionRef.current = null; // Clear ref
    setQuizInitialized(true);
    console.log('initializeQuiz - Generated quiz questions:', newQuizQuestions);
    console.log('Quiz initialized (AFTER setting state): quizInitialized = true');
  }, [levelId, userId, supabase, generateQuizQuestions]);

  // Effect to trigger initial quiz initialization only once
  useEffect(() => {
    console.log('--- useEffect: Quiz Init ---');
    console.log('Current quizInitialized state (in useEffect): ', quizInitialized);
    if (!quizInitialized) {
      console.log('Calling initializeQuiz because quizInitialized is false.');
      initializeQuiz();
    } else {
      console.log('Quiz is already initialized. Skipping initializeQuiz call.');
    }
    console.log('--- End useEffect: Quiz Init ---');
  }, [quizInitialized, initializeQuiz]);

  // Update progress bar
  useEffect(() => {
    if (quizQuestions.length > 0) {
      setProgress(Math.floor((currentQuestionIndex / quizQuestions.length) * 100));
    } else {
      setProgress(0);
    }
  }, [currentQuestionIndex, quizQuestions.length]);

  const handleCheckAnswer = async () => {
    if (!userId || !quizQuestions.length) return;

    const currentQuestion = quizQuestions[currentQuestionIndex];

    let correct = false;

    let answerForComparison = userAnswer.trim();
    if (currentQuestion.type === 'meaning' && selectedMeaningOptionRef.current !== null) {
      answerForComparison = selectedMeaningOptionRef.current.trim();
    }

    switch (currentQuestion.type) {
      case 'writing':
        correct = answerForComparison === currentQuestion.word.hangul;
        break;
      case 'listening':
        correct = answerForComparison === currentQuestion.word.hangul;
        break;
      case 'meaning':
        const userAnsLower = answerForComparison.toLowerCase();
        const correctAnsLower = currentQuestion.word.translation.toLowerCase();
        correct = userAnsLower === correctAnsLower;
        break;
    }

    setIsCorrect(correct);
    if (correct) {
      setCorrectAnswersCount(prev => prev + 1);
      setFeedback('Correct!');

      // Update user relation in Supabase
      const { word, type } = currentQuestion;
      const updateColumn = type;

      console.log('handleCheckAnswer - Before userRelations update, quizInitialized:', quizInitialized);
      // Check if a relation already exists
      const existingRelation = userRelations.find(rel => rel.word_id === word.id);

      if (existingRelation) {
        // Update existing relation
        const { data, error } = await supabase
          .from('user_word')
          .update({ [updateColumn]: true })
          .eq('user_id', userId)
          .eq('word_id', word.id);

        if (error) {
          console.error('Error updating user relation:', error);
        } else {
          // Update local state - do NOT trigger full quiz re-initialization here
          setUserRelations(prev => {
            const updated = prev.map(rel =>
              rel.word_id === word.id ? { ...rel, [updateColumn]: true } : rel
            );
            console.log('handleCheckAnswer - userRelations updated (existing):', updated);
            return updated;
          });
        }
      } else {
        // Create new relation
        const { data, error } = await supabase
          .from('user_word')
          .insert({
            user_id: userId,
            word_id: word.id,
            writing: type === 'writing',
            listening: type === 'listening',
            meaning: type === 'meaning',
          });

        if (error) {
          console.error('Error inserting new user relation:', error);
        } else {
          // Update local state - do NOT trigger full quiz re-initialization here
          setUserRelations(prev => {
            const newRelation = {
              word_id: word.id,
              user_id: userId,
              writing: type === 'writing',
              listening: type === 'listening',
              meaning: type === 'meaning',
            };
            const updated = [...prev, newRelation];
            console.log('handleCheckAnswer - userRelations updated (new):', updated);
            return updated;
          });
        }
      }
      
      // Auto-advance after correct answer
      setTimeout(() => {
        handleNextQuestion();
      }, 1000); // 1-second delay

    } else {
      setIncorrectAnswersCount(prev => prev + 1);
      const correctAnswer = currentQuestion.type === 'meaning' ? 
        currentQuestion.word.translation : 
        currentQuestion.word.hangul;
      setFeedback(correctAnswer);
    }
  };

  const handleNextQuestion = () => {
    console.log('handleNextQuestion - Before increment, currentQuestionIndex:', currentQuestionIndex);
    setUserAnswer('');
    setFeedback(null);
    setIsCorrect(null);
    selectedMeaningOptionRef.current = null; // Clear ref for next question

    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => {
        console.log('handleNextQuestion - After increment, new currentQuestionIndex:', prev + 1);
        return prev + 1;
      });
    } else {
      console.log('handleNextQuestion - Quiz completed.');
      setQuizCompleted(true);
    }
  };

  const startNewQuiz = () => {
    console.log('startNewQuiz called. quizInitialized set to false.');
    setQuizCompleted(false);
    setQuizInitialized(false); // Reset to allow a new quiz to be generated
    initializeQuiz(); // Explicitly re-initialize the quiz
  };

  const renderQuestion = () => {
    if (!quizQuestions.length || currentQuestionIndex >= quizQuestions.length) {
      // Display a message if no eligible questions were found or quiz is completed and no questions to render
      if (quizCompleted && quizQuestions.length === 0) {
        return (
          <p className="text-xl text-gray-600">No eligible questions found for this level. Good job!</p>
        );
      }
      return <p>Loading questions...</p>;
    }

    const question = quizQuestions[currentQuestionIndex];

    switch (question.type) {
      case 'writing':
        return (
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-800 mb-4">{question.word.translation}</p>
            <div className="w-full max-w-md mx-auto">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleCheckAnswer(); }}
                placeholder="Type in Korean (한글)"
                className="w-full p-4 text-center text-3xl hangul bg-background focus:outline-none focus:border-transparent"
                disabled={isCorrect !== null}
              />
            </div>
          </div>
        );
      case 'listening':
        return (
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <button
                onClick={() => speakKorean(question.word.hangul)}
                disabled={isSpeaking || isCorrect !== null}
                className="flex items-center bg-primary/10 text-primary rounded-full px-4 py-2 font-semibold hover:bg-primary/20 transition-colors duration-200"
              >
                <Volume2 size={20} className="mr-2" />
                {isSpeaking ? 'Playing...' : 'Listen'}
              </button>
            </div>
            <div className="w-full max-w-md mx-auto">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleCheckAnswer(); }}
                placeholder="Type in Korean (한글)"
                className="w-full p-4 text-center text-3xl hangul bg-background focus:outline-none focus:border-transparent"
                disabled={isCorrect !== null}
              />
            </div>
          </div>
        );
      case 'meaning':
        return (
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-800 mb-4">{question.word.hangul}</p>
            <div className="w-full max-w-md mx-auto grid grid-cols-2 gap-4">
              {question.options?.map((option, index) => (
                <button
                  key={index}
                  className={`p-4 text-lg rounded-lg transition-colors duration-200
                    ${isCorrect === null 
                      ? 'bg-white hover:bg-gray-50 border border-gray-200' 
                      : (userAnswer === option && !isCorrect 
                        ? 'bg-red-100 border-red-400 text-red-800' 
                        : (option === question.word.translation 
                          ? 'bg-green-100 border-green-400 text-green-800' 
                          : 'bg-white border-gray-200'))
                    }
                    ${isCorrect !== null ? 'cursor-not-allowed' : ''}
                  `}
                  onClick={() => {
                    if (isCorrect === null) {
                      setUserAnswer(option);
                      selectedMeaningOptionRef.current = option;
                      handleCheckAnswer();
                    }
                  }}
                  disabled={isCorrect !== null}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  // Add keyboard handlers
  const handleKeyPress = useCallback((char: string) => {
    if (isCorrect !== null) return;
    setUserAnswer(prev => {
      const disassembled = Hangul.disassemble(prev);
      disassembled.push(char);
      return Hangul.assemble(disassembled);
    });
  }, [isCorrect]);

  const handleSpace = useCallback(() => {
    if (isCorrect !== null) return;
    setUserAnswer(prev => prev + ' ');
  }, [isCorrect]);

  const handleReturn = useCallback(() => {
    handleCheckAnswer();
  }, [handleCheckAnswer]);

  const handleBackspace = useCallback(() => {
    if (isCorrect !== null) return;
    setUserAnswer(prev => prev.slice(0, -1));
  }, [isCorrect]);

  const keyboardToggleContent = (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Use Keyboard</span>
      <Switch
        checked={useIntegratedKeyboard}
        onCheckedChange={setUseIntegratedKeyboard}
      />
    </div>
  );

  if (!levelId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-lg text-red-500">Level ID not provided.</div>
      </div>
    );
  }

  if (!quizInitialized || words.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-lg">Loading quiz...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col py-4 container mx-auto">
      <LevelNav 
        title={`Quiz - Level ${levelId}`} 
        levelId={levelId!} 
        extraContent={keyboardToggleContent}
      />

      {!quizCompleted ? (
        <>
          {/* Progress Bar */}
          <div className="mb-6 w-full">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-primary/5 rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center space-y-8 max-w-6xl mx-auto">
            <div className="flex-1 flex flex-col items-center justify-center">
              {renderQuestion()}
            </div>

            {feedback && (
              <div className={`mt-4 p-3 rounded-md text-white text-center font-semibold 
                ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                {feedback}
              </div>
            )}

            <div className="mt-8 w-full">
              {isCorrect === null ? (
                <button
                  onClick={handleCheckAnswer}
                  className="button block w-full max-w-lg mx-auto h-12"
                >
                  Verify
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="button block w-full max-w-lg mx-auto h-12"
                >
                  {currentQuestionIndex < quizQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                </button>
              )}
            </div>

            {useIntegratedKeyboard && (quizQuestions[currentQuestionIndex]?.type === 'writing' || quizQuestions[currentQuestionIndex]?.type === 'listening') && (
              <KoreanKeyboard
                onKeyPress={handleKeyPress}
                onSpace={handleSpace}
                onReturn={handleReturn}
                onBackspace={handleBackspace}
                disabled={isCorrect !== null}
              />
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <h2 className="text-4xl font-bold text-primary mb-4">Quiz Completed!</h2>
          <p className="text-xl text-gray-700 mb-2">Correct answers: {correctAnswersCount}</p>
          <p className="text-xl text-gray-700 mb-6">Incorrect answers: {incorrectAnswersCount}</p>
          <button 
            onClick={startNewQuiz} 
            className="button w-full max-w-md"
          >
            Start New Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizPage; 