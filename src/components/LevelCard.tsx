import React from 'react'

interface LevelCardProps {
  level: string;
  progress: string;
  description?: string;
}

export default function LevelCard({ level, progress, description }: LevelCardProps) {
  return (
    <div className={`bg-gradient-to-br from-primary-card-start to-primary-card-end rounded-xl p-4 text-white h-48 flex flex-col justify-between items-start flex-shrink-0 transform transition-transform duration-200 hover:scale-105 cursor-pointer`}>
      <div className="flex justify-between items-center mb-2 w-full">
        <h3>{level}</h3>
        <h4>{progress}</h4>
      </div>
      {description && (
        <p className="opacity-90 flex-grow overflow-hidden text-ellipsis text-left w-full">
          {description}
        </p>
      )}
    </div>
  );
} 