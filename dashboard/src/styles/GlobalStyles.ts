import { createGlobalStyle, keyframes } from 'styled-components';
import type { Theme } from './theme';

// Keyframe animations
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const ping = keyframes`
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const bounce = keyframes`
  0%, 100% {
    transform: translateY(-25%);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

const slideInUp = keyframes`
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const slideInDown = keyframes`
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const slideInLeft = keyframes`
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideInRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

export const GlobalStyles = createGlobalStyle`
  /* CSS Reset and Base Styles */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    scroll-behavior: smooth;
    height: 100%;
  }

  body {
    font-family: ${({ theme }) => theme.typography.fontFamily.sans};
    font-size: ${({ theme }) => theme.typography.fontSize.base};
    font-weight: ${({ theme }) => theme.typography.fontWeight.normal};
    line-height: ${({ theme }) => theme.typography.lineHeight.normal};
    color: ${({ theme }) => theme.colors.text.primary};
    background-color: ${({ theme }) => theme.colors.background.primary};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
    height: 100%;
    overflow-x: hidden;
  }

  #root {
    height: 100%;
    min-height: 100vh;
  }

  /* Typography */
  h1, h2, h3, h4, h5, h6 {
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    line-height: ${({ theme }) => theme.typography.lineHeight.tight};
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: ${({ theme }) => theme.spacing[4]};
  }

  h1 {
    font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  }

  h2 {
    font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  }

  h3 {
    font-size: ${({ theme }) => theme.typography.fontSize.xl};
  }

  h4 {
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
  }

  h5 {
    font-size: ${({ theme }) => theme.typography.fontSize.base};
  }

  h6 {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
  }

  p {
    margin-bottom: ${({ theme }) => theme.spacing[4]};
    color: ${({ theme }) => theme.colors.text.secondary};
    line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  }

  /* Links */
  a {
    color: ${({ theme }) => theme.colors.primary[500]};
    text-decoration: none;
    transition: color ${({ theme }) => theme.transitions.fast};

    &:hover {
      color: ${({ theme }) => theme.colors.primary[600]};
      text-decoration: underline;
    }

    &:focus {
      outline: 2px solid ${({ theme }) => theme.colors.border.focus};
      outline-offset: 2px;
      border-radius: ${({ theme }) => theme.borderRadius.sm};
    }
  }

  /* Form Elements */
  button {
    font-family: inherit;
    font-size: ${({ theme }) => theme.typography.fontSize.base};
    font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
    line-height: 1;
    border: none;
    border-radius: ${({ theme }) => theme.borderRadius.md};
    padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
    background-color: ${({ theme }) => theme.colors.primary[500]};
    color: ${({ theme }) => theme.colors.text.inverse};
    cursor: pointer;
    transition: all ${({ theme }) => theme.transitions.fast};
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${({ theme }) => theme.spacing[2]};

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.primary[600]};
      transform: translateY(-1px);
      box-shadow: ${({ theme }) => theme.shadows.md};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: ${({ theme }) => theme.shadows.sm};
    }

    &:focus {
      outline: 2px solid ${({ theme }) => theme.colors.border.focus};
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background-color: ${({ theme }) => theme.colors.gray[400]};
    }
  }

  input, textarea, select {
    font-family: inherit;
    font-size: ${({ theme }) => theme.typography.fontSize.base};
    line-height: ${({ theme }) => theme.typography.lineHeight.normal};
    border: 1px solid ${({ theme }) => theme.colors.border.primary};
    border-radius: ${({ theme }) => theme.borderRadius.md};
    padding: ${({ theme }) => theme.spacing[3]};
    background-color: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.primary};
    transition: all ${({ theme }) => theme.transitions.fast};
    min-height: 44px;

    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.border.focus};
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background-color: ${({ theme }) => theme.colors.gray[100]};
    }

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.muted};
    }
  }

  textarea {
    resize: vertical;
    min-height: 100px;
  }

  /* Lists */
  ul, ol {
    margin-bottom: ${({ theme }) => theme.spacing[4]};
    padding-left: ${({ theme }) => theme.spacing[6]};
  }

  li {
    margin-bottom: ${({ theme }) => theme.spacing[1]};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  /* Code */
  code, pre {
    font-family: ${({ theme }) => theme.typography.fontFamily.mono};
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
  }

  code {
    background-color: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
    padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
    border-radius: ${({ theme }) => theme.borderRadius.sm};
  }

  pre {
    background-color: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
    padding: ${({ theme }) => theme.spacing[4]};
    border-radius: ${({ theme }) => theme.borderRadius.md};
    overflow-x: auto;
    margin-bottom: ${({ theme }) => theme.spacing[4]};
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: ${({ theme }) => theme.spacing[4]};
  }

  th, td {
    text-align: left;
    padding: ${({ theme }) => theme.spacing[3]};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
  }

  th {
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }

  td {
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  /* Scrollbars */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background.secondary};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.gray[400]};
    border-radius: ${({ theme }) => theme.borderRadius.full};
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.gray[500]};
  }

  /* Selection */
  ::selection {
    background-color: ${({ theme }) => theme.colors.primary[200]};
    color: ${({ theme }) => theme.colors.primary[900]};
  }

  /* Focus visible polyfill */
  .js-focus-visible :focus:not(.focus-visible) {
    outline: none;
  }

  /* Animations */
  @keyframes spin {
    ${spin}
  }

  @keyframes ping {
    ${ping}
  }

  @keyframes pulse {
    ${pulse}
  }

  @keyframes bounce {
    ${bounce}
  }

  @keyframes fadeIn {
    ${fadeIn}
  }

  @keyframes fadeOut {
    ${fadeOut}
  }

  @keyframes slideInUp {
    ${slideInUp}
  }

  @keyframes slideInDown {
    ${slideInDown}
  }

  @keyframes slideInLeft {
    ${slideInLeft}
  }

  @keyframes slideInRight {
    ${slideInRight}
  }

  /* Utility classes for animations */
  .animate-spin {
    animation: ${spin} 1s linear infinite;
  }

  .animate-ping {
    animation: ${ping} 1s cubic-bezier(0, 0, 0.2, 1) infinite;
  }

  .animate-pulse {
    animation: ${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .animate-bounce {
    animation: ${bounce} 1s infinite;
  }

  .animate-fade-in {
    animation: ${fadeIn} 0.3s ease-out;
  }

  .animate-fade-out {
    animation: ${fadeOut} 0.3s ease-out;
  }

  .animate-slide-in-up {
    animation: ${slideInUp} 0.3s ease-out;
  }

  .animate-slide-in-down {
    animation: ${slideInDown} 0.3s ease-out;
  }

  .animate-slide-in-left {
    animation: ${slideInLeft} 0.3s ease-out;
  }

  .animate-slide-in-right {
    animation: ${slideInRight} 0.3s ease-out;
  }

  /* Responsive design support */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    html {
      font-size: 14px;
    }

    h1 {
      font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
    }

    h2 {
      font-size: ${({ theme }) => theme.typography.fontSize.xl};
    }

    h3 {
      font-size: ${({ theme }) => theme.typography.fontSize.lg};
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    button {
      border: 2px solid ${({ theme }) => theme.colors.text.primary};
    }

    input, textarea, select {
      border: 2px solid ${({ theme }) => theme.colors.text.primary};
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }

    .animate-spin,
    .animate-ping,
    .animate-pulse,
    .animate-bounce,
    .animate-fade-in,
    .animate-fade-out,
    .animate-slide-in-up,
    .animate-slide-in-down,
    .animate-slide-in-left,
    .animate-slide-in-right {
      animation: none !important;
    }
  }

  /* Print styles */
  @media print {
    * {
      background: transparent !important;
      color: black !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }

    a, a:visited {
      text-decoration: underline;
    }

    a[href]:after {
      content: " (" attr(href) ")";
    }

    .no-print {
      display: none !important;
    }
  }
`;
