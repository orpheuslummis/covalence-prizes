import React, { useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { useRoleBasedAccess } from '../hooks/useRoleBasedAccess';
import AssignScores from './AssignScores';
import ClaimReward from './ClaimReward';
import CreatePrize from './CreatePrize';
import PrizeList from './PrizeList';
import SubmitContribution from './SubmitContribution';

const Dashboard: React.FC = () => {
    const { web3, role, getAllPrizes, prizes, loading, error } = useAppContext();
    const {
        canCreatePrize,
        canAssignScores,
        canSubmitContribution,
        canClaimReward,
        canViewAllPrizes,
        canViewOwnContributions,
        canViewAssignedPrizes
    } = useRoleBasedAccess();

    useEffect(() => {
        if (web3.isConnected && role) {
            getAllPrizes();
        }
    }, [web3.isConnected, role, getAllPrizes]);

    if (!web3 || !web3.isConnected) {
        return <div>Please connect your wallet to view the dashboard.</div>;
    }

    if (!role) {
        return <div>Please select a role to view the dashboard.</div>;
    }

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    return (
        <div>
            <h1>{role.charAt(0).toUpperCase() + role.slice(1)} Dashboard</h1>
            {canViewAllPrizes && <PrizeList prizes={prizes} />}
            {canCreatePrize && <CreatePrize />}
            {canAssignScores && <AssignScores />}
            {canSubmitContribution && <SubmitContribution />}
            {canClaimReward && <ClaimReward />}
            {canViewOwnContributions && <OwnContributions />}
            {canViewAssignedPrizes && <AssignedPrizes />}
        </div>
    );
};

export default Dashboard;