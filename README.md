# Covalence Prizes

Covalence Prizes revolutionizes incentive mechanisms by leveraging homomorphic encryption and blockchain technology to create a decentralized, privacy-preserving prize system. This platform empowers organizations to foster innovation, align collective efforts, and distribute rewards with unprecedented transparency and fairness.

Features:

- Decentralized prize management with homomorphic smart contracts
- Privacy-preserving evaluations and reward allocations
- Flexible criteria and scoring mechanisms
- Multi-stakeholder participation (organizers, evaluators, contestants)
- Customizable allocation strategies

What is private and how? The system employs 'selective' privacy-preservation. In particular, the evaluations and the allocation of rewards are private.

## Use it

## Development quick start

Prerequisites: Node.js, pnpm, Hardhat

```bash
git clone https://github.com/CovalenceNetwork/covalence-prizes.git
cd covalence-prizes
cp .env.example .env.local
pnpm install
pnpm compile
pnpm test
```

## System notes

- Diamond pattern, with AppStorage pattern
-

Current limitations

- Organizer introduces centralization risk - it's possible to replace some parts of it with social choice
- The 'optimal' system parameters haven't been found, e.g. batch sizes, etc.

## Development notes

We're developping directly on testnet because fhenix's local devnet didn't work for us. Hardhat node doesn't work because of the FHE requirement.

```
p compile && p task:deploy --network testnet
p test
```

```
cd webapp && p dev
```

## Ideation

- Support for non-monetary rewards
- Support for pluggable external allocation strategies
- Prize as private fractional NFT
- Constestant disqualification
- ACL for prize creation, e.g. requiring magic link login
- Prize pausability, and overall system pausability
- Non-linear lifecycle, e.g. to support reverts based on errors or disputes
- Oracles
- Document upgrade process
- Cancel and refund prize
- React library to integrate easily into another front-end

## License

MIT License. See [LICENSE](LICENSE) file.
