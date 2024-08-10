// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibPrize.sol";
import "../libraries/LibACL.sol";
import "../libraries/LibAllocationStrategies.sol";

contract PrizeRewardFacet {
    // should be via batches, to prevent overload
    function allocateRewards(uint256 prizeId) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Allocating), "Invalid state");
        require(LibACL.isPrizeOrganizer(prizeId, msg.sender), "Only prize organizer can allocate rewards");

        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];

        require(!prize.rewardsAllocated, "Rewards have already been allocated");

        address[] memory contestants = prize.contributionAddressList;
        require(contestants.length > 0, "No contestants to allocate rewards");

        prize.rewardsAllocated = true;

        euint32[] memory scores = new euint32[](contestants.length);
        for (uint256 i = 0; i < contestants.length; i++) {
            Contribution storage contribution = prize.contributions[contestants[i]][
                prize.contributions[contestants[i]].length - 1
            ];
            scores[i] = FHE.asEuint32(contribution.aggregatedScore);
            emit Debug("Score set", i, FHE.decrypt(scores[i]));
        }

        euint32[] memory rewardFractions = LibAllocationStrategies.computeAllocation(scores, prize.allocationStrategy);
        emit Debug("Allocation computed", rewardFractions.length);

        euint32 totalPrizePool = FHE.asEuint32(prize.monetaryRewardPool);
        for (uint256 i = 0; i < contestants.length; i++) {
            euint32 reward = FHE.mul(rewardFractions[i], totalPrizePool);
            prize.contributions[contestants[i]][prize.contributions[contestants[i]].length - 1].reward = reward;
            emit Debug("Reward set", i, FHE.decrypt(reward));
        }

        emit LibPrize.RewardsAllocated(prizeId, contestants.length);
    }

    function claimReward(uint256 prizeId) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Claiming), "Invalid state");
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        require(prize.rewardsAllocated, "Rewards have not been allocated yet");
        require(prize.contributions[msg.sender].length > 0, "No contributions found");
        Contribution storage contribution = prize.contributions[msg.sender][prize.contributions[msg.sender].length - 1];
        require(!contribution.claimed, "Reward already claimed");

        uint256 rewardAmount = FHE.decrypt(contribution.reward);
        require(rewardAmount > 0, "No reward to claim");
        require(address(this).balance >= rewardAmount, "Insufficient contract balance");

        contribution.claimed = true;
        prize.claimedRewardsCount++;
        prize.contributionClaimed[msg.sender] = true;

        (bool success, ) = payable(msg.sender).call{value: rewardAmount}("");
        require(success, "Transfer failed");

        emit LibPrize.RewardClaimed(prizeId, msg.sender, rewardAmount);
    }

    // for testing
    function getContributionReward(uint256 prizeId, address contestant) external view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        require(prize.contributions[contestant].length > 0, "No contributions found");
        Contribution storage contribution = prize.contributions[contestant][prize.contributions[contestant].length - 1];
        return FHE.decrypt(contribution.reward);
    }

    function getPrizeInfo(uint256 prizeId) external view returns (uint256 totalPrizePool, uint256 contestantCount) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        return (prize.monetaryRewardPool, prize.contributionAddressList.length);
    }

    event Debug(string message, uint256 index, uint256 value);
    event Debug(string message, uint256 value);
}
