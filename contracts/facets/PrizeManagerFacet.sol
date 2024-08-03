// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibAppStorage.sol";
import "../interfaces/IAllocationStrategy.sol";
import "../interfaces/IPrizeManager.sol";
import "../interfaces/IPrizeCore.sol";
import "../libraries/LibDiamond.sol";
import "./PrizeACLFacet.sol";

contract PrizeManagerFacet is IPrizeManager {
    bytes32 public constant PRIZE_MANAGER_ROLE = keccak256("PRIZE_MANAGER_ROLE");

    modifier onlyRole(bytes32 role) {
        require(PrizeACLFacet(address(this)).hasRole(role, msg.sender), "Caller does not have the required role");
        _;
    }

    function updateStrategy(string memory strategyName, address strategyAddress) external onlyRole(PRIZE_MANAGER_ROLE) {
        require(strategyAddress != address(0), "Invalid strategy address");
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.strategy = IAllocationStrategy(strategyAddress);
        emit StrategyUpdated(strategyName, strategyAddress);
    }

    function createPrize(PrizeParams memory params) external returns (address) {
        validatePrizeParams(params);
        AppStorage storage s = LibAppStorage.diamondStorage();

        uint256 prizeIndex = s.prizeCount++;
        address prizeAddr = address(this);

        s.prizes[prizeIndex] = PrizeInfo({
            organizer: msg.sender,
            name: params.name,
            description: params.description,
            monetaryRewardPool: params.pool,
            state: IPrizeCore.State.Setup,
            criteriaNames: params.criteria,
            criteriaWeights: new uint32[](params.criteria.length),
            createdAt: block.timestamp,
            strategy: IAllocationStrategy(address(0))
        });

        emit PrizeCreated(msg.sender, prizeAddr, params.name, params.pool, prizeIndex);
        return prizeAddr;
    }

    function validatePrizeParams(PrizeParams memory params) internal pure {
        require(params.pool > 0, "Invalid pool amount");
        require(bytes(params.name).length > 0, "Name cannot be empty");
        require(bytes(params.description).length > 0, "Description cannot be empty");
        require(params.criteria.length > 0, "At least one criterion is required");
    }

    function getPrizeDetails(address prizeAddr) external view returns (PrizeDetails memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(prizeAddr == address(this), "Invalid prize address");

        PrizeInfo storage prize = s.prizes[s.prizeCount - 1]; // Get the latest prize

        return
            PrizeDetails({
                addr: prizeAddr,
                name: prize.name,
                description: prize.description,
                pool: prize.monetaryRewardPool,
                status: prize.state,
                allocationStrategy: address(prize.strategy),
                criteriaNames: prize.criteriaNames,
                createdAt: prize.createdAt,
                organizer: prize.organizer
            });
    }

    function getPrizeCount() external view returns (uint256) {
        return LibAppStorage.diamondStorage().prizeCount;
    }

    function getPrizes() external view returns (PrizeDetails[] memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        PrizeDetails[] memory prizeDetails = new PrizeDetails[](s.prizeCount);
        for (uint256 i = 0; i < s.prizeCount; i++) {
            PrizeInfo storage prize = s.prizes[i];
            prizeDetails[i] = PrizeDetails({
                addr: address(this),
                name: prize.name,
                description: prize.description,
                pool: prize.monetaryRewardPool,
                status: prize.state,
                allocationStrategy: address(s.strategy),
                criteriaNames: s.criteriaNames,
                createdAt: s.createdAt,
                organizer: prize.organizer
            });
        }
        return prizeDetails;
    }

    function setPrizeContracts(
        address prizeAddr,
        address contributionContract,
        address evaluationContract,
        address rewardContract
    ) external onlyRole(PRIZE_MANAGER_ROLE) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        s.prizeContributionContract = contributionContract;
        s.prizeEvaluationContract = evaluationContract;
        s.prizeRewardContract = rewardContract;
        emit PrizeContractsSet(prizeAddr, contributionContract, evaluationContract, rewardContract);
    }
}
