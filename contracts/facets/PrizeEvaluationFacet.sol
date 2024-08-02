// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../interfaces/IPrizeCore.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

contract PrizeEvaluationFacet is AccessControlEnumerable {
    bytes32 public constant EVALUATOR_ROLE = keccak256("EVALUATOR");

    event ScoresAssigned(address indexed evaluator, address[] contestants);

    modifier onlyInState(IPrizeCore.State _state) {
        require(LibAppStorage.diamondStorage().state == _state, "Invalid state");
        _;
    }

    function assignScores(
        address[] memory contestants,
        inEuint32[][] memory encryptedScores
    ) external onlyRole(EVALUATOR_ROLE) onlyInState(IPrizeCore.State.Evaluating) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(contestants.length == encryptedScores.length, "Mismatch in input arrays");
        require(contestants.length <= LibAppStorage.MAX_BATCH_SIZE, "Batch size exceeds maximum");

        for (uint256 i = 0; i < contestants.length; i++) {
            require(s.contributions[contestants[i]].contestant != address(0), "Invalid contestant");
            require(encryptedScores[i].length == s.criteriaWeights.length, "Invalid number of scores");
            require(
                !s.evaluatorContestantScored[msg.sender][contestants[i]],
                "Contestant already scored by this evaluator"
            );

            euint32 weightedScore = calculateWeightedScore(encryptedScores[i], s.criteriaWeights);

            s.contributions[contestants[i]].aggregatedScore = FHE.add(
                s.contributions[contestants[i]].aggregatedScore,
                weightedScore
            );
            s.contributions[contestants[i]].evaluationCount++;
            s.evaluatorContestantScored[msg.sender][contestants[i]] = true;
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
