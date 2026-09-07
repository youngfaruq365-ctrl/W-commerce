import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ShieldCheck, Gift, Tag, Zap, Award, ShoppingBag, Clock, Heart, Trash } from 'lucide-react';
import toast from 'react-hot-toast';
import PopupShell from './primitives/PopupShell';
import PopupHeader from './primitives/PopupHeader';
import PopupHero from './primitives/PopupHero';
import PopupOffer from './primitives/PopupOffer';
import PopupImage from './primitives/PopupImage';
import PopupBadge from './primitives/PopupBadge';
import PopupCountdown from './primitives/PopupCountdown';
import PopupProductGrid from './primitives/PopupProductGrid';
import PopupSellerBrand from './primitives/PopupSellerBrand';
import PopupCTA from './primitives/PopupCTA';
import PopupFooter from './primitives/PopupFooter';
import ConfettiEngine from './primitives/ConfettiEngine';
import ThreeDObject from './primitives/ThreeDObject';

const iconMap = {
  Star, ShieldCheck, Gift, Tag, Zap, Award, ShoppingBag, Clock, Heart, Trash
};

const TemplateRenderer = ({ templateDNA, onClose, isPreview = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isPreview) {
      setIsVisible(true);
      return;
    }
    
    const delay = templateDNA.behavior?.delay || 0;
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [isPreview, templateDNA]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  const handleAction = () => {
    const action = templateDNA.cta?.action;
    if (action === 'SELLER_PROFILE') {
      navigate('/seller/profile');
    } else if (action === 'CHECKOUT') {
      navigate('/checkout');
    } else if (action === 'COLLECTION') {
      navigate('/collection');
    } else {
      toast.success(`Action "${action || 'Unknown'}" triggered successfully!`);
    }
    handleClose();
  };

  if (!templateDNA) return null;

  // Animation variants
  const getVariants = () => {
    const preset = templateDNA.motion?.preset || 'fade';
    switch (preset) {
      case 'spring-celebration':
        return { hidden: { opacity: 0, scale: 0.5, y: 100 }, visible: { opacity: 1, scale: 1, y: 0 } };
      case 'glitch':
        return { hidden: { opacity: 0, scale: 1.1, skewX: 10 }, visible: { opacity: 1, scale: 1, skewX: 0 } };
      case 'slide-up':
        return { hidden: { opacity: 0, y: 150 }, visible: { opacity: 1, y: 0 } };
      case 'slide-side':
        return { hidden: { opacity: 0, x: 200 }, visible: { opacity: 1, x: 0 } };
      default:
        return { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } };
    }
  };

  const variants = getVariants();
  const duration = templateDNA.motion?.duration || 0.6;
  const theme = templateDNA.theme || {};
  const layout = templateDNA.layout || {};
  
  const IconComponent = templateDNA.content?.icon && iconMap[templateDNA.content.icon] 
    ? iconMap[templateDNA.content.icon] 
    : null;

  return (
    <PopupShell 
      isVisible={isVisible} 
      onClose={handleClose} 
      variants={variants} 
      duration={duration} 
      theme={theme}
      shape={layout.shape}
      position={layout.position}
      width={layout.width}
    >
      {/* Background Media */}
      {templateDNA.media?.backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none" 
          style={{ backgroundImage: `url(${templateDNA.media.backgroundImage})` }} 
        />
      )}

      {/* Floating Badge */}
      {templateDNA.content?.badge && (
        <PopupBadge text={templateDNA.content.badge} theme={theme} />
      )}

      {/* Optional Split Image or Top Image */}
      {templateDNA.media?.heroImage && (
        <PopupImage src={templateDNA.media.heroImage} shape={layout.imageShape || 'rectangle'} />
      )}

      {/* Content Container */}
      <div className={`relative z-10 ${layout.imageShape?.includes('split') ? (layout.imageShape === 'split-left' ? 'ml-[50%] w-1/2' : 'w-1/2') : ''}`}>
        
        {/* Header */}
        {templateDNA.content?.header && (
          <PopupHeader 
            title={templateDNA.content.header} 
            icon={IconComponent} 
            iconColor={theme.accent}
            theme={theme} 
            onClose={handleClose} 
          />
        )}

        {/* 3D Object */}
        {templateDNA.effects?.threeD && (
          <ThreeDObject type="cube" color={theme.accent} size="100px" />
        )}

        {/* Brand / Logo */}
        {templateDNA.branding?.showLogo && (
          <div className="mt-6">
            <PopupSellerBrand 
              showLogo={templateDNA.branding.showLogo}
              showName={templateDNA.branding.showSellerName}
              showVerified={templateDNA.branding.showVerifiedBadge}
              sellerName="Premium Seller"
              theme={theme}
            />
          </div>
        )}

        {/* Hero Content */}
        <PopupHero 
          title={templateDNA.content?.title} 
          subtitle={templateDNA.content?.subtitle} 
          icon={!templateDNA.content?.header ? IconComponent : null}
          theme={theme} 
          style={layout.textAlign}
        />

        {/* Offer / Discount */}
        {templateDNA.offer && (
          <PopupOffer {...templateDNA.offer} theme={theme} />
        )}

        {/* Countdown */}
        {templateDNA.content?.showCountdown && (
          <PopupCountdown theme={theme} />
        )}

        {/* Products Grid */}
        {templateDNA.products?.show && (
          <PopupProductGrid title={templateDNA.products.title} theme={theme} />
        )}

        {/* CTA */}
        {templateDNA.cta && (
          <PopupCTA 
            label={templateDNA.cta.label} 
            action={templateDNA.cta.action} 
            theme={theme}
            onClick={handleAction}
          />
        )}

        {/* Footer */}
        {templateDNA.content?.footerText && (
          <PopupFooter 
            text={templateDNA.content.footerText} 
            theme={theme} 
          />
        )}
      </div>

      {/* Effects */}
      <ConfettiEngine enabled={templateDNA.effects?.confetti} />

    </PopupShell>
  );
};

export default TemplateRenderer;
