"use client";

import React from 'react';

const FloatingBackground: React.FC = () => {
  return (
    <div className="floating-rockets">
      {/* Floating Rockets */}
      <div className="floating-rocket">🚀</div>
      <div className="floating-rocket">🚀</div>
      <div className="floating-rocket">🚀</div>
      <div className="floating-rocket">🚀</div>
      
      {/* Floating Candles */}
      <div className="floating-candle">🕯️</div>
      <div className="floating-candle">🕯️</div>
      <div className="floating-candle">🕯️</div>
      <div className="floating-candle">🕯️</div>
    </div>
  );
};

export default FloatingBackground;