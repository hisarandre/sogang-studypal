import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { ChevronLeft, Check, X, ChevronRight, RefreshCw } from 'lucide-react'
import { LevelData } from '../models/LevelData'
import { levelsDescription } from '../data/levelDescription'
import LevelNav from '../components/LevelNav'
import { DisplayWord } from '../models/Word'
import { UserWord } from '../models/UserWord'

export default function WordsList() {
  const { levelId } = useParams<{ levelId: string }>()
  const [words, setWords] = useState<DisplayWord[]>([])
  const [loading, setLoading] = useState(true)
  const [levelInfo, setLevelInfo] = useState<Omit<LevelData, 'progress'> | null>(null)
  const [userWordsMap, setUserWordsMap] = useState<Map<string, UserWord>>(new Map())
  const [availableLevels, setAvailableLevels] = useState<string[]>([])
  const supabase = useSupabaseClient()
  const user = useUser()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'learned' | 'not_learned'>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>(levelId || '')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const pageSizeOptions = [10, 20, 50, 100]

  // Fetch available levels that have words
  useEffect(() => {
    const fetchAvailableLevels = async () => {
      const { data: levelsData, error } = await supabase
        .from('words')
        .select('level')
        .order('level')
        .limit(1000)

      if (error) {
        console.error('Error fetching available levels:', error)
        return
      }

      const levels = levelsData?.map(l => l.level) || []
      setAvailableLevels(levels)

      // If current level is not available, select the first available level
      if (selectedLevel && !levels.includes(selectedLevel)) {
        setSelectedLevel(levels[0] || '')
      }
    }

    fetchAvailableLevels()
  }, [supabase])

  useEffect(() => {
    const fetchWords = async () => {
      if (!selectedLevel) {
        setWords([])
        setLoading(false)
        return
      }

      setLoading(true)

      // Get level description
      const currentLevelData = levelsDescription.find(lvl => lvl.level === selectedLevel)
      setLevelInfo(currentLevelData || null)

      // Fetch all words for the specific level
      const { data: wordsData, error: wordsError } = await supabase
        .from('words')
        .select('id, hangul, translation, level, unit') // Select all relevant columns
        .eq('level', selectedLevel)
        .throwOnError()

      if (wordsError) {
        console.error('Error fetching words:', wordsError)
        setWords([])
        setLoading(false)
        return
      }

      // Fetch user's learned words for the specific level, including progress flags
      const { data: userWordsData, error: userWordsError } = await supabase
        .from('user_word')
        .select('word_id, writing, listening, meaning') // Select all relevant columns
        .eq('user_id', user?.id)
        .throwOnError()

      if (userWordsError) {
        console.error('Error fetching user words:', userWordsError)
        setWords([])
        setLoading(false)
        return
      }

      // Create a map for quick lookup of user word relations
      const userWordsMap = new Map<string, UserWord>();
      userWordsData?.forEach(uw => {
        userWordsMap.set(uw.word_id, uw);
      });
      setUserWordsMap(userWordsMap);

      const displayWords: DisplayWord[] = wordsData.map(word => {
        const userRelation = userWordsMap.get(word.id);
        // A word is learned if a relation exists and all three types are true
        const isLearned = userRelation ? 
          userRelation.writing && userRelation.listening && userRelation.meaning : 
          false;

        return {
          ...word,
          isLearned,
        }
      })

      setWords(displayWords)
      setLoading(false)
    }

    fetchWords()
  }, [selectedLevel, supabase, user])

  const filteredWords = words.filter(word => {
    if (filter === 'learned') {
      return word.isLearned
    } else if (filter === 'not_learned') {
      return !word.isLearned
    } else {
      return true // Show all words
    }
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredWords.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentWords = filteredWords.slice(startIndex, endIndex)

  // Reset to first page when filter or page size changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, pageSize])

  const handleResetWord = async (wordId: string) => {
    if (!user?.id) return;

    try {
      // Update the user_word relation to set all progress to false
      const { error } = await supabase
        .from('user_word')
        .upsert({
          user_id: user.id,
          word_id: wordId,
          writing: false,
          listening: false,
          meaning: false
        });

      if (error) {
        console.error('Error resetting word:', error);
        return;
      }

      // Refresh the words list
      const { data: userWordsData, error: userWordsError } = await supabase
        .from('user_word')
        .select('word_id, writing, listening, meaning')
        .eq('user_id', user.id)
        .throwOnError();

      if (userWordsError) {
        console.error('Error fetching updated user words:', userWordsError);
        return;
      }

      // Update the userWordsMap
      const newUserWordsMap = new Map<string, UserWord>();
      userWordsData?.forEach(uw => {
        newUserWordsMap.set(uw.word_id, uw);
      });
      setUserWordsMap(newUserWordsMap);

      // Update the words state
      setWords(prevWords => 
        prevWords.map(word => {
          if (word.id === wordId) {
            return {
              ...word,
              isLearned: false
            };
          }
          return word;
        })
      );
    } catch (error) {
      console.error('Error in handleResetWord:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-lg">Loading words...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-4">
      <LevelNav title={`Words for Level ${selectedLevel}`} levelId={selectedLevel} />

      <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-8 px-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${filter === 'all' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('learned')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${filter === 'learned' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Learned
          </button>
          <button
            onClick={() => setFilter('not_learned')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${filter === 'not_learned' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Not Learned
          </button>
        </div>
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">Select Level</option>
          {levelsDescription
            .filter(level => availableLevels.includes(level.level))
            .map((level) => (
              <option key={level.level} value={level.level}>
                Level {level.level}
              </option>
            ))}
        </select>
      </div>

      {words.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-lg text-gray-500">No words found for this level.</div>
        </div>
      ) : (
        <div className="overflow-x-auto px-6">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-primary text-white">
              <tr>
                <th className="py-3 px-4 text-left">Hangul</th>
                <th className="py-3 px-4 text-left">Translation</th>
                <th className="py-3 px-4 text-left">Unit</th>
                <th className="py-3 px-4 text-left">Writing</th>
                <th className="py-3 px-4 text-left">Listening</th>
                <th className="py-3 px-4 text-left">Meaning</th>
                <th className="py-3 px-4 text-left">Learned</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {currentWords.map((word) => (
                <tr key={word.id} className="border-b border-background hover:bg-background/50">
                  <td className="py-3 px-4">{word.hangul}</td>
                  <td className="py-3 px-4">{word.translation}</td>
                  <td className="py-3 px-4">{word.unit}</td>
                  <td className="py-3 px-4">
                    {userWordsMap.get(word.id)?.writing ? (
                      <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center">
                        <Check size={16} />
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 rounded-full w-6 h-6 flex items-center justify-center">
                        <X size={16} />
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {userWordsMap.get(word.id)?.listening ? (
                      <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center">
                        <Check size={16} />
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 rounded-full w-6 h-6 flex items-center justify-center">
                        <X size={16} />
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {userWordsMap.get(word.id)?.meaning ? (
                      <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center">
                        <Check size={16} />
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 rounded-full w-6 h-6 flex items-center justify-center">
                        <X size={16} />
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {word.isLearned ? (
                      <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center">
                        <Check size={16} />
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 rounded-full w-6 h-6 flex items-center justify-center">
                        <X size={16} />
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleResetWord(word.id)}
                      className="p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-full transition-colors"
                      title="Reset progress"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-600">entries</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 