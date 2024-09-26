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

    /**
     * @dev Allocates rewards for a batch of contributions in a prize.
     * @param prizeId The ID of the prize.
     * @param batchSize The number of contributions to process in this batch.
     *
     * This function:
     * 1. Validates the prize state and caller's permissions.
     * 2. Processes a batch of contributions, calculating each one's reward.
     * 3. Uses FHE operations to maintain privacy of scores and rewards.
     * 4. Updates the prize state, potentially marking rewards as fully allocated.
     */
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

    /**
     * @dev Computes the total reward for a contestant across all their contributions.
     * @param prizeId The ID of the prize.
     *
     * This function:
     * 1. Checks if the prize is in the correct state for claiming.
     * 2. Aggregates the rewards from all of the caller's unclaimed contributions.
     * 3. Marks each processed contribution as claimed.
     * 4. Stores the total encrypted reward for the contestant.
     * 5. Emits an event to signal the reward claim.
     */
    function computeContestantClaimReward(uint256 prizeId) external {
        emit DebugEvent("Entering computeContestantClaimReward");
        require(LibPrize.isState(prizeId, LibPrize.State.Claiming), "Invalid state");

        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];

        require(prize.rewardsAllocated, "Rewards have not been allocated yet");

        uint256[] storage contributionIds = prize.contributionIdsByContestant[msg.sender];
        require(contributionIds.length > 0, "No contributions found");

        euint32 eTotalReward = FHE.asEuint32(0);
        for (uint256 i = 0; i < contributionIds.length; i++) {
            emit DebugEventUint("Processing contribution ID:", contributionIds[i]);
            Contribution storage contribution = prize.contributionsById[contributionIds[i]];

            require(contribution.contestant == msg.sender, "Contribution does not belong to caller");
            if (!contribution.claimed) {
                emit DebugEvent("Adding reward to total");
                eTotalReward = FHE.add(eTotalReward, contribution.reward);
                contribution.claimed = true;
                prize.claimedRewardsCount++;
            }
        }

        prize.claimedRewards[msg.sender] = eTotalReward;
        emit LibPrize.RewardClaimed(prizeId, msg.sender);
    }

    /**
     * @dev Allows a contestant to view their claimed reward for a specific prize.
     * @param prizeId The ID of the prize.
     * @param permission The permission object containing the caller's public key.
     * @return A sealed string representation of the claimed reward.
     *
     * This function:
     * 1. Checks if rewards have been allocated for the prize.
     * 2. Retrieves the encrypted claimed reward for the caller.
     * 3. Seals the output using FHE, allowing only the caller to decrypt it.
     */
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

    /**
     * @dev Checks if all rewards for a prize have been claimed.
     * @param prizeId The ID of the prize.
     * @return A boolean indicating whether all rewards have been claimed.
     *
     * This function:
     * 1. Compares the number of claimed rewards to the total number of contributions.
     * 2. Returns true if they are equal, indicating all rewards have been claimed.
     */
    function areAllRewardsClaimed(uint256 prizeId) external view returns (bool) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        return prize.claimedRewardsCount == prize.contributionCount;
    }
}

// Define the debug events outside the function
event DebugEvent(string message);
event DebugEventUint(string message, uint256 value);
