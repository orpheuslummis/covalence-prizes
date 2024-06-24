// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@fhenixprotocol/contracts/FHE.sol";
import {Permissioned, Permission} from "@fhenixprotocol/contracts/access/Permissioned.sol";
import {IAllocationStrategy} from "./interfaces/IAllocationStrategy.sol";

contract PrizeContract is AccessControl {
  struct Contribution {
    address contestant;
    string description;
    uint256[] scores;
    uint256 reward;
    bool claimed;
  }

  enum State {
    Setup,
    Open,
    Evaluating,
    Rewarding,
    Closed,
    Cancelled
  }

  bytes32 public constant EVALUATOR_ROLE = keccak256("EVALUATOR_ROLE");

  address public organizer;
  string public description;
  uint256 public monetaryRewardPool;
  State public state;
  string[] public criteriaNames;
  uint256[] public criteriaWeights;
  address[] public evaluators;
  mapping(address => Contribution) public contributions;
  address[] public contributionList;

  IAllocationStrategy public strategy;
  uint256 public constant MAX_BATCH_SIZE = 100;

  event StateChanged(State oldState, State newState);
  event ContributionAdded(address contestant, string description);
  event ScoresAssigned(address[] contestants);
  event RewardAllocated(address contestant, uint256 reward);
  event EvaluatorAdded(address evaluator);
  event PrizeFunded(address funder, uint256 amount);
  event PrizeCancelled();
  event RewardClaimed(address contestant, uint256 amount);

  modifier onlyOrganizer() {
    require(msg.sender == organizer, "Not authorized");
    _;
  }

  modifier onlyEvaluator() {
    require(hasRole(EVALUATOR_ROLE, msg.sender), "Not an evaluator");
    _;
  }

  modifier inState(State _state) {
    require(state == _state, "Invalid state");
    _;
  }

  constructor(
    address _organizer,
    string memory _description,
    uint256 _totalRewardPool,
    address _strategy,
    string[] memory _criteriaNames,
    uint256[] memory _criteriaWeights
  ) {
    require(
      _criteriaNames.length == _criteriaWeights.length,
      "Mismatching lengths"
    );

    organizer = _organizer;
    description = _description;
    monetaryRewardPool = _totalRewardPool;
    strategy = IAllocationStrategy(_strategy);
    criteriaNames = _criteriaNames;
    criteriaWeights = _criteriaWeights;
    state = State.Setup;
    _grantRole(DEFAULT_ADMIN_ROLE, organizer);
  }

  function addEvaluators(
    address[] memory evaluatorsToAdd
  ) public onlyOrganizer inState(State.Setup) {
    require(
      evaluatorsToAdd.length <= MAX_BATCH_SIZE,
      "Batch size exceeds maximum"
    );
    for (uint256 i = 0; i < evaluatorsToAdd.length; i++) {
      require(
        !hasRole(EVALUATOR_ROLE, evaluatorsToAdd[i]),
        "Evaluator already exists"
      );
      grantRole(EVALUATOR_ROLE, evaluatorsToAdd[i]);
      evaluators.push(evaluatorsToAdd[i]);
      emit EvaluatorAdded(evaluatorsToAdd[i]);
    }
  }

  function fundPrize() public payable onlyOrganizer inState(State.Setup) {
    require(
      msg.value == monetaryRewardPool,
      "Sent amount must equal total reward pool"
    );
    emit PrizeFunded(msg.sender, msg.value);
  }

  function submitContribution(
    string memory _description
  ) public inState(State.Open) {
    require(
      contributions[msg.sender].contestant == address(0),
      "Only one contribution per contestant permitted"
    );
    Contribution storage newContribution = contributions[msg.sender];
    newContribution.contestant = msg.sender;
    newContribution.description = _description;
    contributionList.push(msg.sender);
    emit ContributionAdded(msg.sender, _description);
  }

  function assignScores(
    address[] calldata contestants,
    uint256[][] calldata scores
  ) public onlyEvaluator inState(State.Evaluating) {
    require(contestants.length == scores.length, "Mismatch in input arrays");
    require(contestants.length <= MAX_BATCH_SIZE, "Batch size exceeds maximum");

    for (uint256 i = 0; i < contestants.length; i++) {
      require(
        contributions[contestants[i]].contestant != address(0),
        "Invalid contestant"
      );
      require(
        scores[i].length == criteriaNames.length,
        "Invalid number of scores"
      );

      Contribution storage contribution = contributions[contestants[i]];
      contribution.scores = scores[i];
    }

    emit ScoresAssigned(contestants);
  }

  function computeScoresAndAllocateRewards(
    uint256 startIndex,
    uint256 batchSize
  ) public onlyOrganizer inState(State.Rewarding) {
    require(batchSize <= MAX_BATCH_SIZE, "Batch size exceeds maximum");
    uint256 endIndex = startIndex + batchSize;
    if (endIndex > contributionList.length) {
      endIndex = contributionList.length;
    }

    address[] memory contestantsBatch = new address[](endIndex - startIndex);
    uint256[] memory scoresBatch = new uint256[](endIndex - startIndex);

    for (uint256 i = startIndex; i < endIndex; i++) {
      address contestant = contributionList[i];
      contestantsBatch[i - startIndex] = contestant;
      // Calculate weighted sum of scores
      uint256 weightedScore = 0;
      for (uint256 j = 0; j < criteriaWeights.length; j++) {
        weightedScore +=
          contributions[contestant].scores[j] *
          criteriaWeights[j];
      }
      scoresBatch[i - startIndex] = weightedScore;
    }

    // Calculate the portion of the reward pool for this batch
    uint256 batchRewardPool = (monetaryRewardPool * (endIndex - startIndex)) /
      contributionList.length;

    uint256[] memory rewardsBatch = strategy.computeAndAllocate(
      contestantsBatch,
      batchRewardPool,
      scoresBatch
    );

    for (uint256 i = startIndex; i < endIndex; i++) {
      contributions[contributionList[i]].reward = rewardsBatch[i - startIndex];
      emit RewardAllocated(contributionList[i], rewardsBatch[i - startIndex]);
    }
  }

  function claimReward() public inState(State.Closed) {
    Contribution storage contribution = contributions[msg.sender];
    require(contribution.contestant != address(0), "No contribution found");
    require(!contribution.claimed, "Reward already claimed");
    require(contribution.reward > 0, "No reward available");
    require(
      address(this).balance >= contribution.reward,
      "Insufficient contract balance"
    );

    contribution.claimed = true;
    uint256 reward = contribution.reward;
    contribution.reward = 0;

    (bool success, ) = msg.sender.call{value: reward}("");
    require(success, "Transfer failed");

    emit RewardClaimed(msg.sender, reward);
  }

  function cancelPrize() public onlyOrganizer {
    require(
      state != State.Closed && state != State.Cancelled,
      "Prize already closed or cancelled"
    );
    changeState(State.Cancelled);
    emit PrizeCancelled();
  }

  function withdrawFunds() public onlyOrganizer inState(State.Cancelled) {
    uint256 balance = address(this).balance;
    require(balance > 0, "No funds to withdraw");
    (bool success, ) = organizer.call{value: balance}("");
    require(success, "Transfer failed");
  }

  function moveToNextState() public onlyOrganizer {
    require(uint(state) < uint(State.Closed), "Cannot move to next state");
    if (state == State.Setup) {
      require(
        address(this).balance >= monetaryRewardPool,
        "Contract not fully funded"
      );
    }
    if (state == State.Evaluating) {
      require(
        allContestantsScored(),
        "All contestants must be scored before moving to Rewarding"
      );
    }
    if (state == State.Rewarding) {
      require(
        allRewardsAllocated(),
        "All rewards must be allocated before closing"
      );
    }
    changeState(State(uint(state) + 1));
  }

  function allRewardsAllocated() internal view returns (bool) {
    for (uint256 i = 0; i < contributionList.length; i++) {
      if (contributions[contributionList[i]].reward == 0) {
        return false;
      }
    }
    return true;
  }

  function allContestantsScored() internal view returns (bool) {
    for (uint256 i = 0; i < contributionList.length; i++) {
      if (contributions[contributionList[i]].scores.length == 0) {
        return false;
      }
    }
    return true;
  }

  function changeState(State newState) private {
    State oldState = state;
    state = newState;
    emit StateChanged(oldState, newState);
  }
}
