"use client";

import React from 'react';

interface SomniaLogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  animate?: boolean;
}

const SomniaLogo: React.FC<SomniaLogoProps> = ({ className = '', size = 'medium', animate = true }) => {
  const sizeClasses = {
    small: 'w-12 h-12 text-lg',
    medium: 'w-20 h-20 text-2xl', 
    large: 'w-28 h-28 text-3xl'
  };

  return (
    <div
      className={`
        somnia-logo
        ${sizeClasses[size]}
        rounded-2xl
        bg-gradient-to-br from-indigo-600 to-purple-700
        flex items-center justify-center
        font-extrabold
        shadow-lg shadow-indigo-500/30
        ${animate ? 'animate-float' : ''}
        relative
        text-white
        ${className}
      `}
    >
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 opacity-100 ${animate ? 'animate-spin-slow' : ''} -z-10`}></div>
      S
    </div>
  );
};

export default SomniaLogo;