import React from 'react';
import styled from 'styled-components';
import { useTheme } from '../../styles/ThemeProvider';
import { Button } from '../../styles/styled';

const ToggleButton = styled(Button)<{ isLight: boolean }>`
  position: relative;
  width: 60px;
  height: 32px;
  padding: 0;
  background-color: ${({ theme, isLight }) =>
    isLight ? theme.colors.warning[400] : theme.colors.primary[600]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  transition: all ${({ theme }) => theme.transitions.base};

  &:hover:not(:disabled) {
    background-color: ${({ theme, isLight }) =>
      isLight ? theme.colors.warning[500] : theme.colors.primary[700]};
    transform: none;
    box-shadow: ${({ theme }) => theme.shadows.md};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.border.focus};
    outline-offset: 2px;
  }
`;

const ToggleSlider = styled.div<{ isLight: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ isLight }) => (isLight ? '2px' : '30px')};
  width: 28px;
  height: 28px;
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-radius: 50%;
  transition: all ${({ theme }) => theme.transitions.base};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const Icon = styled.span<{ isLight: boolean }>`
  font-size: 14px;
  transition: all ${({ theme }) => theme.transitions.base};
  opacity: ${({ isLight }) => (isLight ? 1 : 0.8)};
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Label = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  showLabel = false,
  className,
}) => {
  const { themeType, toggleTheme } = useTheme();
  const isLight = themeType === 'light';

  const handleToggle = () => {
    toggleTheme();
  };

  return (
    <ToggleContainer className={className}>
      {showLabel && <Label>{isLight ? 'Light' : 'Dark'} Mode</Label>}
      <ToggleButton
        isLight={isLight}
        onClick={handleToggle}
        aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
        title={`Switch to ${isLight ? 'dark' : 'light'} mode`}
        type="button"
      >
        <ToggleSlider isLight={isLight}>
          <Icon isLight={isLight}>{isLight ? '☀️' : '🌙'}</Icon>
        </ToggleSlider>
      </ToggleButton>
    </ToggleContainer>
  );
};

export default ThemeToggle;
