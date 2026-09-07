import React from 'react';
import { renderToString } from 'react-dom/server';
import { ExperienceRenderer } from './src/engines/universal/ExperienceRenderer.jsx';

const storeDnaDraftStr = '{"version":1,"generatorVersion":"1.0.0","industry":"beauty","niche":"fragrance","personality":"elegant","visual":{"colorSystem":"obsidian","typography":"serif-elegant","shapeLanguage":"pill"},"layout":{"homepage":"HeroFullscreen","header":"NavMinimal","productGrid":"GridStandard","productCard":"standard"},"features":{"megaMenu":true,"quickView":false,"aiConcierge":true,"newsletterPopup":true},"motion":{"profile":"cinematic"},"commerce":{"cart":"SideDrawer","checkout":"step"}}';

const store = {
  id: "some-uuid",
  sellerId: "some-uuid",
  storeName: "My New Store",
  country: "Global",
  storeDnaDraft: storeDnaDraftStr
};

try {
  const html = renderToString(<ExperienceRenderer store={store} previewMode={true} />);
  console.log("RENDER SUCCESS", html.substring(0, 50));
} catch (e) {
  console.error("CRASH", e);
}
