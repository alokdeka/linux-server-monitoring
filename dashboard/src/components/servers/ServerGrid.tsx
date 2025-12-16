import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchServers } from '../../store/slices/serversSlice';
import ServerCard from './ServerCard';
import type { Server } from '../../types';
import {
  LoadingSpinner,
  ErrorState,
  ServerCardSkeleton,
  RetryButton,
  useToast,
} from '../common';
import './ServerGrid.css';

interface ServerGridProps {
  onServerClick?: (server: Server) => void;
  className?: string;
}

const ServerGrid: React.FC<ServerGridProps> = ({
  onServerClick,
  className,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { showToast } = useToast();
  const {
    list: servers,
    loading,
    error,
  } = useSelector((state: RootState) => state.servers);

  useEffect(() => {
    // Only fetch servers if we don't have any and we're not already loading
    if (servers.length === 0 && !loading && !error) {
      dispatch(fetchServers());
    }
  }, [dispatch, servers.length, loading, error]);

  const handleRetryFetch = async () => {
    try {
      await dispatch(fetchServers()).unwrap();
      showToast(
        'success',
        'Servers Loaded',
        'Successfully refreshed server list.'
      );
    } catch (error) {
      showToast(
        'error',
        'Fetch Failed',
        'Failed to load servers. Please try again.'
      );
    }
  };

  const renderLoadingState = () => (
    <div className="server-grid-loading">
      <ServerCardSkeleton count={6} />
    </div>
  );

  const renderErrorState = () => (
    <ErrorState
      title="Failed to load servers"
      message="Unable to fetch server information. Please check your connection and try again."
      error={error}
      onRetry={handleRetryFetch}
      className="server-grid-error"
    />
  );

  const renderEmptyState = () => (
    <div className="server-grid-empty">
      <div className="empty-icon">🖥️</div>
      <h3>No servers registered</h3>
      <p>
        Get started by registering your first server. You'll need to install the
        monitoring agent on your server and configure it with an API key.
      </p>
      <div className="empty-actions">
        <button
          className="primary-button"
          onClick={() => {
            // Navigate to server management page
            window.location.href = '/management';
          }}
        >
          Register Server
        </button>
        <RetryButton onRetry={handleRetryFetch} className="secondary-button">
          Refresh
        </RetryButton>
      </div>
    </div>
  );

  const renderServerGrid = () => (
    <div className="servers-grid">
      {servers.map((server) => (
        <ServerCard key={server.id} server={server} onClick={onServerClick} />
      ))}
    </div>
  );

  const gridClassName = `server-grid ${className || ''}`.trim();

  return (
    <div className={gridClassName}>
      {loading && renderLoadingState()}
      {error && !loading && renderErrorState()}
      {!loading &&
        !error &&
        (!servers || servers.length === 0) &&
        renderEmptyState()}
      {!loading &&
        !error &&
        servers &&
        servers.length > 0 &&
        renderServerGrid()}
    </div>
  );
};

export default ServerGrid;
