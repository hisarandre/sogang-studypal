import React from 'react'

interface LevelCardProps {
  level: string;
  progress: string;
  description?: string;
}

export default function LevelCardResume({ level, progress, description }: LevelCardProps) {
  return (
    <div className="w-full bg-gradient-to-br from-primary-card-start to-primary-card-end rounded-lg px-6 mb-8 text-white">
      <div className="flex justify-between items-center pt-4 mb-2">
        <h3>SOGANG {level}</h3>
        <h4>{progress}</h4>
      </div>
      <p className="opacity-90 !mx-0">{description}</p>
    </div>
  );
} 