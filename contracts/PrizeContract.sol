// SPDX-License-Identifier: MIT
pragma solidity >=0.8.13 <0.9.0;

import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "@fhenixprotocol/contracts/FHE.sol";
import {Permissioned, Permission} from "@fhenixprotocol/contracts/access/Permissioned.sol";
import {IAllocationStrategy} from "./IAllocationStrategy.sol";

contract PrizeContract is AccessControlEnumerable, Permissioned {
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
        Closed
    }

    bytes32 public constant EVALUATOR_ROLE = keccak256("EVALUATOR");
    bytes32 public constant CONTESTANT_ROLE = keccak256("CONTESTANT");

    address public organizer;
    string public name;
    string public description;
    uint256 public monetaryRewardPool;
    State public state;
    string[] public criteriaNames;
    uint32[] public criteriaWeights;
    mapping(address => Contribution) public contributions;
    address[] public contributionList;
    mapping(address => mapping(address => bool)) private evaluatorContestantScored;
    uint256 public createdAt;

    IAllocationStrategy public strategy;
    uint256 public constant MAX_BATCH_SIZE = 100; // TBD

    event StateChanged(State oldState, State newState);
    event ContributionAdded(address contestant, string description);
    event ScoresAssigned(address[] contestants);
    event RewardAllocated(address contestant);
    event EvaluatorAdded(address evaluator);
    event PrizeFunded(address funder);
    event RewardClaimed(address contestant);
    event CriteriaWeightsAssigned();
    event PrizeInitialized(address organizer, string name, string description, uint256 rewardPool, address strategy);

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
    ) {
        organizer = _organizer;
        name = _name;
        description = _description;
        monetaryRewardPool = _totalRewardPool;
        strategy = IAllocationStrategy(_strategy);
        criteriaNames = _criteriaNames;
        state = State.Setup;
        _grantRole(DEFAULT_ADMIN_ROLE, organizer);
        _grantRole(EVALUATOR_ROLE, organizer);

        criteriaWeights = new uint32[](_criteriaNames.length);
        for (uint256 i = 0; i < _criteriaNames.length; i++) {
            criteriaWeights[i] = 0;
        }

        createdAt = block.timestamp;

        emit PrizeInitialized(_organizer, _name, _description, _totalRewardPool, _strategy);
    }

    function addEvaluators(address[] memory _evaluators) public onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < _evaluators.length; i++) {
            grantRole(EVALUATOR_ROLE, _evaluators[i]);
            emit EvaluatorAdded(_evaluators[i]);
        }
    }

    function assignCriteriaWeights(uint32[] calldata weights) public onlyRole(DEFAULT_ADMIN_ROLE) inState(State.Setup) {
        require(weights.length == criteriaNames.length, "Mismatch in number of weights");

        for (uint256 i = 0; i < weights.length; i++) {
            criteriaWeights[i] = weights[i];
        }

        emit CriteriaWeightsAssigned();
    }

    function fundPrize() public payable onlyRole(DEFAULT_ADMIN_ROLE) {
        require(msg.value == monetaryRewardPool, "Must send exact prize amount");
        require(state == State.Setup, "Can only fund during setup");

        monetaryRewardPool = msg.value;
        state = State.Open;
        emit PrizeFunded(msg.sender);
        emit StateChanged(State.Setup, State.Open);
    }

    function submitContribution(string memory _description) public onlyRole(CONTESTANT_ROLE) inState(State.Open) {
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
    ) public onlyRole(EVALUATOR_ROLE) inState(State.Evaluating) {
        require(contestants.length == encryptedScores.length, "Mismatch in input arrays");
        require(contestants.length <= MAX_BATCH_SIZE, "Batch size exceeds maximum");

        for (uint256 i = 0; i < contestants.length; i++) {
            require(contributions[contestants[i]].contestant != address(0), "Invalid contestant");
            require(encryptedScores[i].length == criteriaWeights.length, "Invalid number of scores");
            require(
                !evaluatorContestantScored[msg.sender][contestants[i]],
                "Contestant already scored by this evaluator"
            );

            euint32 weightedScore = calculateWeightedScore(encryptedScores[i], criteriaWeights);

            contributions[contestants[i]].aggregatedScore = FHE.add(
                contributions[contestants[i]].aggregatedScore,
                weightedScore
            );
            contributions[contestants[i]].evaluationCount++;
            evaluatorContestantScored[msg.sender][contestants[i]] = true;
        }

        emit ScoresAssigned(contestants);
    }

    function calculateWeightedScore(
        inEuint32[] calldata scores,
        uint32[] storage weights
    ) internal view returns (euint32) {
        euint32 weightedScore = FHE.asEuint32(0);
        for (uint256 j = 0; j < scores.length; j++) {
            weightedScore = FHE.add(weightedScore, FHE.mul(FHE.asEuint32(scores[j]), FHE.asEuint32(weights[j])));
        }
        return weightedScore;
    }

    function allocateRewards() public onlyRole(DEFAULT_ADMIN_ROLE) inState(State.Rewarding) {
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
    }

    function moveToNextState() public onlyRole(DEFAULT_ADMIN_ROLE) {
        State newState;

        if (state == State.Setup) {
            newState = State.Open;
        } else if (state == State.Open) {
            newState = State.Evaluating;
        } else if (state == State.Evaluating) {
            // require(allContestantsScored(), "Not all contestants have been scored");
            newState = State.Rewarding;
        } else if (state == State.Rewarding) {
            // require(allRewardsAllocated(), "Not all rewards have been allocated");
            newState = State.Closed;
        } else {
            revert("Cannot move to next state");
        }

        State oldState = state;
        state = newState;
        emit StateChanged(oldState, newState);
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
