// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibACL.sol";
import "../libraries/LibPrize.sol";

contract PrizeEvaluationFacet {
    function assignScoreForContestant(uint256 prizeId, address contestant, inEuint8[] memory encryptedScores) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Evaluating), "Invalid state");
        require(LibACL.isPrizeEvaluator(prizeId, msg.sender), "Caller is not an evaluator for this prize");
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];

        require(prize.contributions[contestant].length > 0, "Invalid contestant");
        require(encryptedScores.length == prize.criteriaWeights.length, "Invalid number of scores");
        require(
            !prize.evaluatorContestantScored[msg.sender][contestant],
            "Contestant already scored by this evaluator"
        );

        euint8 weightedScore = calculateWeightedScore(encryptedScores, prize.criteriaWeights);

        Contribution storage contribution = prize.contributions[contestant][prize.contributions[contestant].length - 1];
        contribution.aggregatedScore = FHE.add(contribution.aggregatedScore, FHE.asEuint16(weightedScore));
        contribution.evaluationCount++;
        prize.evaluatorContestantScored[msg.sender][contestant] = true;

        emit LibPrize.ScoreAssigned(prizeId, msg.sender, contestant, encryptedScores.length);
    }

    function calculateWeightedScore(inEuint8[] memory scores, uint16[] storage weights) internal view returns (euint8) {
        euint8 weightedScore = FHE.asEuint8(0);
        for (uint256 j = 0; j < scores.length; j++) {
            weightedScore = FHE.add(weightedScore, FHE.mul(FHE.asEuint8(scores[j]), FHE.asEuint8(weights[j])));
        }
        return weightedScore;
    }

    function getEvaluationCount(uint256 prizeId, address contestant) external view returns (uint16) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Contribution[] storage contributions = s.prizes[prizeId].contributions[contestant];
        if (contributions.length == 0) {
            return 0;
        }
        return contributions[contributions.length - 1].evaluationCount;
    }

    function hasEvaluatorScoredContestant(
        uint256 prizeId,
        address evaluator,
        address contestant
    ) external view returns (bool) {
        return LibAppStorage.diamondStorage().prizes[prizeId].evaluatorContestantScored[evaluator][contestant];
    }

    function addEvaluators(uint256 prizeId, address[] memory _evaluators) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Setup), "Invalid state");
        require(LibACL.isPrizeOrganizer(prizeId, msg.sender), "Caller is not the prize organizer");
        for (uint256 i = 0; i < _evaluators.length; i++) {
            LibACL.addPrizeEvaluator(prizeId, _evaluators[i]);
        }
        emit LibPrize.EvaluatorsAdded(prizeId, _evaluators);
    }

    function removeEvaluators(uint256 prizeId, address[] memory _evaluators) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Setup), "Invalid state");
        require(LibACL.isPrizeOrganizer(prizeId, msg.sender), "Caller is not the prize organizer");
        for (uint256 i = 0; i < _evaluators.length; i++) {
            LibACL.removePrizeEvaluator(prizeId, _evaluators[i]);
        }
        emit LibPrize.EvaluatorsRemoved(prizeId, _evaluators);
    }

    function assignCriteriaWeights(uint256 prizeId, uint16[] calldata weights) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Setup), "Invalid state");
        require(LibACL.isPrizeOrganizer(prizeId, msg.sender), "Caller is not the prize organizer");
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        require(weights.length == prize.criteriaNames.length, "Mismatch in number of weights");

        uint16 totalWeight = 0;
        for (uint8 i = 0; i < weights.length; i++) {
            totalWeight += weights[i];
        }
        require(totalWeight == 100, "Sum of weights must equal 100");

        prize.criteriaWeights = weights;
        emit LibPrize.CriteriaWeightsAssigned(prizeId, weights);
    }
}
