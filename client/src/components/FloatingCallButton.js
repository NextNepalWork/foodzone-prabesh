import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FloatingCallButton = () => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    navigate('/call');
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 ${
        isHovered
          ? 'bg-blue-600 pr-5'
          : 'bg-blue-500'
      }`}
      style={{
        background: isHovered
          ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      }}
    >
      <span className="text-lg">📞</span>
      <span className={`transition-all duration-300 overflow-hidden ${isHovered ? 'w-auto' : 'w-0'}`}>
        Call Waiter
      </span>
    </button>
  );
};

export default FloatingCallButton;
