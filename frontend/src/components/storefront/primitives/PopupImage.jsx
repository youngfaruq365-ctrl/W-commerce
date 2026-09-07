import React from 'react';

const PopupImage = ({ src, alt, shape = 'rectangle', height = 'h-48' }) => {
  if (!src) return null;
  
  let shapeClasses = 'rounded-t-2xl w-full';
  if (shape === 'circle') shapeClasses = 'rounded-full aspect-square w-32 h-32 mx-auto my-4 object-cover border-4 border-white/10';
  if (shape === 'split-left') shapeClasses = 'absolute left-0 top-0 bottom-0 w-1/2 object-cover rounded-l-2xl h-full';
  if (shape === 'split-right') shapeClasses = 'absolute right-0 top-0 bottom-0 w-1/2 object-cover rounded-r-2xl h-full';

  return (
    <div className={shape.includes('split') ? '' : height}>
      <img src={src} alt={alt || 'Popup media'} className={`${shapeClasses} ${!shape.includes('split') && !shape.includes('circle') ? 'h-full object-cover' : ''}`} />
    </div>
  );
};

export default PopupImage;
