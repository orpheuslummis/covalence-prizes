'use client';

import React, { Suspense } from 'react';
import { useAppContext } from '../AppContext';
import ContestantDashboard from './ContestantDashboard';
import EvaluatorDashboard from './EvaluatorDashboard';
import OrganizerDashboard from './OrganizerDashboard';

const DashboardContent: React.FC = () => {
    const { role, web3 } = useAppContext();

    if (!web3 || !web3.isConnected) {
        return <div>Please connect your wallet to view the dashboard.</div>;
    }

    if (!role) {
        return <div>Please select a role to view the dashboard.</div>;
    }

    return (
        <Suspense fallback={<div>Loading dashboard...</div>}>
            {role === 'organizer' && <OrganizerDashboard />}
            {role === 'evaluator' && <EvaluatorDashboard />}
            {role === 'contestant' && <ContestantDashboard />}
            {!['organizer', 'evaluator', 'contestant'].includes(role) && <div>Invalid role selected.</div>}
        </Suspense>
    );
};

export default DashboardContent;