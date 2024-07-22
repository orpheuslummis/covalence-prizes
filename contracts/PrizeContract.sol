// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@fhenixprotocol/contracts/FHE.sol";
import {Permissioned, Permission} from "@fhenixprotocol/contracts/access/Permissioned.sol";
import {IAllocationStrategy} from "./IAllocationStrategy.sol";

contract PrizeContract is AccessControl, Permissioned {
    struct Contribution {
        address contestant;
        string description;
        euint32 aggregatedScore;
        uint256 evaluationCount;
        euint32 reward;
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
    string public name;
    string public description;
    uint256 public monetaryRewardPool;
    State public state;
    address[] public evaluators;
    string[] public criteriaNames;
    uint32[] public criteriaWeights;
    mapping(address => bool) private hasSubmittedWeights;
    mapping(address => Contribution) public contributions;
    address[] public contributionList;
    mapping(address => mapping(address => bool)) private evaluatorContestantScored;

    IAllocationStrategy public strategy;
    uint256 public constant MAX_BATCH_SIZE = 100; // TBD

    event StateChanged(State oldState, State newState);
    event ContributionAdded(address contestant, string description);
    event ScoresAssigned(address[] contestants);
    event RewardAllocated(address contestant);
    event EvaluatorAdded(address evaluator);
    event PrizeFunded(address funder);
    event PrizeCancelled();
    event RewardClaimed(address contestant);
    event StrategyUpdated(address newStrategy);
    event CriteriaWeightsAssigned();
    event PrizeInitialized(address organizer, string name, string description, uint256 rewardPool, address strategy);
    event ContestantScored(address evaluator, address contestant);
    event RewardsCalculationStarted(uint256 contestantCount);
    event RewardsCalculationCompleted();

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
        string memory _name,
        string memory _description,
        uint256 _totalRewardPool,
        address _strategy,
        string[] memory _criteriaNames
    ) payable {
        organizer = _organizer;
        name = _name;
        description = _description;
        monetaryRewardPool = _totalRewardPool;
        strategy = IAllocationStrategy(_strategy);
        criteriaNames = _criteriaNames;
        state = State.Setup;
        _grantRole(DEFAULT_ADMIN_ROLE, organizer);

        criteriaWeights = new uint32[](_criteriaNames.length);
        for (uint256 i = 0; i < _criteriaNames.length; i++) {
            criteriaWeights[i] = 0;
        }

        emit PrizeInitialized(_organizer, _name, _description, _totalRewardPool, _strategy);
    }

    function addEvaluators(address[] memory _evaluators) public onlyOrganizer {
        for (uint256 i = 0; i < _evaluators.length; i++) {
            _grantRole(EVALUATOR_ROLE, _evaluators[i]);
            evaluators.push(_evaluators[i]);
            emit EvaluatorAdded(_evaluators[i]);
        }
    }

    function assignCriteriaWeights(uint32[] calldata weights) public onlyOrganizer inState(State.Setup) {
        require(weights.length == criteriaNames.length, "Mismatch in number of weights");

        for (uint256 i = 0; i < weights.length; i++) {
            criteriaWeights[i] = weights[i];
        }

        emit CriteriaWeightsAssigned();
    }

    function fundPrize() public payable onlyOrganizer {
        require(msg.value == monetaryRewardPool, "Must send exact prize amount");
        require(state == State.Setup, "Can only fund during setup");

        monetaryRewardPool = msg.value;
        state = State.Open;
        emit PrizeFunded(msg.sender);
    }

    function submitContribution(string memory _description) public inState(State.Open) {
        require(contributions[msg.sender].contestant == address(0), "Only one contribution per contestant permitted");
        contributions[msg.sender] = Contribution({
            contestant: msg.sender,
            description: _description,
            aggregatedScore: FHE.asEuint32(0),
            reward: FHE.asEuint32(0),
            evaluationCount: 0,
            claimed: false
        });
        contributionList.push(msg.sender);
        emit ContributionAdded(msg.sender, _description);
    }

    function assignScores(
        address[] calldata contestants,
        inEuint32[][] calldata encryptedScores
    ) public onlyEvaluator inState(State.Evaluating) {
        require(contestants.length == encryptedScores.length, "Mismatch in input arrays");
        require(contestants.length <= MAX_BATCH_SIZE, "Batch size exceeds maximum");

        for (uint256 i = 0; i < contestants.length; i++) {
            require(contributions[contestants[i]].contestant != address(0), "Invalid contestant");
            require(encryptedScores[i].length == criteriaNames.length, "Invalid number of scores");
            require(
                !evaluatorContestantScored[msg.sender][contestants[i]],
                "Contestant already scored by this evaluator"
            );

            euint32 weightedScore = FHE.asEuint32(0);
            for (uint256 j = 0; j < encryptedScores[i].length; j++) {
                weightedScore = FHE.add(
                    weightedScore,
                    FHE.mul(FHE.asEuint32(encryptedScores[i][j]), FHE.asEuint32(criteriaWeights[j]))
                );
            }

            contributions[contestants[i]].aggregatedScore = FHE.add(
                contributions[contestants[i]].aggregatedScore,
                weightedScore
            );
            contributions[contestants[i]].evaluationCount++;
            evaluatorContestantScored[msg.sender][contestants[i]] = true;

            emit ContestantScored(msg.sender, contestants[i]);
        }

        emit ScoresAssigned(contestants);
    }

    function allocateRewards() public onlyOrganizer inState(State.Rewarding) {
        emit RewardsCalculationStarted(contributionList.length);

        address[] memory contestantsBatch = new address[](contributionList.length);
        euint32[] memory scoresBatch = new euint32[](contributionList.length);
        uint256[] memory evaluationCounts = new uint256[](contributionList.length);

        for (uint256 i = 0; i < contributionList.length; i++) {
            address contestant = contributionList[i];
            contestantsBatch[i] = contestant;
            scoresBatch[i] = contributions[contestant].aggregatedScore;
            evaluationCounts[i] = contributions[contestant].evaluationCount;
        }

        euint32[] memory rewardsBatch = strategy.allocateRewards(contestantsBatch, scoresBatch, evaluationCounts);

        for (uint256 i = 0; i < contestantsBatch.length; i++) {
            contributions[contestantsBatch[i]].reward = rewardsBatch[i];
            emit RewardAllocated(contestantsBatch[i]);
        }

        emit RewardsCalculationCompleted();
    }

    function cancelPrize() public onlyOrganizer {
        require(state != State.Closed, "Prize already closed");
        state = State.Cancelled;
        emit PrizeCancelled();
        emit StateChanged(State.Cancelled, state);
    }

    function moveToNextState() public onlyOrganizer {
        State newState;

        if (state == State.Setup) {
            newState = State.Open;
        } else if (state == State.Open) {
            newState = State.Evaluating;
        } else if (state == State.Evaluating) {
            require(allContestantsScored(), "Not all contestants have been scored");
            newState = State.Rewarding;
        } else if (state == State.Rewarding) {
            require(allRewardsAllocated(), "Not all rewards have been allocated");
            newState = State.Closed;
        } else {
            revert("Cannot move to next state");
        }

        State oldState = state;
        state = newState;
        emit StateChanged(oldState, newState);
    }

    function allRewardsAllocated() internal view returns (bool) {
        for (uint256 i = 0; i < contributionList.length; i++) {
            ebool hasReward = FHE.gt(contributions[contributionList[i]].reward, FHE.asEuint32(0));
            if (!FHE.decrypt(hasReward)) {
                return false;
            }
        }
        return true;
    }

    function allContestantsScored() internal view returns (bool) {
        for (uint256 i = 0; i < contributionList.length; i++) {
            if (contributions[contributionList[i]].evaluationCount == 0) {
                return false;
            }
        }
        return true;
    }

    function getContestantCount() public view returns (uint256) {
        return contributionList.length;
    }

    function getEvaluatorCount() public view returns (uint256) {
        return evaluators.length;
    }

    function getCurrentState() public view returns (State) {
        return state;
    }

    function claimReward() public inState(State.Closed) {
        Contribution storage contribution = contributions[msg.sender];
        require(contribution.contestant != address(0), "No contribution submitted");
        require(!contribution.claimed, "Reward already claimed");

        euint32 encryptedReward = contribution.reward;
        uint256 decryptedReward = uint256(FHE.decrypt(encryptedReward));
        require(decryptedReward > 0, "No reward to claim");

        contribution.reward = FHE.asEuint32(0);
        contribution.claimed = true;
        payable(msg.sender).transfer(decryptedReward);

        emit RewardClaimed(msg.sender);
    }
}
