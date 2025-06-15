import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  levelId: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, levelId }) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(`/level/${levelId}`);
  };

  return (
    <div className="w-full bg-white shadow-sm p-4 flex items-center justify-between z-10">
      <button onClick={handleBackClick} className="text-gray-600 hover:text-gray-900 focus:outline-none">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h2 className="text-xl font-semibold text-gray-800">{title} - Level {levelId}</h2>
      <div className="w-6"></div> {/* Spacer to balance the back button */}
    </div>
  );
};

export default PageHeader; 