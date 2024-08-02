// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";

interface IAllocationStrategy {
    function allocateRewards(
        address[] memory contestants,
        euint32[] memory scores,
        uint256[] memory evaluationCounts
    ) external pure returns (euint32[] memory);
}
