// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "@fhenixprotocol/contracts/access/Permissioned.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";
import "../libraries/LibACL.sol";

// import "../libraries/LibAllocationStrategies.sol";

contract PrizeRewardFacet is Permissioned {
    // PRECISION_FACTOR: 10^6 (1 million)
    // This factor allows for 6 decimal places of precision when working with ETH amounts.
    // 1 ETH = 1,000,000 units in our scaled system
    // Minimum representable amount: 0.000001 ETH (1 wei = 10^-18 ETH)
    // Maximum representable amount with euint32: ~4,294 ETH
    // Chosen to balance precision, range, and gas efficiency within euint32 constraints
    uint256 constant PRECISION_FACTOR = 10 ** 6; // 1 ETH = 1,000,000 units

    function allocateRewardsBatch(uint256 prizeId, uint256 batchSize) external {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];

        require(LibPrize.isState(prizeId, LibPrize.State.Allocating), "Invalid state");
        require(LibACL.isPrizeOrganizer(prizeId, msg.sender), "Only prize organizer can allocate rewards");
        require(!prize.rewardsAllocated, "Rewards have already been allocated");
        require(prize.contributionCount > 0, "No contestants to allocate rewards");

        uint256 start = prize.lastProcessedIndex;
        uint256 end = (start + batchSize > prize.contributionCount) ? prize.contributionCount : start + batchSize;
        uint256 actualBatchSize = end - start;
        require(actualBatchSize > 0, "No contributions to process");

        uint256 scaledRewardPool = prize.monetaryRewardPool / PRECISION_FACTOR;
        require(scaledRewardPool <= type(uint32).max, "Reward pool too large for precision");
        euint32 eScaledRewardPool = FHE.asEuint32(uint32(scaledRewardPool));
        euint32 eTotalScore = prize.totalScore;

        for (uint256 i = start; i < end; i++) {
            Contribution storage contribution = prize.contributionsById[i];
            euint32 eContributionScore = contribution.weightedScore;
            euint32 eProportionalReward = FHE.div(FHE.mul(eContributionScore, eScaledRewardPool), eTotalScore);
            contribution.reward = eProportionalReward;
        }

        prize.lastProcessedIndex = end;

        if (end == prize.contributionCount) {
            prize.rewardsAllocated = true;
            emit LibPrize.RewardsAllocated(prizeId, prize.contributionCount);
        }
    }

    function computeContestantClaimReward(uint256 prizeId) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Claiming), "Invalid state");
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        require(prize.rewardsAllocated, "Rewards have not been allocated yet");

        uint256[] storage contributionIds = prize.contributionIdsByContestant[msg.sender];
        require(contributionIds.length > 0, "No contributions found");

        euint32 eTotalReward = FHE.asEuint32(0);
        for (uint256 i = 0; i < contributionIds.length; i++) {
            Contribution storage contribution = prize.contributionsById[contributionIds[i]];
            require(contribution.contestant == msg.sender, "Contribution does not belong to caller");
            if (!contribution.claimed) {
                eTotalReward = FHE.add(eTotalReward, contribution.reward);
                contribution.claimed = true;
                prize.claimedRewardsCount++;
            }
        }

        prize.claimedRewards[msg.sender] = eTotalReward;
        emit LibPrize.RewardClaimed(prizeId, msg.sender);
    }

    function viewContestantClaimReward(
        uint256 prizeId,
        Permission calldata permission
    ) external view onlySender(permission) returns (string memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        require(prize.rewardsAllocated, "Rewards have not been allocated yet");

        euint32 claimedReward = prize.claimedRewards[msg.sender];
        return FHE.sealoutput(claimedReward, permission.publicKey);
    }

    function areAllRewardsClaimed(uint256 prizeId) external view returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        return prize.claimedRewardsCount == prize.contributionCount;
    }
}
