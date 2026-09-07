import React from 'react';
import { IconRegistry } from './IconRegistry';
import { AlertCircle } from 'lucide-react';

export const WIcon = ({ name, size = 24, className = '', ...props }) => {
  const IconComponent = IconRegistry[name];

  if (!IconComponent) {
    console.warn(`WIcon: Icon "${name}" not found in IconRegistry.`);
    return <AlertCircle size={size} className={`text-red-500 ${className}`} {...props} />;
  }

  return <IconComponent size={size} className={className} {...props} />;
};

export default WIcon;
