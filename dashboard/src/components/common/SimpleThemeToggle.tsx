import React, { useState, useEffect } from 'react';

interface SimpleThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export const SimpleThemeToggle: React.FC<SimpleThemeToggleProps> = ({
  showLabel = false,
  className,
}) => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;

    const saved = localStorage.getItem('dashboard-theme');
    if (saved) return saved === 'dark';

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  });

  // Initialize theme on component mount
  useEffect(() => {
    // Set initial theme immediately on mount
    const root = document.documentElement;
    if (isDark) {
      // Dark theme
      root.style.setProperty('--bg-primary', '#0f1419');
      root.style.setProperty('--bg-secondary', '#1a202c');
      root.style.setProperty('--bg-tertiary', '#2d3748');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#e2e8f0');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-primary', '#2d3748');
      root.style.setProperty('--border-secondary', '#4a5568');
      root.style.setProperty('--color-primary', '#4299e1');
      root.style.setProperty('--color-success', '#48bb78');
      root.style.setProperty('--color-warning', '#ed8936');
      root.style.setProperty('--color-error', '#f56565');
      root.style.setProperty('--status-online', '#48bb78');
      root.style.setProperty('--status-offline', '#f56565');
      root.style.setProperty('--status-warning', '#ed8936');
      root.style.setProperty('--status-critical', '#e53e3e');
      // RGB values for rgba() usage
      root.style.setProperty('--color-primary-rgb', '66, 153, 225');
      root.style.setProperty('--color-success-rgb', '72, 187, 120');
      root.style.setProperty('--color-warning-rgb', '237, 137, 54');
      root.style.setProperty('--color-error-rgb', '245, 101, 101');
    } else {
      // Light theme
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8fafc');
      root.style.setProperty('--bg-tertiary', '#f1f5f9');
      root.style.setProperty('--text-primary', '#1f2937');
      root.style.setProperty('--text-secondary', '#4b5563');
      root.style.setProperty('--text-muted', '#6b7280');
      root.style.setProperty('--border-primary', '#e5e7eb');
      root.style.setProperty('--border-secondary', '#d1d5db');
      root.style.setProperty('--color-primary', '#3b82f6');
      root.style.setProperty('--color-success', '#22c55e');
      root.style.setProperty('--color-warning', '#f59e0b');
      root.style.setProperty('--color-error', '#ef4444');
      root.style.setProperty('--status-online', '#22c55e');
      root.style.setProperty('--status-offline', '#ef4444');
      root.style.setProperty('--status-warning', '#f59e0b');
      root.style.setProperty('--status-critical', '#dc2626');
      // RGB values for rgba() usage
      root.style.setProperty('--color-primary-rgb', '59, 130, 246');
      root.style.setProperty('--color-success-rgb', '34, 197, 94');
      root.style.setProperty('--color-warning-rgb', '245, 158, 11');
      root.style.setProperty('--color-error-rgb', '239, 68, 68');
    }

    document.body.style.backgroundColor = isDark ? '#0f1419' : '#ffffff';
    document.body.style.color = isDark ? '#ffffff' : '#1f2937';
  }, []); // Run once on mount

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem('dashboard-theme', theme);

    // Update CSS custom properties
    const root = document.documentElement;
    if (isDark) {
      // Dark theme
      root.style.setProperty('--bg-primary', '#0f1419');
      root.style.setProperty('--bg-secondary', '#1a202c');
      root.style.setProperty('--bg-tertiary', '#2d3748');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#e2e8f0');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-primary', '#2d3748');
      root.style.setProperty('--border-secondary', '#4a5568');
      root.style.setProperty('--color-primary', '#4299e1');
      root.style.setProperty('--color-success', '#48bb78');
      root.style.setProperty('--color-warning', '#ed8936');
      root.style.setProperty('--color-error', '#f56565');
      root.style.setProperty('--status-online', '#48bb78');
      root.style.setProperty('--status-offline', '#f56565');
      root.style.setProperty('--status-warning', '#ed8936');
      root.style.setProperty('--status-critical', '#e53e3e');
      // RGB values for rgba() usage
      root.style.setProperty('--color-primary-rgb', '66, 153, 225');
      root.style.setProperty('--color-success-rgb', '72, 187, 120');
      root.style.setProperty('--color-warning-rgb', '237, 137, 54');
      root.style.setProperty('--color-error-rgb', '245, 101, 101');
    } else {
      // Light theme
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8fafc');
      root.style.setProperty('--bg-tertiary', '#f1f5f9');
      root.style.setProperty('--text-primary', '#1f2937');
      root.style.setProperty('--text-secondary', '#4b5563');
      root.style.setProperty('--text-muted', '#6b7280');
      root.style.setProperty('--border-primary', '#e5e7eb');
      root.style.setProperty('--border-secondary', '#d1d5db');
      root.style.setProperty('--color-primary', '#3b82f6');
      root.style.setProperty('--color-success', '#22c55e');
      root.style.setProperty('--color-warning', '#f59e0b');
      root.style.setProperty('--color-error', '#ef4444');
      root.style.setProperty('--status-online', '#22c55e');
      root.style.setProperty('--status-offline', '#ef4444');
      root.style.setProperty('--status-warning', '#f59e0b');
      root.style.setProperty('--status-critical', '#dc2626');
      // RGB values for rgba() usage
      root.style.setProperty('--color-primary-rgb', '59, 130, 246');
      root.style.setProperty('--color-success-rgb', '34, 197, 94');
      root.style.setProperty('--color-warning-rgb', '245, 158, 11');
      root.style.setProperty('--color-error-rgb', '239, 68, 68');
    }

    document.body.style.backgroundColor = isDark ? '#0f1419' : '#ffffff';
    document.body.style.color = isDark ? '#ffffff' : '#1f2937';
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const buttonStyle: React.CSSProperties = {
    position: 'relative',
    width: '60px',
    height: '32px',
    backgroundColor: isDark ? '#4299e1' : '#f59e0b',
    borderRadius: '16px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    padding: '2px',
    overflow: 'hidden',
  };

  const sliderStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transform: isDark ? 'translateX(26px)' : 'translateX(0px)',
    transition: 'transform 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  };

  return (
    <div style={containerStyle} className={className}>
      {showLabel && (
        <span style={labelStyle}>{isDark ? 'Dark' : 'Light'} Mode</span>
      )}
      <button
        style={buttonStyle}
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        type="button"
      >
        <div style={sliderStyle}>{isDark ? '🌙' : '☀️'}</div>
      </button>
    </div>
  );
};

export default SimpleThemeToggle;
