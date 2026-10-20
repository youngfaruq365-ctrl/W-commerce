import React from 'react';

const SystemStoriesPage = () => {
  return (
    <div className="w-full h-[calc(100vh-64px)] overflow-hidden bg-white">
      <iframe 
        src="/system-stories.html"
        className="w-full h-full border-none"
        title="GLOBALX Multi-Store Layout Engine"
      />
    </div>
  );
};

export default SystemStoriesPage;
