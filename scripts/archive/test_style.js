const { generateStyleProfile } = require('./src/engines/universal/styles/ExperienceStyleGenerator.js');

const storeDnaDraftStr = '{"version":1,"generatorVersion":"1.0.0","industry":"beauty","niche":"fragrance","personality":"elegant","visual":{"colorSystem":"obsidian","typography":"serif-elegant","shapeLanguage":"pill"},"layout":{"homepage":"HeroFullscreen","header":"NavMinimal","productGrid":"GridStandard","productCard":"standard"},"features":{"megaMenu":true,"quickView":false,"aiConcierge":true,"newsletterPopup":true},"motion":{"profile":"cinematic"},"commerce":{"cart":"SideDrawer","checkout":"step"}}';

const store = {
  id: "some-uuid",
  sellerId: "some-uuid",
  storeName: "My New Store",
  country: "Global",
  storeDnaDraft: storeDnaDraftStr
};

try {
  console.log("Generating profile...");
  const profile = generateStyleProfile(store, true);
  console.log("Profile generated successfully!", Object.keys(profile));
} catch (e) {
  console.error("Crash!", e);
}
