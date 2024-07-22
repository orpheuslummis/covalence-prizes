import { useAppContext } from '../AppContext';

export function useRoleBasedAccess() {
    const { role } = useAppContext();

    const isOrganizer = role === 'organizer';
    const isEvaluator = role === 'evaluator';
    const isContestant = role === 'contestant';

    return {
        canCreatePrize: isOrganizer,
        canAddEvaluators: isOrganizer,
        canAssignCriteriaWeights: isOrganizer,
        canMoveToNextState: isOrganizer,
        canAssignScores: isEvaluator,
        canSubmitContribution: isContestant,
        canClaimReward: isContestant,
        canViewAllPrizes: true,
        canViewOwnContributions: isContestant,
        canViewAssignedPrizes: isEvaluator,
        canFundPrize: isOrganizer,
        canAllocateRewards: isOrganizer,
    };
}