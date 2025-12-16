import React, { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAlertHistory } from '../../store/slices/alertsSlice';
import type { Alert } from '../../types';
import type { AlertFilters } from '../../services/api';
import './AlertHistory.css';

interface AlertHistoryProps {
  onAlertClick?: (alert: Alert) => void;
  initialFilters?: Partial<AlertFilters>;
}

const AlertHistory: React.FC<AlertHistoryProps> = ({
  onAlertClick,
  initialFilters = {},
}) => {
  const dispatch = useAppDispatch();
  const {
    history: alerts,
    loading,
    error,
  } = useAppSelector((state) => state.alerts);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter state
  const [filters, setFilters] = useState<AlertFilters>({
    serverId: initialFilters.serverId || '',
    severity: initialFilters.severity || undefined,
    startDate: initialFilters.startDate || '',
    endDate: initialFilters.endDate || '',
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(fetchAlertHistory(filters));
  }, [dispatch, filters]);

  // Filter and search alerts
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (alert) =>
          alert.message.toLowerCase().includes(term) ||
          alert.serverId.toLowerCase().includes(term) ||
          alert.type.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [alerts, searchTerm]);

  // Paginate alerts
  const paginatedAlerts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAlerts.slice(startIndex, endIndex);
  }, [filteredAlerts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);

  const handleFilterChange = (key: keyof AlertFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({
      serverId: '',
      severity: undefined,
      startDate: '',
      endDate: '',
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getAlertTypeIcon = (type: Alert['type']) => {
    switch (type) {
      case 'cpu':
        return '🔥';
      case 'memory':
        return '💾';
      case 'disk':
        return '💿';
      case 'offline':
        return '🔌';
      default:
        return '📊';
    }
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (triggeredAt: string, resolvedAt?: string) => {
    if (!resolvedAt) return 'Ongoing';

    const start = new Date(triggeredAt);
    const end = new Date(resolvedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h ${diffMinutes % 60}m`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${diffHours % 24}h`;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    pages.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="pagination-button"
      >
        ‹
      </button>
    );

    // First page
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="pagination-button"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="ellipsis1" className="pagination-ellipsis">
            ...
          </span>
        );
      }
    }

    // Visible pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`pagination-button ${i === currentPage ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="ellipsis2" className="pagination-ellipsis">
            ...
          </span>
        );
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="pagination-button"
        >
          {totalPages}
        </button>
      );
    }

    // Next button
    pages.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="pagination-button"
      >
        ›
      </button>
    );

    return <div className="pagination">{pages}</div>;
  };

  return (
    <div className="alert-history">
      <div className="alert-history-header">
        <h3>Alert History</h3>
        <div className="alert-count">
          {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="alert-filters">
        <div className="filter-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <select
            value={filters.severity || ''}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
            className="filter-select"
          >
            <option value="">All Severities</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>

          <input
            type="text"
            placeholder="Server ID"
            value={filters.serverId || ''}
            onChange={(e) => handleFilterChange('serverId', e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-row">
          <div className="date-filters">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="date-input"
              title="Start date"
            />
            <span className="date-separator">to</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="date-input"
              title="End date"
            />
          </div>

          <button onClick={handleClearFilters} className="clear-filters-button">
            Clear Filters
          </button>
        </div>
      </div>

      {loading && alerts.length === 0 ? (
        <div className="loading-state">
          <div className="loading-spinner">Loading alert history...</div>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>Failed to load alert history: {error}</p>
          <button
            onClick={() => dispatch(fetchAlertHistory(filters))}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>No alerts found</p>
          <span className="empty-subtitle">
            Try adjusting your filters or search terms
          </span>
        </div>
      ) : (
        <>
          <div className="alert-table">
            <div className="table-header">
              <div className="header-cell icon-cell">Type</div>
              <div className="header-cell severity-cell">Severity</div>
              <div className="header-cell message-cell">Message</div>
              <div className="header-cell server-cell">Server</div>
              <div className="header-cell time-cell">Triggered</div>
              <div className="header-cell duration-cell">Duration</div>
              <div className="header-cell status-cell">Status</div>
            </div>

            <div className="table-body">
              {paginatedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`table-row ${alert.severity} ${
                    alert.resolvedAt ? 'resolved' : 'active'
                  }`}
                  onClick={() => onAlertClick?.(alert)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onAlertClick?.(alert);
                    }
                  }}
                >
                  <div className="table-cell icon-cell">
                    <div className="alert-icons">
                      <span className="type-icon">
                        {getAlertTypeIcon(alert.type)}
                      </span>
                    </div>
                  </div>
                  <div className="table-cell severity-cell">
                    <div className={`severity-badge ${alert.severity}`}>
                      <span className="severity-icon">
                        {getSeverityIcon(alert.severity)}
                      </span>
                      {alert.severity}
                    </div>
                  </div>
                  <div className="table-cell message-cell">
                    <div className="message-text">{alert.message}</div>
                  </div>
                  <div className="table-cell server-cell">{alert.serverId}</div>
                  <div className="table-cell time-cell">
                    {formatDateTime(alert.triggeredAt)}
                  </div>
                  <div className="table-cell duration-cell">
                    {formatDuration(alert.triggeredAt, alert.resolvedAt)}
                  </div>
                  <div className="table-cell status-cell">
                    <span
                      className={`status-badge ${
                        alert.resolvedAt ? 'resolved' : 'active'
                      }`}
                    >
                      {alert.resolvedAt ? 'Resolved' : 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-footer">
            <div className="items-per-page">
              <label>
                Show:
                <select
                  value={itemsPerPage}
                  onChange={(e) =>
                    handleItemsPerPageChange(Number(e.target.value))
                  }
                  className="items-select"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                per page
              </label>
            </div>

            {renderPagination()}

            <div className="page-info">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredAlerts.length)} of{' '}
              {filteredAlerts.length} alerts
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AlertHistory;
