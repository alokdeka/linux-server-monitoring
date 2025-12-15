# Linux Server Health Monitoring System

A lightweight, secure Linux server health monitoring system with an agent-based architecture.

## Project Structure

```
├── agent/                  # Agent components (runs on monitored servers)
│   ├── metrics/           # System metrics collection
│   ├── config/            # Configuration management
│   └── transport/         # HTTP communication with server
├── server/                # Central server components
│   ├── api/              # FastAPI endpoints
│   ├── database/         # PostgreSQL operations
│   ├── auth/             # Authentication and security
│   └── alerts/           # Alerting engine
├── shared/               # Shared models and interfaces
│   ├── models.py         # Data models
│   └── interfaces.py     # Component interfaces
├── tests/                # Test suite
│   ├── test_agent/       # Agent component tests
│   ├── test_server/      # Server component tests
│   └── test_shared/      # Shared component tests
├── requirements.txt      # Python dependencies
├── pyproject.toml       # Modern Python packaging configuration
└── README.md            # This file
```

## Development Setup

1. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Run tests:

   ```bash
   pytest
   ```

3. Run property-based tests:
   ```bash
   pytest -v tests/ -k "property"
   ```

## Testing Framework

The project uses:

- **pytest** for unit testing
- **Hypothesis** for property-based testing (minimum 100 iterations per test)
- **httpx** for API testing

Property-based tests are tagged with comments referencing specific correctness properties from the design document.

## Next Steps

This is the initial project structure. Implement the remaining tasks in the implementation plan to build out the complete monitoring system.
