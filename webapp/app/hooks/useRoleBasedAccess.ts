import { useAppContext } from '../AppContext';

export function useRoleBasedAccess() {
    const { role } = useAppContext();

    return {
        canCreatePrize: role === 'organizer',
        canAssignScores: role === 'evaluator',
        canSubmitContribution: role === 'contestant',
        canClaimReward: role === 'contestant',
        canViewAllPrizes: true,
        canViewOwnContributions: role === 'contestant',
        canViewAssignedPrizes: role === 'evaluator',
    };
}