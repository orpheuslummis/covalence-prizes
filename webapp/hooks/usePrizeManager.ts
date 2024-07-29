import { Address, parseEther } from 'viem';
import { Prize, PrizeStatus, RawPrizeData } from '../app/types';
import { config } from '../config';
import { useContractInteraction } from './useContractInteraction';

export const usePrizeManager = () => {
    const { readContract, writeContract, createQuery, createMutation, watchContractEvent, isLoading } = useContractInteraction();

    const formatPrize = (rawPrize: RawPrizeData): Prize => ({
        id: rawPrize.addr,
        prizeAddress: rawPrize.addr,
        name: rawPrize.name,
        description: rawPrize.description,
        pool: BigInt(rawPrize.pool),
        status: rawPrize.status as PrizeStatus,
        allocationStrategy: rawPrize.allocationStrategy,
        criteriaNames: rawPrize.criteriaNames,
        createdAt: new Date(Number(rawPrize.createdAt) * 1000),
        organizer: rawPrize.organizer,
    });

    const getAllPrizesQuery = createQuery<{ prizes: Prize[], totalCount: number }, Error>(
        ['prizes'],
        async () => {
            const prizeCount = await readContract<bigint>(config.contracts.PrizeManager, 'getPrizeCount');
            const prizes: Prize[] = [];
            for (let i = 0; i < Number(prizeCount); i++) {
                const prizeDetails = await readContract<RawPrizeData>(config.contracts.PrizeManager, 'getPrizeDetails', [BigInt(i)]);
                prizes.push(formatPrize(prizeDetails));
            }
            return { prizes, totalCount: Number(prizeCount) };
        }
    );

    const getPrizeQuery = (prizeAddress: string) => createQuery(
        ['prize', prizeAddress],
        async () => {
            const prizeCount = await readContract<bigint>(config.contracts.PrizeManager, 'getPrizeCount');
            for (let i = 0; i < Number(prizeCount); i++) {
                const prizeDetails = await readContract<RawPrizeData>(config.contracts.PrizeManager, 'getPrizeDetails', [BigInt(i)]);
                if (prizeDetails.addr.toLowerCase() === prizeAddress.toLowerCase()) {
                    return formatPrize(prizeDetails);
                }
            }
            return null;
        },
        { enabled: !!prizeAddress }
    );

    const createPrizeMutation = createMutation<{
        name: string;
        description: string;
        totalRewardPool: string;
        allocationStrategy: string;
        criteriaNames: string[];
    }, void>(
        async ({ name, description, totalRewardPool, allocationStrategy, criteriaNames }) => {
            const parsedRewardPool = parseEther(totalRewardPool);
            await writeContract(config.contracts.PrizeManager, 'createPrize', [{
                name,
                desc: description,
                pool: parsedRewardPool,
                strategy: allocationStrategy,
                criteria: criteriaNames
            }]);
        },
        "Failed to create prize",
        ['prizes']
    );

    const updateStrategyMutation = createMutation<{ strategyName: string; strategyAddress: Address }, void>(
        async ({ strategyName, strategyAddress }) => {
            await writeContract(config.contracts.PrizeManager, 'updateStrategy', [strategyName, strategyAddress]);
        },
        "Failed to update strategy",
        ['prizes']
    );

    const listenForPrizeEvents = () => {
        const unwatchPrizeCreated = watchContractEvent(
            config.contracts.PrizeManager,
            'PrizeCreated',
            () => getAllPrizesQuery.refetch()
        );

        const unwatchStrategyUpdated = watchContractEvent(
            config.contracts.PrizeManager,
            'StrategyUpdated',
            () => getAllPrizesQuery.refetch()
        );

        return () => {
            unwatchPrizeCreated();
            unwatchStrategyUpdated();
        };
    };

    const getOwnerQuery = createQuery<Address, Error>(
        ['prizeManagerOwner'],
        async () => readContract<Address>(config.contracts.PrizeManager, 'owner')
    );

    return {
        prizes: getAllPrizesQuery.data?.prizes || [],
        createPrize: createPrizeMutation.mutate,
        updateStrategy: updateStrategyMutation.mutate,
        getPrizes: getAllPrizesQuery.refetch,
        getPrize: getPrizeQuery,
        listenForPrizeEvents,
        isLoading: getAllPrizesQuery.isLoading || isLoading,
        getOwner: getOwnerQuery.data,
    };
};