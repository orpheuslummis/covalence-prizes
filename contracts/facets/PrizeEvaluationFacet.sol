// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../interfaces/IPrizeCore.sol";
import "../facets/PrizeACLFacet.sol";

contract PrizeEvaluationFacet {
    event ScoresAssigned(uint256 indexed prizeId, address indexed evaluator, address[] contestants);

    modifier onlyInState(uint256 prizeId, IPrizeCore.State _state) {
        require(LibAppStorage.diamondStorage().prizes[prizeId].state == _state, "Invalid state");
        _;
    }

    modifier onlyRole(bytes32 role) {
        require(PrizeACLFacet(address(this)).hasRole(role, msg.sender), "Caller does not have the required role");
        _;
    }

    function assignScores(
        uint256 prizeId,
        address[] memory contestants,
        inEuint32[][] memory encryptedScores
    )
        external
        onlyRole(PrizeACLFacet(address(this)).EVALUATOR_ROLE())
        onlyInState(prizeId, IPrizeCore.State.Evaluating)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        PrizeInfo storage prize = s.prizes[prizeId];
        require(
            contestants.length == encryptedScores.length && contestants.length <= LibAppStorage.MAX_BATCH_SIZE,
            "Invalid input"
        );

        for (uint256 i = 0; i < contestants.length; i++) {
            address contestant = contestants[i];
            require(prize.contributions[contestant].contestant != address(0), "Invalid contestant");
            require(encryptedScores[i].length == prize.criteriaWeights.length, "Invalid number of scores");
            require(
                !prize.evaluatorContestantScored[msg.sender][contestant],
                "Contestant already scored by this evaluator"
            );

            euint32 weightedScore = calculateWeightedScore(encryptedScores[i], prize.criteriaWeights);

            Contribution storage contribution = prize.contributions[contestant];
            contribution.aggregatedScore = FHE.add(contribution.aggregatedScore, weightedScore);
            contribution.evaluationCount++;
            prize.evaluatorContestantScored[msg.sender][contestant] = true;
        }

        emit ScoresAssigned(prizeId, msg.sender, contestants);
    }

    function calculateWeightedScore(
        inEuint32[] memory scores,
        uint32[] storage weights
    ) internal view returns (euint32) {
        euint32 weightedScore = FHE.asEuint32(0);
        for (uint256 j = 0; j < scores.length; j++) {
            weightedScore = FHE.add(weightedScore, FHE.mul(FHE.asEuint32(scores[j]), FHE.asEuint32(weights[j])));
        }
        return weightedScore;
    }

    function getEvaluationCount(uint256 prizeId, address contestant) external view returns (uint256) {
        return LibAppStorage.diamondStorage().prizes[prizeId].contributions[contestant].evaluationCount;
    }

    function hasEvaluatorScoredContestant(
        uint256 prizeId,
        address evaluator,
        address contestant
    ) external view returns (bool) {
        return LibAppStorage.diamondStorage().prizes[prizeId].evaluatorContestantScored[evaluator][contestant];
    }
}
