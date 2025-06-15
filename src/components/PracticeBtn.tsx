import React from 'react'
import { Link } from 'react-router-dom'
import { WalletCards, Pencil, Headphones, List } from 'lucide-react'


interface PracticeBtnProps {
  level: string;
  text: string;
  icon?: string;
}

export default function PracticeBtn({ level, text, icon }: PracticeBtnProps) {
  const getIconComponent = () => {
    switch (icon) {
      case 'WalletCards':
        return <WalletCards className="mr-4 text-primary" size={24} />;
      case 'Pencil':
        return <Pencil className="mr-4 text-primary" size={24} />;
      case 'Headphones':
        return <Headphones className="mr-4 text-primary" size={24} />;
      case 'List':
        return <List className="mr-4 text-primary" size={24} />;
      default:
        return null;
    }
  };

  const getNavigationPath = () => {
    switch (icon) {
      case 'WalletCards':
        return `/level/${level}/flashcards`;
      case 'Pencil':
        return `/level/${level}/writing`;
      case 'Headphones':
        return `/level/${level}/listening`;
      case 'List':
        return `/level/${level}/words`;
      default:
        return `/level/${level}`;
    }
  };

  return (
    <Link to={getNavigationPath()} className="flex items-center bg-white p-4 rounded-lg text-text">
        {getIconComponent()}
        <span className="text-lg font-medium">{text}</span>
    </Link>
  );
} 