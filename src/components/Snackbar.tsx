import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SnackbarProps {
  message: string;
  type: 'success' | 'error';
  duration?: number; // Duration in milliseconds, defaults to 3000
  onClose: () => void;
}

const Snackbar: React.FC<SnackbarProps> = ({ message, type, duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration]);

  const handleAnimationComplete = () => {
    if (!isVisible) {
      onClose();
    }
  };

  const backgroundColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <AnimatePresence onExitComplete={handleAnimationComplete}>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={`fixed bottom-4 right-4 p-3 rounded-lg shadow-lg text-white font-semibold text-center z-50 ${backgroundColor}`}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Snackbar; 