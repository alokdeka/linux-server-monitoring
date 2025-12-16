# Contributing to Server Monitoring Dashboard

Thank you for your interest in contributing to the Server Health Monitoring Dashboard! This guide will help you get started with development and ensure your contributions align with the project standards.

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Standards](#code-standards)
4. [Testing Requirements](#testing-requirements)
5. [Pull Request Process](#pull-request-process)
6. [Issue Guidelines](#issue-guidelines)
7. [Architecture Guidelines](#architecture-guidelines)
8. [Performance Considerations](#performance-considerations)

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** (LTS recommended)
- **npm 9+** or **yarn 1.22+**
- **Git** with proper configuration
- **Code editor** with TypeScript support (VS Code recommended)

### Development Setup

1. **Fork and clone the repository:**

   ```bash
   git clone git@github.com:alokdeka/linux-server-monitoring.git
   cd linux-server-monitoring/dashboard
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment:**

   ```bash
   cp .env.example .env
   # Configure your local API endpoints
   ```

4. **Start development server:**

   ```bash
   npm run dev
   ```

5. **Verify setup:**
   ```bash
   npm run test
   npm run lint
   ```

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

## 🔄 Development Workflow

### Branch Strategy

We use a feature branch workflow:

1. **Create feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit:**

   ```bash
   git add .
   git commit -m "feat: add new server monitoring feature"
   ```

3. **Push and create PR:**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
feat(auth): add JWT token refresh mechanism
fix(dashboard): resolve server card loading issue
docs(api): update authentication endpoint documentation
test(components): add property-based tests for ServerCard
```

### Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run dev:host         # Dev server accessible from network

# Code Quality
npm run lint             # Check linting
npm run lint:fix         # Fix linting issues
npm run format           # Format code
npm run format:check     # Check formatting

# Testing
npm run test             # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Generate coverage report

# Building
npm run build            # Production build
npm run preview          # Preview build
```

## 📏 Code Standards

### TypeScript Guidelines

1. **Strict Mode**: Always use TypeScript strict mode
2. **Type Definitions**: Prefer interfaces over types for object shapes
3. **Explicit Types**: Avoid `any`, use proper typing
4. **Generic Constraints**: Use generic constraints when appropriate

```typescript
// ✅ Good
interface ServerMetrics {
  cpuUsage: number;
  memoryUsage: number;
  timestamp: string;
}

// ❌ Avoid
const serverData: any = {};
```

### React Component Guidelines

1. **Functional Components**: Use function components with hooks
2. **Props Interface**: Always define props interfaces
3. **Default Props**: Use default parameters instead of defaultProps
4. **Memo Usage**: Use React.memo for expensive components

```typescript
// ✅ Good
interface ServerCardProps {
  server: Server;
  onSelect?: (server: Server) => void;
  compact?: boolean;
}

const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onSelect,
  compact = false,
}) => {
  // Component implementation
};

export default React.memo(ServerCard);
```

### Styling Guidelines

1. **Styled Components**: Use styled-components for component styling
2. **Theme Usage**: Always use theme values for colors and spacing
3. **Responsive Design**: Mobile-first approach
4. **Accessibility**: Include proper ARIA labels and semantic HTML

```typescript
// ✅ Good
const StyledCard = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: ${({ theme }) => theme.spacing.sm};
  }
`;
```

### State Management Guidelines

1. **Redux Toolkit**: Use RTK for global state
2. **Local State**: Use useState for component-local state
3. **Selectors**: Use reselect for derived state
4. **Async Actions**: Use RTK Query or createAsyncThunk

```typescript
// ✅ Good
const selectServerById = createSelector(
  [selectAllServers, (state, serverId) => serverId],
  (servers, serverId) => servers.find((server) => server.id === serverId)
);
```

## 🧪 Testing Requirements

### Test Coverage Requirements

- **Minimum Coverage**: 80% overall coverage
- **Critical Paths**: 95% coverage for authentication and data handling
- **New Features**: 100% coverage for new functionality

### Testing Strategy

1. **Unit Tests**: Test individual components and functions
2. **Integration Tests**: Test component interactions
3. **Property-Based Tests**: Test universal properties
4. **E2E Tests**: Test complete user workflows

### Writing Tests

#### Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ServerCard } from './ServerCard';

describe('ServerCard', () => {
  const mockServer = {
    id: '1',
    hostname: 'test-server',
    status: 'online' as const,
    metrics: { cpuUsage: 45, memoryUsage: 60 }
  };

  it('should display server information correctly', () => {
    render(<ServerCard server={mockServer} />);

    expect(screen.getByText('test-server')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<ServerCard server={mockServer} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(mockServer);
  });
});
```

#### Property-Based Tests

```typescript
import fc from 'fast-check';
import { validateServerMetrics } from './validation';

describe('Server Metrics Validation', () => {
  it('should validate any valid server metrics', () => {
    fc.assert(
      fc.property(
        fc.record({
          cpuUsage: fc.float({ min: 0, max: 100 }),
          memoryUsage: fc.float({ min: 0, max: 100 }),
          timestamp: fc.date().map((d) => d.toISOString()),
        }),
        (metrics) => {
          expect(validateServerMetrics(metrics)).toBe(true);
        }
      )
    );
  });
});
```

### Test Organization

```
src/
├── components/
│   ├── ServerCard/
│   │   ├── ServerCard.tsx
│   │   ├── ServerCard.test.tsx
│   │   └── ServerCard.stories.tsx
└── test/
    ├── integration/
    ├── e2e/
    ├── property-tests/
    └── utils/
```

## 🔄 Pull Request Process

### Before Submitting

1. **Run all checks:**

   ```bash
   npm run lint
   npm run test
   npm run build
   ```

2. **Update documentation** if needed
3. **Add tests** for new functionality
4. **Update CHANGELOG.md** if applicable

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Verify tests cover new functionality
4. **Documentation**: Ensure docs are updated

## 🐛 Issue Guidelines

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
Clear description of the issue

**To Reproduce**
Steps to reproduce the behavior

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment:**

- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox]
- Version: [e.g. 1.0.0]

**Additional context**
Any other context about the problem
```

### Feature Requests

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
Clear description of desired solution

**Describe alternatives you've considered**
Alternative solutions considered

**Additional context**
Any other context or screenshots
```

## 🏗 Architecture Guidelines

### Component Architecture

1. **Single Responsibility**: Each component should have one clear purpose
2. **Composition**: Prefer composition over inheritance
3. **Props Interface**: Clear, well-documented props
4. **Error Boundaries**: Wrap components that might fail

### State Architecture

1. **Local vs Global**: Use local state when possible
2. **Normalized State**: Keep state normalized in Redux
3. **Derived State**: Use selectors for computed values
4. **Side Effects**: Handle in middleware or hooks

### API Architecture

1. **Type Safety**: All API calls should be typed
2. **Error Handling**: Consistent error handling patterns
3. **Caching**: Implement appropriate caching strategies
4. **Loading States**: Always handle loading and error states

## ⚡ Performance Considerations

### React Performance

1. **Memoization**: Use React.memo, useMemo, useCallback appropriately
2. **Code Splitting**: Lazy load routes and heavy components
3. **Bundle Size**: Monitor and optimize bundle size
4. **Re-renders**: Minimize unnecessary re-renders

### Network Performance

1. **API Optimization**: Batch requests when possible
2. **Caching**: Implement proper caching strategies
3. **WebSocket**: Use WebSocket for real-time updates
4. **Compression**: Enable gzip compression

### Monitoring

1. **Performance Metrics**: Track Core Web Vitals
2. **Error Tracking**: Monitor and log errors
3. **Bundle Analysis**: Regular bundle size analysis
4. **Lighthouse Audits**: Regular performance audits

## 📚 Resources

### Documentation

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Testing Library](https://testing-library.com/)

### Tools

- [VS Code](https://code.visualstudio.com/)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)

## 🤝 Community

### Getting Help

- **GitHub Discussions**: For questions and discussions
- **GitHub Issues**: For bugs and feature requests
- **Code Review**: Learn from PR feedback
- **Documentation**: Check existing docs first

### Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct. Please be respectful and inclusive in all interactions.

---

Thank you for contributing to the Server Health Monitoring Dashboard! Your contributions help make this project better for everyone.
