// IAllocationStrategy.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAllocationStrategy {
  function computeAndAllocate(
    address[] memory contestants,
    uint256 totalReward,
    uint256[] memory scores
  ) external view returns (uint256[] memory);
}
