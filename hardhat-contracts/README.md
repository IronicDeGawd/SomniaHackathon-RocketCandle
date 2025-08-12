# 🚀 Rocket Candle Game - Hardhat Contracts

Smart contracts for the Rocket Candle game built with Hardhat for deployment on Somnia Network.

## 📁 Project Structure

```
hardhat-contracts/
├── contracts/
│   └── RocketCandleGame.sol    # Main game contract with ERC20 token
├── scripts/
│   └── deploy.js               # Deployment script
├── test/
│   └── RocketCandleGame.test.js # Contract tests
├── hardhat.config.js           # Hardhat configuration
├── package.json                # Dependencies and scripts
├── .env                        # Environment variables
└── deployments.json           # Deployment records
```

## 🛠️ Setup

### 1. Install Dependencies

```bash
cd hardhat-contracts
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Your private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_api_key_here

# Contract address (updated after deployment)
ROCKET_CANDLE_GAME_ADDRESS=
```

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Run Tests

```bash
npm test
```

## 🚀 Deployment

### Deploy to Somnia Network

```bash
npm run deploy:somnia
```

This will:

- Deploy the `RocketCandleGame` contract
- Verify the contract on Somnia explorer
- Update the `.env` file with the contract address
- Save deployment details to `deployments.json`

### Deploy to Local Network

```bash
# Start local hardhat node in another terminal
npx hardhat node

# Deploy to local network
npm run deploy:local
```

## 📋 Available Scripts

- `npm run compile` - Compile contracts
- `npm test` - Run tests
- `npm run deploy:somnia` - Deploy to Somnia testnet
- `npm run deploy:local` - Deploy to local network
- `npm run verify:somnia` - Verify contract on Somnia explorer

## 🎮 Contract Details

### RocketCandleGame

A combined ERC20 token and game logic contract featuring:

**Token Economics:**

- Token Name: `Rocket Candle Fuel`
- Token Symbol: `RocketFUEL`
- Max Supply: 10,000,000 tokens
- Treasury Reserve: 9,000,000 tokens (for rewards)
- Initial Supply: 1,000,000 tokens (to deployer)

**Game Features:**

- Score submission with anti-cheat validation
- Token rewards based on score and level completion
- Weekly leaderboards with automatic ranking
- Revive system using token burning
- Player statistics and game history

**Rewards System:**

- 1 RocketFUEL per 1,000 points scored
- 1.5 RocketFUEL per level completed
- Weekly leaderboard rewards (500/300/150/25 tokens)

**Anti-cheat Protection:**

- Minimum game time validation (5 seconds)
- Maximum score per second limits (2,000 points/sec)
- Level and enemy validation

## 🔧 Network Configuration

### Somnia Testnet

- **RPC URL:** `https://dream-rpc.somnia.network`
- **Chain ID:** `50312`
- **Explorer:** `https://shannon-explorer.somnia.network`
- **Currency:** `SOM`

## 📊 Gas Optimization

The contracts are optimized with:

- Solidity 0.8.22 with optimizer enabled (200 runs)
- Efficient storage patterns
- Gas-optimized sorting algorithms
- ReentrancyGuard and Pausable for security

## 🔍 Contract Verification

After deployment, contracts are automatically verified on the Somnia explorer. You can also verify manually:

```bash
npx hardhat verify --network somnia CONTRACT_ADDRESS
```

## 🧪 Testing

Run comprehensive tests covering:

- Contract deployment and initialization
- Game mechanics and score submission
- Token economics and revive system
- Admin functions and security features
- Edge cases and error conditions

```bash
npm test
```

## 📈 Monitoring

After deployment, monitor your contract:

- **Somnia Explorer:** https://shannon-explorer.somnia.network
- **Contract Address:** Check `deployments.json` or `.env`
- **Token Info:** View on explorer or add to wallet

## 🛡️ Security Features

- **Ownable:** Admin-only functions
- **ReentrancyGuard:** Protection against reentrancy attacks
- **Pausable:** Emergency stop functionality
- **Anti-cheat:** Score validation and rate limiting

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Support

For issues or questions:

- Check the test files for usage examples
- Review the contract documentation
- Open an issue on GitHub

---

**Ready to deploy?** Make sure you have testnet SOM tokens and run `npm run deploy:somnia`! 🚀
