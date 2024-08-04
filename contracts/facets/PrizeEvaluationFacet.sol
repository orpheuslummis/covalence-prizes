// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@fhenixprotocol/contracts/FHE.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibACL.sol";
import "../libraries/LibPrize.sol";

contract PrizeEvaluationFacet {
    function assignScores(
        uint256 prizeId,
        address[] memory contestants,
        inEuint32[][] memory encryptedScores
    ) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Evaluating), "Invalid state");
        require(LibACL.isPrizeEvaluator(prizeId, msg.sender), "Caller is not an evaluator for this prize");
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        require(
            contestants.length == encryptedScores.length && contestants.length <= LibAppStorage.MAX_BATCH_SIZE,
            "Invalid input"
        );

        uint256[] memory scoreCounts = new uint256[](contestants.length);
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

            scoreCounts[i] = encryptedScores[i].length;
        }

        emit LibPrize.ScoresAssigned(prizeId, msg.sender, contestants, scoreCounts);
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

    function isEvaluator(uint256 prizeId, address _account) external view returns (bool) {
        return LibACL.isPrizeEvaluator(prizeId, _account);
    }

    function assignCriteriaWeights(uint256 prizeId, uint32[] calldata weights) external {
        require(LibPrize.isState(prizeId, LibPrize.State.Setup), "Invalid state");
        require(LibACL.isPrizeOrganizer(prizeId, msg.sender), "Caller is not the prize organizer");
        AppStorage storage s = LibAppStorage.diamondStorage();
        Prize storage prize = s.prizes[prizeId];
        require(weights.length == prize.criteriaNames.length, "Mismatch in number of weights");

        uint32 totalWeight = 0;
        for (uint256 i = 0; i < weights.length; i++) {
            totalWeight += weights[i];
        }
        require(totalWeight == 100, "Sum of weights must equal 100");

        prize.criteriaWeights = weights;
        emit LibPrize.CriteriaWeightsAssigned(prizeId, weights);
    }
}
