import React from 'react'
import { ChevronLeft, RefreshCw, Volume2 } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

interface ListenBtnProps {
  handleListen: () => void;
}

export default function ListenBtn({ handleListen }: ListenBtnProps) {
  return (
    <div className="flex justify-center mb-8 px-6">
      <button 
        onClick={handleListen} 
        className="flex items-center bg-primary/10 text-primary rounded-full px-4 py-2 font-semibold hover:bg-primary/20 transition-colors duration-200"
      >
        <Volume2 size={20} className="mr-2" />
        Listen
      </button>
    </div>
  );
} 