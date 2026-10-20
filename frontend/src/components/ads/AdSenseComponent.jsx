import React, { useEffect, useRef } from 'react';

/**
 * Renders a Google AdSense ad unit.
 * Example usage: <AdSenseComponent adSlot="1234567890" style={{ display: 'block' }} format="auto" />
 */
const AdSenseComponent = ({
  adClient = 'ca-pub-XXXXXXXXXXXX', // Replace with real Publisher ID in production
  adSlot,
  style = { display: 'block' },
  format = 'auto',
  responsive = 'true',
}) => {
  const adRef = useRef(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !isLoaded.current) {
        // Push the ad to the adsbygoogle array
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isLoaded.current = true;
      }
    } catch (e) {
      console.error('AdSense error', e);
    }
  }, []);

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={style}
      data-ad-client={adClient}
      data-ad-slot={adSlot}
      data-ad-format={format}
      data-full-width-responsive={responsive}
    />
  );
};

export default AdSenseComponent;
