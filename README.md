# 🚀 Rocket Candle

A Web3 physics-based puzzle game built on Somnia Network. Blast through candlestick barriers, destroy enemies, and earn RocketFUEL tokens in this engaging blockchain gaming experience!

[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black)](https://rocketcandle-git-main-pixeldotdevs-projects.vercel.app) [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Somnia](https://img.shields.io/badge/Blockchain-Somnia-purple)](https://somnia.network)

## 🎮 Game Overview

**Rocket Candle** is a physics-based puzzle game where players:

- Launch rockets to eliminate enemies and obstacles
- Navigate through market-inspired candlestick barriers
- Earn RocketFUEL tokens based on performance and efficiency
- Compete on weekly leaderboards for rewards
- Complete 7 levels with increasing difficulty

## 🎯 How to Play

### Game Controls

- **W/S Keys**: Adjust rocket launch angle (up/down)
- **A/D Keys**: Adjust rocket launch power (decrease/increase)
- **SPACE**: Launch the rocket
- **Alternative**: Use the on-screen sliders for angle and power adjustment

### Game Elements

- **🎯 Enemy Characters**: Your primary targets - destroy all enemies to complete the level
- **🕯️ Candlestick Barriers**: Green and red barriers that block your path - navigate around them
- **🧱 Destructible Blocks**: Brown blocks that can be destroyed by rocket impact
- **🚀 Launcher**: Your rocket launcher - aim carefully as you have limited attempts per level

### Objective

- Eliminate all enemy characters in each level
- Use physics and strategy to navigate around or through obstacles
- Complete all 7 levels to maximize your FUEL token rewards
- Achieve high scores to climb the leaderboard

### Scoring System

- **Enemy Elimination**: Points for each enemy destroyed
- **Level Completion**: Bonus points for finishing levels
- **Efficiency Bonus**: Extra points for completing levels with fewer attempts
- **Blockchain Rewards**: Earn RocketFUEL tokens based on your performance

## 🏗️ Architecture

### Smart Contracts (`/hardhat-contracts` & `/rocketcandle-contracts`)

- **RocketCandleGame.sol**: Unified contract combining ERC-20 token (RocketFUEL) and complete game logic
- **Deployment**: Hardhat & Foundry setups for Somnia Network
- **Testing**: Comprehensive test suite for anti-cheat mechanisms

### Frontend (`/frontend`)

- **Framework**: Next.js with TypeScript
- **Game Engine**: Phaser.js for 2D physics and graphics
- **Styling**: Tailwind CSS for responsive design
- **Blockchain**: ethers.js integration with Somnia Network

## 🚀 Quick Start

### 1. Smart Contract Deployment

```bash
# Using Hardhat
cd hardhat-contracts
npm install
cp .env.example .env
# Edit .env with your private key

# Deploy to Somnia testnet
npm run deploy:somnia

# OR using Foundry
cd rocketcandle-contracts
forge install
forge build
forge script script/DeployRocketCandle.s.sol \
  --rpc-url https://dream-rpc.somnia.network \
  --private-key <YOUR_PRIVATE_KEY> \
  --broadcast
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Configure environment
echo "NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=your_deployed_address" > .env.local

# Start development server
npm run dev
```

### 3. Access the Game

- Visit: [rocketcandle-git-main-pixeldotdevs-projects.vercel.app](https://rocketcandle-git-main-pixeldotdevs-projects.vercel.app)
- Connect your Somnia-compatible wallet
- Ensure you have STT tokens for gas fees
- Start playing and earning RocketFUEL tokens!

## � Game Features

### Core Gameplay

- **Physics Controls**: W/S for angle, A/D for power, SPACE to launch
- **Progressive Difficulty**: 7 levels with increasing complexity
- **Strategic Elements**: Navigate candlestick barriers and destructible blocks
- **Target System**: Eliminate all enemies to complete levels

### Blockchain Integration

- **Score Validation**: Anti-cheat algorithms prevent impossible scores
- **Weekly Leaderboards**: Automatic ranking and competition cycles
- **Token Economy**: Earn RocketFUEL tokens based on performance metrics
- **Revive System**: Spend 50 RocketFUEL tokens to continue failed games

## � Technical Stack

### Blockchain

- **Network**: Somnia Shannon Testnet (Chain ID: 50312)
- **RPC**: `https://dream-rpc.somnia.network`
- **Explorer**: `https://shannon-explorer.somnia.network`
- **Framework**: Hardhat + Foundry with OpenZeppelin contracts

### Frontend

- **Runtime**: Next.js with TypeScript
- **Game Engine**: Phaser.js for 2D physics and rendering
- **Blockchain**: ethers.js for Web3 interactions
- **Styling**: Tailwind CSS with responsive design

## � Project Structure

```
rocket-candle/
├── contracts/                 # Smart contracts & blockchain
│   ├── contracts/RocketCandleGame.sol
│   ├── scripts/deploy.js
│   └── hardhat.config.js
├── frontend/                  # Next.js game application
│   ├── app/                   # App Router pages
│   ├── components/            # React components
│   ├── utils/blockchain.ts    # Web3 integration
│   └── public/                # Game assets
│       ├── assets/            # Sprites and images
│       ├── blocks/            # Candlestick barriers
│       └── enemies/           # Enemy sprites
├── rocketcandle-contracts/    # Foundry contracts (alternative)
├── LICENSE
└── README.md
```

## 🔐 Security Features

### Smart Contract Security

- **Input Validation**: Comprehensive parameter checking
- **Anti-Cheat Logic**: Statistical analysis of submitted scores
- **Gas Optimization**: Efficient data structures and algorithms
- **Emergency Controls**: Pause mechanisms for critical issues

### Frontend Security

- **Wallet Integration**: Secure connection to MetaMask and Web3 wallets
- **Network Validation**: Automatic Somnia network switching
- **Error Handling**: Graceful handling of blockchain failures
- **Data Sanitization**: Input validation for all user data

## � Deployment Guide

### Prerequisites

- Node.js 18.0+
- MetaMask or compatible Web3 wallet
- Somnia testnet STT tokens (from faucet)

### Contract Deployment

1. Configure `.env` with deployer private key
2. Fund deployer wallet with STT tokens
3. Run `npm run deploy:somnia`
4. Save contract address for frontend configuration

### Frontend Deployment

1. Update `NEXT_PUBLIC_GAME_CONTRACT_ADDRESS` in environment
2. Deploy to Vercel: `vercel deploy`
3. Test full game functionality

## � Testing

### Smart Contract Tests

```bash
cd hardhat-contracts
npm test                    # Run full test suite
npm run test:coverage      # Generate coverage report
```

### Frontend Testing

```bash
cd frontend
npm run dev                # Local development
npm run build              # Production build test
npm run lint               # Code quality check
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Run tests: `npm test`
4. Commit changes: `git commit -m 'Add new feature'`
5. Push branch: `git push origin feature/new-feature`
6. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- **Live Game**: [rocketcandle-git-main-pixeldotdevs-projects.vercel.app](https://rocketcandle-git-main-pixeldotdevs-projects.vercel.app)
- **Documentation**: [Somnia Network Docs](https://docs.somnia.network)
- **Block Explorer**: [Shannon Explorer](https://shannon-explorer.somnia.network)
- **Testnet Faucet**: [Somnia Faucet](https://testnet.somnia.network/)

## 🆘 Support

For issues and questions:

1. Check existing GitHub issues
2. Review documentation
3. Join Somnia Discord community
4. Submit new issue with detailed description

---

**Ready to blast off?** Connect your wallet and start earning RocketFUEL tokens today! 🚀✨
