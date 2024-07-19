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
git clone https://github.com/CovalenceNetwork/covalence-prizes.git
cd covalence-prizes
cp .env.example .env
pnpm install
pnpm compile
pnpm test
```

## Core Components

- `PrizeManager.sol`: Manages prize creation and tracking
- `PrizeContract.sol`: Handles prize lifecycle, submissions, and evaluations
- `LinearAllocationStrategy.sol`: Example allocation strategy

## Usage

Refer to `test/Prize.ts` for comprehensive usage examples.


## Limitations

- No support for contestant disqualification
- Organizer introduces centralization risk - it's possible to replace some parts of it with social choice

## License

MIT License. See [LICENSE](LICENSE) file.