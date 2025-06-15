import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import LevelCard from '../components/LevelCard'
import LevelNav from '../components/LevelNav'
import { LevelData } from '../models/LevelData'
import { levelsDescription } from '../data/levelDescription'
import { UserWord } from '../models/UserWord'


export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [dynamicLevels, setDynamicLevels] = useState<LevelData[]>([])
  const navigate = useNavigate()
  const supabase = useSupabaseClient()
  const user = useUser()

  useEffect(() => {
    const fetchLevelProgress = async () => {
      if (!user) {
        navigate('/login')
        return
      }

      setLoading(true)

      // Fetch all word levels and count them
      const { data: allWordsData, error: allWordsError } = await supabase
        .from('words')
        .select('level')
        .throwOnError()

      if (allWordsError) {
        console.error('Error fetching total words:', allWordsError)
        setLoading(false)
        return
      }

      if (!allWordsData || allWordsData.length === 0) {
        console.error('No words found in the database. Please add vocabulary words to the words table.')
      }

      // Count words per level
      const totalWordsMap: { [key: string]: number } = allWordsData?.reduce((acc, item: { level: string }) => {
        acc[item.level] = (acc[item.level] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number }) || {};


      // Fetch words known by the current user, including progress flags
      const { data: knownWordsData, error: knownWordsError } = await supabase
        .from('user_word')
        .select(`
          word_id,
          writing,
          listening,
          meaning,
          words!inner (level)
        `)
        .eq('user_id', user.id)
        .throwOnError()

      if (knownWordsError) {
        console.error('Error fetching known words:', knownWordsError)
        setLoading(false)
        return
      }

      const knownWordsCountMap: { [key: string]: number } = (knownWordsData as unknown as UserWord[])?.reduce((acc, item) => {
        const level = item.words.level
        // Only count if all three types are true
        if (level && item.writing && item.listening && item.meaning) {
          acc[level] = (acc[level] || 0) + 1
        }
        return acc
      }, {}) || {};


      const updatedLevels: LevelData[] = levelsDescription.map(lvl => {
        const total = totalWordsMap[lvl.level] || 0
        const known = knownWordsCountMap[lvl.level] || 0
        return {
          ...lvl,
          progress: `${known}/${total}`,
        }
      })

      setDynamicLevels(updatedLevels)
      setLoading(false)
    }

    fetchLevelProgress()
  }, [user, navigate, supabase])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="level-title mb-10">Choose your level</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {dynamicLevels.map((data, index) => (
          <Link key={index} to={`/level/${data.level}`}>
            <LevelCard
              level={data.level}
              progress={data.progress}
              description={data.description}
            />
          </Link>
        ))}
      </div>
    </div>
  )
} 