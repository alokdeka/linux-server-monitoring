import React from 'react';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  count?: number;
  variant?: 'text' | 'rectangular' | 'circular';
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
  className = '',
  count = 1,
  variant = 'rectangular',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return {
          height: '1rem',
          borderRadius: '4px',
        };
      case 'circular':
        return {
          borderRadius: '50%',
        };
      case 'rectangular':
      default:
        return {};
    }
  };

  const skeletonStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius:
      typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
    ...getVariantStyles(),
  };

  if (count === 1) {
    return (
      <div
        className={`skeleton-loader ${className}`}
        style={skeletonStyle}
        aria-label="Loading content"
      />
    );
  }

  return (
    <div className={`skeleton-group ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="skeleton-loader"
          style={skeletonStyle}
          aria-label="Loading content"
        />
      ))}
    </div>
  );
};

export default SkeletonLoader;
