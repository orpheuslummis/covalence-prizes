// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../interfaces/IAllocationStrategy.sol";
import "../interfaces/IPrizeCore.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

contract PrizeRewardFacet is AccessControlEnumerable {
    event RewardsAllocated();
    event RewardClaimed(address indexed contestant, uint256 amount);

    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");

    modifier onlyInState(IPrizeCore.State _state) {
        require(LibAppStorage.diamondStorage().state == _state, "Invalid state");
        _;
    }

    modifier onlyOrganizer() {
        require(hasRole(ORGANIZER_ROLE, msg.sender), "Only organizer can perform this action");
        _;
    }

    function allocateRewards() external onlyOrganizer onlyInState(IPrizeCore.State.Rewarding) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        address[] memory contestants = s.contributionList;
        require(contestants.length > 0, "No contestants to allocate rewards");

        euint32[] memory scores = new euint32[](contestants.length);
        uint256[] memory evaluationCounts = new uint256[](contestants.length);

        for (uint256 i = 0; i < contestants.length; i++) {
            Contribution storage contribution = s.contributions[contestants[i]];
            scores[i] = contribution.aggregatedScore;
            evaluationCounts[i] = contribution.evaluationCount;
        }

        euint32[] memory rewards = s.strategy.allocateRewards(contestants, scores, evaluationCounts);

        for (uint256 i = 0; i < contestants.length; i++) {
            s.contributions[contestants[i]].reward = rewards[i];
        }

        emit RewardsAllocated();
    }

    function claimReward() external onlyInState(IPrizeCore.State.Rewarding) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Contribution storage contribution = s.contributions[msg.sender];
        require(!contribution.claimed, "Reward already claimed");

        uint256 rewardAmount = FHE.decrypt(contribution.reward);
        require(rewardAmount > 0, "No reward to claim");
        require(address(this).balance >= rewardAmount, "Insufficient contract balance");

        contribution.claimed = true;
        payable(msg.sender).transfer(rewardAmount);

        emit RewardClaimed(msg.sender, rewardAmount);
    }

    function getContributionReward(address contestant) external view returns (euint32 reward, bool claimed) {
        Contribution storage contribution = LibAppStorage.diamondStorage().contributions[contestant];
        return (contribution.reward, contribution.claimed);
    }
}
