import React from 'react';
import SkeletonLoader from './SkeletonLoader';
import './ServerCardSkeleton.css';

interface ServerCardSkeletonProps {
  count?: number;
}

const ServerCardSkeleton: React.FC<ServerCardSkeletonProps> = ({
  count = 1,
}) => {
  const renderSkeleton = () => (
    <div className="server-card-skeleton">
      <div className="skeleton-header">
        <SkeletonLoader width="60%" height="1.25rem" />
        <SkeletonLoader width="2rem" height="2rem" variant="circular" />
      </div>

      <div className="skeleton-metrics">
        <div className="skeleton-metric">
          <SkeletonLoader width="3rem" height="0.875rem" />
          <SkeletonLoader width="100%" height="0.5rem" borderRadius="2px" />
          <SkeletonLoader width="2rem" height="0.75rem" />
        </div>
        <div className="skeleton-metric">
          <SkeletonLoader width="3.5rem" height="0.875rem" />
          <SkeletonLoader width="100%" height="0.5rem" borderRadius="2px" />
          <SkeletonLoader width="2rem" height="0.75rem" />
        </div>
        <div className="skeleton-metric">
          <SkeletonLoader width="2.5rem" height="0.875rem" />
          <SkeletonLoader width="100%" height="0.5rem" borderRadius="2px" />
          <SkeletonLoader width="2rem" height="0.75rem" />
        </div>
      </div>

      <div className="skeleton-footer">
        <SkeletonLoader width="40%" height="0.75rem" />
        <SkeletonLoader width="30%" height="0.75rem" />
      </div>
    </div>
  );

  if (count === 1) {
    return renderSkeleton();
  }

  return (
    <div className="server-cards-skeleton-grid">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>{renderSkeleton()}</div>
      ))}
    </div>
  );
};

export default ServerCardSkeleton;
