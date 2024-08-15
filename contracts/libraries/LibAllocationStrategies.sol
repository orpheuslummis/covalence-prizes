// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.0;

// import "@fhenixprotocol/contracts/FHE.sol";
// import "../libraries/LibAppStorage.sol";
// import "../libraries/LibPrize.sol";

// library LibAllocationStrategies {
//     function computeAllocation(
//         Prize storage prize,
//         euint32[] memory scores,
//         uint256 startIndex,
//         uint256 batchSize,
//         uint256 totalContributions
//     ) internal view returns (euint16[] memory) {
//         if (prize.allocationStrategy == LibPrize.AllocationStrategy.Linear) {
//             return linearAllocation(prize, scores, startIndex, batchSize, totalContributions);
//             // } else if (prize.allocationStrategy == LibPrize.AllocationStrategy.Quadratic) {
//             //     return quadraticAllocation(prize, scores, startIndex, batchSize, totalContributions);
//         } else {
//             revert("Invalid allocation strategy");
//         }
//     }

//     function linearAllocation(
//         Prize storage prize,
//         euint32[] memory scores,
//         uint256 startIndex,
//         uint256 batchSize,
//         uint256 totalContributions
//     ) internal view returns (euint16[] memory) {
//         require(scores.length == batchSize, "Scores length must match batch size");
//         require(totalContributions > 0, "Total contributions must be greater than zero");

//         euint16[] memory rewards = new euint16[](batchSize);
//         euint32 rewardPool = FHE.asEuint32(prize.monetaryRewardPool);
//         euint32 equalShare = FHE.div(rewardPool, FHE.asEuint32(totalContributions));
//         ebool isTotalScoreZero = FHE.eq(prize.totalScore, FHE.asEuint32(0));

//         for (uint256 i = 0; i < batchSize; i++) {
//             rewards[i] = FHE.select(
//                 isTotalScoreZero,
//                 equalShare,
//                 FHE.div(FHE.mul(scores[i], rewardPool), prize.totalScore)
//             );
//         }

//         return rewards;
//     }

//     // ....
// }
