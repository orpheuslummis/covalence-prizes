// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";

library LibAllocationStrategies {
    function computeAllocation(
        euint32[] memory scores,
        LibPrize.AllocationStrategy strategy
    ) internal pure returns (euint32[] memory) {
        if (strategy == LibPrize.AllocationStrategy.Linear) {
            return linearAllocation(scores);
        } else if (strategy == LibPrize.AllocationStrategy.Quadratic) {
            return quadraticAllocation(scores);
        } else if (strategy == LibPrize.AllocationStrategy.WinnerTakesAll) {
            return winnerTakesAllAllocation(scores);
        } else {
            revert("Invalid allocation strategy");
        }
    }

    function linearAllocation(euint32[] memory scores) internal pure returns (euint32[] memory) {
        euint32[] memory rewards = new euint32[](scores.length);
        euint32 totalScore = FHE.asEuint32(0);
        euint32 equalShare = FHE.div(FHE.asEuint32(1), FHE.asEuint32(scores.length));

        for (uint256 i = 0; i < scores.length; i++) {
            totalScore = FHE.add(totalScore, scores[i]);
        }

        ebool isTotalScoreZero = FHE.eq(totalScore, FHE.asEuint32(0));

        for (uint256 i = 0; i < scores.length; i++) {
            rewards[i] = FHE.select(isTotalScoreZero, equalShare, FHE.div(scores[i], totalScore));
        }

        return rewards;
    }

    function quadraticAllocation(euint32[] memory scores) internal pure returns (euint32[] memory) {
        euint32[] memory rewards = new euint32[](scores.length);
        euint32 totalSquaredScore = FHE.asEuint32(0);
        euint32 equalShare = FHE.div(FHE.asEuint32(1), FHE.asEuint32(scores.length));

        for (uint256 i = 0; i < scores.length; i++) {
            euint32 squaredScore = FHE.mul(scores[i], scores[i]);
            totalSquaredScore = FHE.add(totalSquaredScore, squaredScore);
            rewards[i] = squaredScore;
        }

        ebool isTotalSquaredScoreZero = FHE.eq(totalSquaredScore, FHE.asEuint32(0));

        for (uint256 i = 0; i < scores.length; i++) {
            rewards[i] = FHE.select(isTotalSquaredScoreZero, equalShare, FHE.div(rewards[i], totalSquaredScore));
        }

        return rewards;
    }

    function winnerTakesAllAllocation(euint32[] memory scores) internal pure returns (euint32[] memory) {
        euint32[] memory rewards = new euint32[](scores.length);
        euint32 maxScore = scores[0];
        euint32 winnerIndex = FHE.asEuint32(0);

        for (uint256 i = 1; i < scores.length; i++) {
            ebool isGreater = FHE.gt(scores[i], maxScore);
            maxScore = FHE.select(isGreater, scores[i], maxScore);
            winnerIndex = FHE.select(isGreater, FHE.asEuint32(i), winnerIndex);
        }

        for (uint256 i = 0; i < scores.length; i++) {
            rewards[i] = FHE.select(FHE.eq(FHE.asEuint32(i), winnerIndex), FHE.asEuint32(1), FHE.asEuint32(0));
        }

        return rewards;
    }
}
