# Omni-Bot 🤖

A powerful social agent built with ElizaOS - an intelligent bot that can interact across multiple platforms including Discord and Telegram.

## 🌟 Features

- **Multi-Platform Support**: Connect to Discord, Telegram, and Twitter simultaneously
- **AI-Powered**: Integrated with Groq for intelligent responses
- **Plugin Architecture**: Extensible with ElizaOS plugins
- **Real-time Development**: Hot-reloading and fast development experience
- **Production Ready**: Optimized builds and deployment configurations

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- ElizaOS CLI installed globally

### Installation

```bash
# Clone the repository
git clone https://github.com/TaufeeqAi/omni-bot.git
cd omni-bot

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and configuration
```

### Development

```bash
# Start development server with hot-reloading
bun run dev

# Or start without hot-reloading
bun run start

# Build for production
bun run build
```

### Testing

```bash
# Run all tests
bun run test

# Run component tests only
bun run test:component

# Run E2E tests only
bun run test:e2e

# Run tests with coverage
bun run test:coverage

# Run tests in watch mode
bun run test:watch

# Run Cypress tests
bun run cy:open
```

## 📁 Project Structure

```
omni-bot/
├── src/  
│   ├── frontend/          # React frontend
│   ├── characters/        # Bot character configurations
│   ├── index.ts           # Main entry point
│   └── plugin.ts          # Plugin configuration
├── scripts/               # Build and utility scripts
├── dist/                  # Build output
└── docs/                  # Documentation
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id

# Telegram Configuration
TELEGRAM_TOKEN=your_telegram_bot_token


# LLM Configuration
GROQ_API_KEY=your_groq_api_key


```bash
# Run all tests
bun run test

# Run specific test types
bun run test:component
bun run test:e2e

# Run with coverage
bun run test:coverage

# Run Cypress tests
bun run cy:open
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t omni-bot .

# Run with Docker Compose
docker-compose up -d
```

### Manual Deployment

```bash
# Build for production
bun run build

# Start production server
bun run start
```

## 📚 API Reference

### Main Entry Point

The main entry point is `src/index.ts` which initializes the ElizaOS runtime and configures the bot.

### Plugin System

Plugins are configured in `src/plugin.ts` and provide additional functionality:

- **Discord Plugin**: Handles Discord interactions
- **Telegram Plugin**: Manages Telegram bot functionality
- **Local AI Plugin**: Integrates with Groq for AI responses
- **SQL Plugin**: Database operations and persistence


### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality

```bash
# Check code quality
bun run check-all

# Format code
bun run format

# Type checking
bun run type-check
```

Made with ❤️ Happy Coding!
