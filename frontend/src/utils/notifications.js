export const showNotification = (message, type = 'success') => {
  // Create container if it doesn't exist
  let container = document.getElementById('global-notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'global-notification-container';
    container.style.position = 'fixed';
    container.style.top = '32px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }

  // Create toast
  const toast = document.createElement('div');
  const isError = type === 'error';
  
  toast.className = `flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border backdrop-blur-md transition-all duration-500 animate-in fade-in slide-in-from-top-4 ${
    isError ? 'bg-gray-400 950/80 border-gray-400 900 text-gray-700 200' : 'bg-gray-400 950/80 border-gray-400 900 text-gray-700 200'
  }`;
  
  toast.innerHTML = `
    <div class="p-2 rounded-full ${isError ? 'bg-gray-400 900/50' : 'bg-gray-400 900/50'}"> ${isError 
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-700 400"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' 
        : '<div class="w-4 h-4 rounded-full border-2 border-gray-400 400 flex items-center justify-center"><div class="w-1.5 h-1.5 bg-gray-400 400 rounded-full"></div></div>'}
    </div>
    <p class="font-medium tracking-wide m-0"> ${message}</p>
  `;

  container.appendChild(toast);

  // Animate out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    }, 500);
  }, 3000);
};
