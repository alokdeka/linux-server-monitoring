import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
  label?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color,
  className = '',
  label = 'Loading...',
}) => {
  return (
    <div
      className={`loading-spinner ${size} ${className}`}
      role="status"
      aria-label={label}
    >
      <div
        className="spinner"
        style={color ? { borderTopColor: color } : undefined}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default LoadingSpinner;
