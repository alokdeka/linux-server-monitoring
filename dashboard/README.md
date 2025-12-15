# Server Health Monitoring Dashboard

A modern React TypeScript dashboard for monitoring Linux server health and metrics.

## Features

- Real-time server monitoring
- Interactive metrics visualization
- Alert management system
- Responsive design for desktop, tablet, and mobile
- Redux Toolkit for state management
- Property-based testing with fast-check

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development Scripts

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Check code formatting
npm run format:check

# Format code
npm run format

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
├── store/              # Redux store and slices
├── services/           # API clients and external services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── test/               # Test utilities and setup
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Redux Toolkit** - State management
- **Vitest** - Testing framework
- **React Testing Library** - Component testing
- **fast-check** - Property-based testing
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Testing

The project uses a comprehensive testing strategy:

- **Unit Tests**: Component and function testing with React Testing Library
- **Property-Based Tests**: Universal property verification with fast-check
- **Integration Tests**: End-to-end workflow testing

Run tests with:

```bash
npm run test
```

## API Integration

The dashboard integrates with the existing FastAPI backend through REST endpoints. See `src/services/api.ts` for the API client implementation.

## Contributing

1. Follow the established code style (enforced by ESLint and Prettier)
2. Write tests for new features
3. Ensure all tests pass before submitting changes
4. Use TypeScript strict mode for type safety
