import React from 'react';

const ThreeDObject = ({ type, color, size = '120px' }) => {
  // Simple CSS 3D fallback for the primitives if no 3D library is present.
  let shapeClass = "w-full h-full transform preserve-3d animate-spin-slow shadow-2xl";
  
  return (
    <div className="relative mx-auto my-6 perspective-1000" style={{ width: size, height: size }}>
      <div 
        className={shapeClass}
        style={{ 
          backgroundColor: color || '#D8B45A',
          borderRadius: type === 'sphere' ? '50%' : '1rem',
          transform: 'rotateX(20deg) rotateY(45deg)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent mix-blend-overlay rounded-inherit" />
      </div>
    </div>
  );
};

export default ThreeDObject;
