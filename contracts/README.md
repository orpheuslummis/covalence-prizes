# Notes on the Covalence Prizes system

Covalence Prizes is a decentralized platform for creating, managing, and distributing prizes using homomorphic smart contracts.

It leverages the Diamond pattern and AppStorage for efficient contract upgrades and state management. EIP-2535 Diamonds (https://eips.ethereum.org/EIPS/eip-2535), based on the diamond-2 implementation of Nick Mudge (nick@perfectabstractions.com).

Features:

- Multiple prize management
- Role-based access control
- Homomorphic encryption for secure evaluations
- Upgradeable smart contract architecture

Concepts:

- Scoring: This is done by evaluators during the Evaluating state.
- Allocation: This is the process of determining how much reward each contestant should receive based on their scores.
- Reward: This is the actual amount a contestant can claim after allocation.

Access Control:

- Anyone can create a prize, thereby becoming prize organizer
- Anyone can submit contributions
- Default Admin: A global role that can manage the entire system.
- Prize Organizer: A role specific to each prize, responsible for managing that prize.
- Prize Evaluator: A role specific to each prize, responsible for evaluating contributions for that prize.

Key Components:

- PrizeACLFacet: Manages access control for the entire system and individual prizes.
- PrizeManagerFacet: Handles the creation and management of prizes.
- PrizeEvaluationFacet: Manages the evaluation process for each prize.
- PrizeRewardFacet: Handles the allocation and distribution of rewards.
- PrizeFundingFacet: Manages the funding of prizes.
- PrizeStateFacet: Handles the state transitions of prizes.
- PrizeStrategyFacet: Manages the allocation strategy for each prize.
