/**
 * ProPortfolio — Pro-tier seller portfolio.
 * Extends PremiumPortfolio with a "PRO" badge.
 * When a dedicated Pro design is built, replace this stub.
 */
import React from 'react';
import PremiumPortfolio from './PremiumPortfolio';

export default function ProPortfolio(props) {
  return <PremiumPortfolio {...props} tierBadge="PRO" />;
}
