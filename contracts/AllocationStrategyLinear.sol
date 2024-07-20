// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13 <0.9.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "./IAllocationStrategy.sol";

contract AllocationStrategyLinear is IAllocationStrategy {
    function allocateRewards(
        address[] memory contestants,
        euint32[] memory scores,
        uint256[] memory evaluationCounts
    ) external pure returns (euint32[] memory) {
        require(
            contestants.length == scores.length && scores.length == evaluationCounts.length,
            "Input arrays must have the same length"
        );

        euint32[] memory rewards = new euint32[](contestants.length);
        euint32 totalScore = FHE.asEuint32(0);

        for (uint256 i = 0; i < scores.length; i++) {
            totalScore = FHE.add(totalScore, scores[i]);
        }

        for (uint256 i = 0; i < contestants.length; i++) {
            rewards[i] = FHE.div(scores[i], totalScore);
        }

        return rewards;
    }
}
