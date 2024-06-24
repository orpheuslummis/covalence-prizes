# Covalence Prizes

Covalence Prizes revolutionizes incentive mechanisms by leveraging homomorphic encryption and blockchain technology to create a decentralized, privacy-preserving prize system. This platform empowers organizations to foster innovation, align collective efforts, and distribute rewards with unprecedented transparency and fairness.

## Features

- Decentralized prize management with homomorphic smart contracts
- Privacy-preserving evaluations and reward allocations
- Flexible criteria and scoring mechanisms
- Multi-stakeholder participation (organizers, evaluators, contestants)
- Customizable allocation strategies

## Quick Start

Prerequisites: Node.js, pnpm, Hardhat

```bash
git clone https://github.com/CovalenceNetwork/coprizes.git
cd coprizes
pnpm install
pnpm typechain
pnpm test
pnpm task:deploy  # Deploy to Fhenix testnet
```

## Core Components

- `PrizeManager.sol`: Manages prize creation and tracking
- `PrizeContract.sol`: Handles prize lifecycle, submissions, and evaluations
- `LinearAllocationStrategy.sol`: Example allocation strategy

## Usage

Refer to `test/Prize.ts` for comprehensive usage examples.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License. See [LICENSE](LICENSE) file.

## Acknowledgments

Built with [Fhenix Protocol](https://fhenix.io/), [Hardhat](https://hardhat.org/), and [ethers.js](https://docs.ethers.io/v6/).
```