import { LevelData } from "../models/LevelData"

export const levelsDescription: Omit<LevelData, 'progress'>[] = [
    { level: '1A', description: 'Basic greetings and introductions' },
    { level: '1B', description: 'Basic communication for daily life' },
    { level: '2A', description: 'Basic communication for daily life and Korean culture' },
    { level: '2B', description: 'Basic communication for daily life and Korean culture' },
    { level: '3A', description: 'Communicate in ordinary situations in Korean society' },
    { level: '3B', description: 'Communicate in ordinary situations in Korean society' },
    { level: '4A', description: 'Understand and use expressions in basic social situations' },
    { level: '4B', description: 'Understand and use expressions in basic social situations' },
    { level: '5A', description: 'Understand and use expressions in everyday social situations' },
    { level: '5B', description: 'Understand and use expressions in everyday social situations' },
    { level: '6A', description: 'Understand and use expressions in almost any social situation' },
    { level: '6B', description: 'Understand and use expressions in almost any social situation' },
  ]