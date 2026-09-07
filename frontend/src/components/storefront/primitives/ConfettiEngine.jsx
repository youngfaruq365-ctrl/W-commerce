import React, { useEffect, useState } from 'react';

const ConfettiEngine = ({ enabled }) => {
  if (!enabled) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-inherit">
      {/* Fallback CSS Confetti since we don't have canvas-confetti readily available */}
      <div className="absolute top-0 left-1/4 w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
      <div className="absolute top-10 right-1/4 w-3 h-3 bg-yellow-400 rotate-45 animate-pulse"></div>
      <div className="absolute top-20 left-1/2 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
      <div className="absolute bottom-1/4 left-1/3 w-3 h-3 bg-green-400 rounded-sm rotate-12 animate-bounce"></div>
      <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
    </div>
  );
};

export default ConfettiEngine;
