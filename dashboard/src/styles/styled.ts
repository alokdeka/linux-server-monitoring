import styled, { css } from 'styled-components';

// Media query helpers for responsive design
export const media = {
  sm: (styles: any) => css`
    @media (min-width: 640px) {
      ${styles}
    }
  `,
  md: (styles: any) => css`
    @media (min-width: 768px) {
      ${styles}
    }
  `,
  lg: (styles: any) => css`
    @media (min-width: 1024px) {
      ${styles}
    }
  `,
  xl: (styles: any) => css`
    @media (min-width: 1280px) {
      ${styles}
    }
  `,
  '2xl': (styles: any) => css`
    @media (min-width: 1536px) {
      ${styles}
    }
  `,
  // Max-width queries
  maxSm: (styles: any) => css`
    @media (max-width: 639px) {
      ${styles}
    }
  `,
  maxMd: (styles: any) => css`
    @media (max-width: 767px) {
      ${styles}
    }
  `,
  maxLg: (styles: any) => css`
    @media (max-width: 1023px) {
      ${styles}
    }
  `,
  maxXl: (styles: any) => css`
    @media (max-width: 1279px) {
      ${styles}
    }
  `,
  // Orientation queries
  portrait: (styles: any) => css`
    @media (orientation: portrait) {
      ${styles}
    }
  `,
  landscape: (styles: any) => css`
    @media (orientation: landscape) {
      ${styles}
    }
  `,
  // Accessibility queries
  reducedMotion: (styles: any) => css`
    @media (prefers-reduced-motion: reduce) {
      ${styles}
    }
  `,
  highContrast: (styles: any) => css`
    @media (prefers-contrast: high) {
      ${styles}
    }
  `,
};

// Common styled components
export const Container = styled.div<{
  maxWidth?: string;
  padding?: string;
  fluid?: boolean;
}>`
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: ${({ padding = '1rem' }) => padding};
  padding-right: ${({ padding = '1rem' }) => padding};

  ${({ maxWidth = '1280px', fluid }) =>
    !fluid &&
    css`
      max-width: ${maxWidth};
    `}

  ${media.md(css`
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  `)}
`;

export const Grid = styled.div<{
  columns?: number;
  gap?: string;
  responsive?: boolean;
}>`
  display: grid;
  gap: ${({ gap = '1rem' }) => gap};

  ${({ columns = 1 }) => css`
    grid-template-columns: repeat(${columns}, minmax(0, 1fr));
  `}

  ${({ responsive }) =>
    responsive &&
    css`
      grid-template-columns: 1fr;

      ${media.sm(css`
        grid-template-columns: repeat(2, minmax(0, 1fr));
      `)}

      ${media.md(css`
        grid-template-columns: repeat(3, minmax(0, 1fr));
      `)}
    
    ${media.lg(css`
        grid-template-columns: repeat(4, minmax(0, 1fr));
      `)}
    `}
`;

export const Flex = styled.div<{
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  gap?: string;
}>`
  display: flex;
  flex-direction: ${({ direction = 'row' }) => direction};
  align-items: ${({ align = 'stretch' }) => {
    switch (align) {
      case 'start':
        return 'flex-start';
      case 'center':
        return 'center';
      case 'end':
        return 'flex-end';
      case 'stretch':
        return 'stretch';
      default:
        return align;
    }
  }};
  justify-content: ${({ justify = 'start' }) => {
    switch (justify) {
      case 'start':
        return 'flex-start';
      case 'center':
        return 'center';
      case 'end':
        return 'flex-end';
      case 'between':
        return 'space-between';
      case 'around':
        return 'space-around';
      case 'evenly':
        return 'space-evenly';
      default:
        return justify;
    }
  }};
  flex-wrap: ${({ wrap }) => (wrap ? 'wrap' : 'nowrap')};
  gap: ${({ gap = '0' }) => gap};
`;

export const Card = styled.div<{
  padding?: string;
  shadow?: string;
  border?: boolean;
  hover?: boolean;
}>`
  background-color: ${({ theme }) => theme.colors.background.elevated};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ padding = '1.5rem' }) => padding};
  box-shadow: ${({
    shadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  }) => shadow};
  border: ${({ theme, border = true }) =>
    border ? `1px solid ${theme.colors.border.primary}` : 'none'};
  transition: all ${({ theme }) => theme.transitions.fast};

  ${({ hover }) =>
    hover &&
    css`
      &:hover {
        transform: translateY(-2px);
        box-shadow:
          0 10px 15px -3px rgba(0, 0, 0, 0.1),
          0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }
    `}
`;

export const Button = styled.button<{
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: inherit;
  font-weight: 500;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  white-space: nowrap;
  user-select: none;

  ${({ fullWidth }) =>
    fullWidth &&
    css`
      width: 100%;
    `}

  ${({ loading }) =>
    loading &&
    css`
      cursor: wait;
      opacity: 0.7;
    `}

  /* Size variants */
  ${({ size = 'md' }) => {
    switch (size) {
      case 'sm':
        return css`
          font-size: 0.875rem;
          padding: 0.5rem 0.75rem;
          min-height: 36px;
        `;
      case 'lg':
        return css`
          font-size: 1.125rem;
          padding: 1rem 1.5rem;
          min-height: 52px;
        `;
      default:
        return css`
          font-size: 1rem;
          padding: 0.75rem 1rem;
          min-height: 44px;
        `;
    }
  }}

  /* Color variants */
  ${({ variant = 'primary', theme }) => {
    switch (variant) {
      case 'secondary':
        return css`
          background-color: ${theme.colors.secondary[500]};
          color: ${theme.colors.text.inverse};

          &:hover:not(:disabled) {
            background-color: ${theme.colors.secondary[600]};
          }
        `;
      case 'success':
        return css`
          background-color: ${theme.colors.success[500]};
          color: ${theme.colors.text.inverse};

          &:hover:not(:disabled) {
            background-color: ${theme.colors.success[600]};
          }
        `;
      case 'warning':
        return css`
          background-color: ${theme.colors.warning[500]};
          color: ${theme.colors.text.inverse};

          &:hover:not(:disabled) {
            background-color: ${theme.colors.warning[600]};
          }
        `;
      case 'error':
        return css`
          background-color: ${theme.colors.error[500]};
          color: ${theme.colors.text.inverse};

          &:hover:not(:disabled) {
            background-color: ${theme.colors.error[600]};
          }
        `;
      case 'ghost':
        return css`
          background-color: transparent;
          color: ${theme.colors.text.primary};
          border: 1px solid ${theme.colors.border.primary};

          &:hover:not(:disabled) {
            background-color: ${theme.colors.background.secondary};
            border-color: ${theme.colors.border.secondary};
          }
        `;
      default:
        return css`
          background-color: ${theme.colors.primary[500]};
          color: ${theme.colors.text.inverse};

          &:hover:not(:disabled) {
            background-color: ${theme.colors.primary[600]};
          }
        `;
    }
  }}

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.border.focus};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

export const Input = styled.input<{
  error?: boolean;
  success?: boolean;
}>`
  width: 100%;
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.5;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 0.375rem;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  ${({ error, theme }) =>
    error &&
    css`
      border-color: ${theme.colors.border.error};

      &:focus {
        border-color: ${theme.colors.border.error};
        box-shadow: 0 0 0 3px ${theme.colors.error[100]};
      }
    `}

  ${({ success, theme }) =>
    success &&
    css`
      border-color: ${theme.colors.border.success};

      &:focus {
        border-color: ${theme.colors.border.success};
        box-shadow: 0 0 0 3px ${theme.colors.success[100]};
      }
    `}
`;

export const Text = styled.span<{
  size?: string;
  weight?: string;
  color?: 'primary' | 'secondary' | 'muted' | 'inverse' | 'disabled';
  align?: 'left' | 'center' | 'right';
}>`
  font-size: ${({ size = '1rem' }) => size};
  font-weight: ${({ weight = '400' }) => weight};
  text-align: ${({ align = 'left' }) => align};

  ${({ color = 'primary', theme }) => {
    switch (color) {
      case 'secondary':
        return css`
          color: ${theme.colors.text.secondary};
        `;
      case 'muted':
        return css`
          color: ${theme.colors.text.muted};
        `;
      case 'inverse':
        return css`
          color: ${theme.colors.text.inverse};
        `;
      case 'disabled':
        return css`
          color: ${theme.colors.text.disabled};
        `;
      default:
        return css`
          color: ${theme.colors.text.primary};
        `;
    }
  }}
`;

export const StatusBadge = styled.span<{
  status: 'online' | 'offline' | 'warning' | 'critical';
  size?: 'sm' | 'md' | 'lg';
}>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.025em;

  ${({ size = 'md' }) => {
    switch (size) {
      case 'sm':
        return css`
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
        `;
      case 'lg':
        return css`
          font-size: 0.875rem;
          padding: 0.5rem 1rem;
        `;
      default:
        return css`
          font-size: 0.75rem;
          padding: 0.25rem 0.75rem;
        `;
    }
  }}

  ${({ status, theme }) => {
    switch (status) {
      case 'online':
        return css`
          background-color: ${theme.colors.success[100]};
          color: ${theme.colors.success[800]};
        `;
      case 'offline':
        return css`
          background-color: ${theme.colors.error[100]};
          color: ${theme.colors.error[800]};
        `;
      case 'warning':
        return css`
          background-color: ${theme.colors.warning[100]};
          color: ${theme.colors.warning[800]};
        `;
      case 'critical':
        return css`
          background-color: ${theme.colors.error[100]};
          color: ${theme.colors.error[800]};
        `;
      default:
        return css`
          background-color: ${theme.colors.gray[100]};
          color: ${theme.colors.gray[800]};
        `;
    }
  }}

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: currentColor;
  }
`;

// Animation utilities
export const fadeIn = css`
  animation: fadeIn 0.3s ease-out;
`;

export const slideIn = css`
  animation: slideInUp 0.3s ease-out;
`;

export const pulse = css`
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
`;

// Responsive utilities
export const hideOnMobile = css`
  ${media.maxMd(css`
    display: none;
  `)}
`;

export const showOnMobile = css`
  display: none;

  ${media.maxMd(css`
    display: block;
  `)}
`;

export const stackOnMobile = css`
  ${media.maxMd(css`
    flex-direction: column;
  `)}
`;
