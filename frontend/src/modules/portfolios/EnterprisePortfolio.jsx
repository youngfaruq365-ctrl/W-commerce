/**
 * EnterprisePortfolio — Enterprise-tier seller portfolio.
 * Extends PremiumPortfolio with an "ENTERPRISE" badge.
 * When a dedicated Enterprise design is built, replace this stub.
 */
import React from 'react';
import PremiumPortfolio from './PremiumPortfolio';

export default function EnterprisePortfolio(props) {
  return <PremiumPortfolio {...props} tierBadge="ENTERPRISE" />;
}
