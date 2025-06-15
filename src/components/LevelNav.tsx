import React from 'react'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

interface LevelNavProps {
  title: string;
  levelId: string;
  showResetButton?: boolean;
  onReset?: () => void;
  extraContent?: React.ReactNode;
}

export default function LevelNav({ title, levelId, showResetButton = false, onReset, extraContent }: LevelNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBackClick = () => {
    // If we're in a practice section (flashcards, writing, listening), go back to level details
    if (location.pathname.includes('/flashcards') || 
        location.pathname.includes('/writing') || 
        location.pathname.includes('/listening')) {
      navigate(`/level/${levelId}`);
    } else {
      // Otherwise go to dashboard
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex items-center justify-between px-6 mb-6 w-full">
      <div className="flex items-center gap-4">
        <button 
          onClick={handleBackClick} 
          className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {extraContent}
        {showResetButton && onReset ? (
          <button 
            onClick={onReset} 
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        ) : (
          <div className="w-10"></div> // Spacer to balance the back button
        )}
      </div>
    </div>
  );
} 