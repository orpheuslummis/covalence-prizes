// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../interfaces/IPrizeCore.sol";
import "../facets/PrizeACLFacet.sol";

contract PrizeEvaluationFacet {
    event ScoresAssigned(address indexed evaluator, address[] contestants);

    modifier onlyInState(IPrizeCore.State _state) {
        require(LibAppStorage.diamondStorage().state == _state, "Invalid state");
        _;
    }

    modifier onlyRole(bytes32 role) {
        require(PrizeACLFacet(address(this)).hasRole(role, msg.sender), "Caller does not have the required role");
        _;
    }

    function assignScores(
        address[] memory contestants,
        inEuint32[][] memory encryptedScores
    ) external onlyRole(PrizeACLFacet(address(this)).EVALUATOR_ROLE()) onlyInState(IPrizeCore.State.Evaluating) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(
            contestants.length == encryptedScores.length && contestants.length <= LibAppStorage.MAX_BATCH_SIZE,
            "Invalid input"
        );

        for (uint256 i = 0; i < contestants.length; i++) {
            address contestant = contestants[i];
            require(s.contributions[contestant].contestant != address(0), "Invalid contestant");
            require(encryptedScores[i].length == s.currentPrize.criteriaWeights.length, "Invalid number of scores");
            require(
                !s.evaluatorContestantScored[msg.sender][contestant],
                "Contestant already scored by this evaluator"
            );

            euint32 weightedScore = calculateWeightedScore(encryptedScores[i], s.currentPrize.criteriaWeights);

            Contribution storage contribution = s.contributions[contestant];
            contribution.aggregatedScore = FHE.add(contribution.aggregatedScore, weightedScore);
            contribution.evaluationCount++;
            s.evaluatorContestantScored[msg.sender][contestant] = true;
        }

        emit ScoresAssigned(msg.sender, contestants);
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

    function getEvaluationCount(address contestant) external view returns (uint256) {
        return LibAppStorage.diamondStorage().contributions[contestant].evaluationCount;
    }

    function hasEvaluatorScoredContestant(address evaluator, address contestant) external view returns (bool) {
        return LibAppStorage.diamondStorage().evaluatorContestantScored[evaluator][contestant];
    }
}
