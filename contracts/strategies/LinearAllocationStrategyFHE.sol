// LinearAllocationStrategyFHE.sol
// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13 <0.9.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../interfaces/IAllocationStrategyFHE.sol";

contract LinearAllocationFHE is IAllocationStrategyFHE {
  function computeAndAllocate(
    address[] memory contestants,
    euint32 totalReward,
    euint32[] memory scores
  ) external pure override returns (euint32[] memory) {
    require(contestants.length > 0, "No contestants provided");
    require(
      contestants.length == scores.length,
      "Contestants and scores mismatch"
    );

    euint32[] memory rewards = new euint32[](contestants.length);
    euint32 totalScore = FHE.asEuint32(0);

    // Calculate total score
    for (uint256 i = 0; i < scores.length; i++) {
      totalScore = FHE.add(totalScore, scores[i]);
    }

    // Allocate rewards linearly based on scores
    ebool isTotalScorePositive = FHE.gt(totalScore, FHE.asEuint32(0));
    for (uint256 i = 0; i < contestants.length; i++) {
      euint32 rewardAmount = FHE.mul(totalReward, scores[i]);
      rewardAmount = FHE.div(rewardAmount, totalScore);
      rewards[i] = FHE.select(
        isTotalScorePositive,
        rewardAmount,
        FHE.asEuint32(0)
      );
    }

    return rewards;
  }
}
