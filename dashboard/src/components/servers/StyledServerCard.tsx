import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { css } from 'styled-components';
import type { Server } from '../../types';
import { Card, Flex, Text, StatusBadge, media } from '../../styles/styled';

const ServerCardContainer = styled(Card)<{ status: Server['status'] }>`
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  position: relative;
  overflow: hidden;
  border-left: 4px solid
    ${({ theme, status }) => {
      switch (status) {
        case 'online':
          return theme.colors.status.online;
        case 'warning':
          return theme.colors.status.warning;
        case 'offline':
          return theme.colors.status.offline;
        default:
          return theme.colors.border.primary;
      }
    }};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
    border-left-width: 6px;
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.border.focus};
    outline-offset: 2px;
  }

  &:active {
    transform: translateY(-1px);
  }

  ${media.maxMd(css`
    padding: ${({ theme }) => theme.spacing[4]};
  `)}
`;

const ServerHeader = styled(Flex)`
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const ServerTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const ServerIP = styled(Text)`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};

  ${media.sm(css`
    grid-template-columns: repeat(4, 1fr);
  `)}

  ${media.maxMd(css`
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing[1]};
  `)}
`;

const MetricItem = styled.div<{
  type?: 'cpu' | 'memory' | 'disk' | 'uptime' | 'offline';
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[2]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  transition: all ${({ theme }) => theme.transitions.fast};

  ${({ type, theme }) => {
    switch (type) {
      case 'cpu':
        return css`
          border-left: 3px solid ${theme.colors.primary[500]};
        `;
      case 'memory':
        return css`
          border-left: 3px solid ${theme.colors.secondary[500]};
        `;
      case 'disk':
        return css`
          border-left: 3px solid ${theme.colors.warning[500]};
        `;
      case 'uptime':
        return css`
          border-left: 3px solid ${theme.colors.success[500]};
        `;
      case 'offline':
        return css`
          border-left: 3px solid ${theme.colors.error[500]};
          background-color: ${theme.colors.error[50]};
        `;
      default:
        return '';
    }
  }}

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.tertiary};
    transform: translateY(-1px);
  }

  ${media.maxMd(css`
    flex-direction: row;
    justify-content: space-between;
    padding: ${({ theme }) => theme.spacing[2]}
      ${({ theme }) => theme.spacing[3]};
  `)}
`;

const MetricLabel = styled(Text)`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  margin-bottom: ${({ theme }) => theme.spacing[1]};

  ${media.maxMd(css`
    margin-bottom: 0;
  `)}
`;

const MetricValue = styled(Text)<{ warning?: boolean; critical?: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};

  ${({ warning, theme }) =>
    warning &&
    css`
      color: ${theme.colors.warning[600]};
    `}

  ${({ critical, theme }) =>
    critical &&
    css`
      color: ${theme.colors.error[600]};
    `}
`;

const OfflineMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.error[50]};
  border: 1px solid ${({ theme }) => theme.colors.error[200]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const LoadingMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid ${({ theme }) => theme.colors.border.primary};
  border-top: 2px solid ${({ theme }) => theme.colors.primary[500]};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: ${({ theme }) => theme.spacing[2]};
`;

interface StyledServerCardProps {
  server: Server;
  onClick?: (server: Server) => void;
}

const StyledServerCard: React.FC<StyledServerCardProps> = ({
  server,
  onClick,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(server);
    } else {
      navigate(`/servers/${server.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const formatUptime = (uptime: number): string => {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatLastSeen = (lastSeen: string): string => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const getStatusBadgeStatus = (
    status: Server['status']
  ): 'online' | 'offline' | 'warning' | 'critical' => {
    switch (status) {
      case 'online':
        return 'online';
      case 'warning':
        return 'warning';
      case 'offline':
        return 'offline';
      default:
        return 'offline';
    }
  };

  const renderMetrics = () => {
    if (server.status === 'offline') {
      return (
        <OfflineMessage>
          <MetricItem type="offline">
            <MetricLabel color="muted">Status</MetricLabel>
            <MetricValue critical>Offline</MetricValue>
          </MetricItem>
          <Text size="sm" color="muted" style={{ marginTop: '8px' }}>
            Last seen: {formatLastSeen(server.lastSeen)}
          </Text>
        </OfflineMessage>
      );
    }

    if (!server.currentMetrics) {
      return (
        <LoadingMessage>
          <LoadingSpinner />
          <Text color="muted">Loading metrics...</Text>
        </LoadingMessage>
      );
    }

    const { cpuUsage, memory, diskUsage, uptime } = server.currentMetrics;
    const primaryDisk =
      diskUsage.find((disk) => disk.mountpoint === '/') || diskUsage[0];

    return (
      <MetricsGrid>
        <MetricItem type="cpu">
          <MetricLabel color="muted">CPU</MetricLabel>
          <MetricValue warning={cpuUsage > 70} critical={cpuUsage > 90}>
            {Math.round(cpuUsage)}%
          </MetricValue>
        </MetricItem>

        <MetricItem type="memory">
          <MetricLabel color="muted">RAM</MetricLabel>
          <MetricValue
            warning={memory.percentage > 70}
            critical={memory.percentage > 90}
          >
            {Math.round(memory.percentage)}%
          </MetricValue>
        </MetricItem>

        {primaryDisk && (
          <MetricItem type="disk">
            <MetricLabel color="muted">Disk</MetricLabel>
            <MetricValue
              warning={primaryDisk.percentage > 80}
              critical={primaryDisk.percentage > 95}
            >
              {Math.round(primaryDisk.percentage)}%
            </MetricValue>
          </MetricItem>
        )}

        <MetricItem type="uptime">
          <MetricLabel color="muted">Uptime</MetricLabel>
          <MetricValue>{formatUptime(uptime)}</MetricValue>
        </MetricItem>
      </MetricsGrid>
    );
  };

  return (
    <ServerCardContainer
      status={server.status}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for server ${server.hostname}`}
      hover
    >
      <ServerHeader justify="between" align="center">
        <div>
          <ServerTitle>{server.hostname}</ServerTitle>
          <ServerIP color="muted">{server.ipAddress}</ServerIP>
        </div>
        <StatusBadge status={getStatusBadgeStatus(server.status)} size="sm">
          {server.status}
        </StatusBadge>
      </ServerHeader>

      {renderMetrics()}
    </ServerCardContainer>
  );
};

export default StyledServerCard;
