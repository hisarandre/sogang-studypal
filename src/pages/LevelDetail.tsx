import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { WalletCards, Pencil, Headphones, List } from 'lucide-react'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { useState, useEffect } from 'react'
import { LevelData } from '../models/LevelData'
import { levelsDescription } from '../data/levelDescription'
import LevelCardResume from '../components/LevelCardResume'
import PracticeBtn from '../components/PracticeBtn'
import LevelNav from '../components/LevelNav'

export default function LevelDetail() {
  const { levelId } = useParams<{ levelId: string }>()
  const [levelInfo, setLevelInfo] = useState<LevelData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useSupabaseClient()
  const user = useUser()

  const fetchLevelInfo = async () => {
    if (!levelId || !user?.id) {
      console.log('Waiting for user or levelId:', { userId: user?.id, levelId });
      return;
    }

    setLoading(true);
    try {
      // Fetch total words for this level
      const { data: wordsData, error: wordsError } = await supabase
        .from('words')
        .select('id')
        .eq('level', levelId);

      if (wordsError) {
        console.error('Error fetching words:', wordsError);
        return;
      }

      const totalWords = wordsData?.length || 0;

      // Fetch user's progress for this level, including all learning flags
      const { data: userWordsData, error: userWordsError } = await supabase
        .from('user_word')
        .select('word_id, writing, listening, meaning, words!inner(level)') // Select all relevant flags and join to filter by level
        .eq('user_id', user.id)
        .eq('words.level', levelId);

      if (userWordsError) {
        console.error('Error fetching user words:', userWordsError);
        return;
      }

      // Count words where all three types are learned
      const fullyLearnedWords = userWordsData?.filter(uw => 
        uw.writing && uw.listening && uw.meaning
      ).length || 0;

      const currentLevel = levelsDescription.find(lvl => lvl.level === levelId);
      
      if (currentLevel) {
        setLevelInfo({
          level: currentLevel.level,
          description: currentLevel.description || '',
          progress: `${fullyLearnedWords}/${totalWords}`
        });
      } else {
        setLevelInfo(null);
      }
    } catch (error) {
      console.error('Error in fetchLevelInfo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLevelInfo();
  }, [levelId, user?.id]); 

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!levelInfo) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-lg text-red-500">Level not found.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-start container mx-auto bg-background">
      <LevelNav title={`Level ${levelInfo.level}`} levelId={levelInfo.level} />
      
      <LevelCardResume 
        level={levelInfo.level}
        progress={levelInfo.progress}
        description={levelInfo.description}
      />

      <div className="w-full space-y-4 mb-8">
        <PracticeBtn level={levelInfo.level} text="Flashcards" icon="WalletCards" />
        <PracticeBtn level={levelInfo.level} text="Writing" icon="Pencil" />
        <PracticeBtn level={levelInfo.level} text="Listening" icon="Headphones" />
        <PracticeBtn level={levelInfo.level} text="Words list" icon="List" />
      </div>

      <Link to={`/level/${levelInfo.level}/test`} className="button w-full">
        Test
      </Link>
    </div>
  );
} 