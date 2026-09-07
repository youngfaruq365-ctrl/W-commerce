export const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || window.location.origin}`}${url}`;
};
