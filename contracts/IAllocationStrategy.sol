// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13 <0.9.0;

import "@fhenixprotocol/contracts/FHE.sol";

interface IAllocationStrategy {
    function allocateRewards(
        address[] memory contestants,
        euint32[] memory aggregatedScores,
        uint256[] memory evaluationCounts
    ) external view returns (euint32[] memory rewards);
}
