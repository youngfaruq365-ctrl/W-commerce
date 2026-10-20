/**
 * UltraPortfolio — Ultra-tier seller portfolio.
 * Extends PremiumPortfolio with an "ULTRA" badge.
 * When a dedicated Ultra design is built, replace this stub.
 */
import React from 'react';
import PremiumPortfolio from './PremiumPortfolio';

export default function UltraPortfolio(props) {
  return <PremiumPortfolio {...props} tierBadge="ULTRA" />;
}
