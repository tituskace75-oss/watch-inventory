
import React from 'react';
import { IconType } from 'react-icons';

interface IconProps extends React.SVGAttributes<SVGElement> {
  icon: IconType;
  size?: number | string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ icon: IconComponent, size = 20, className = '', ...props }) => {
  return <IconComponent size={size} className={className} {...props} />;
};
