import { useAppContext } from '../app/AppContext';
import { Role } from '../app/types';

export const useRoleBasedAccess = () => {
    const { userRoles } = useAppContext();

    console.log('Current userRoles:', userRoles); // Add this line for debugging

    const hasRole = (role: Role) => {
        const result = userRoles?.has(role) ?? false;
        console.log(`Checking role ${role}:`, result); // Add this line for debugging
        return result;
    };

    return {
        canCreatePrize: () => hasRole('organizer'),
        canEvaluate: (_prizeAddress?: string) => hasRole('evaluator'),
        canSubmit: () => hasRole('contestant'),
        canManagePrize: (_prizeAddress?: string) => hasRole('organizer'),
    };
};