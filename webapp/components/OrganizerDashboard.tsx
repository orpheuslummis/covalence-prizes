import React from 'react';
import { useAppContext } from '../app/AppContext';
import { usePrizeManager } from '../hooks/usePrizeManager';
import { Prize } from '../types';
import List from './List';

const OrganizerDashboard: React.FC = () => {
    const { prizes } = usePrizeManager();
    const { web3 } = useAppContext();

    if (!web3.isConnected) {
        return <div>Please connect your wallet to view the organizer dashboard.</div>;
    }

    const renderPrize = (prize: Prize) => (
        <>
            <h3 className="text-lg font-semibold">{prize.name}</h3>
            <p>{prize.description}</p>
            <p>Amount: {prize.pool} ETH</p>
            <p>State: <span className={`font-semibold ${prize.active ? 'text-green-500' : 'text-red-500'}`}>
                {prize.state}
            </span></p>
        </>
    );

    return (
        <div>
            <h2>Organizer Dashboard</h2>
            <List
                items={prizes}
                renderItem={renderPrize}
                showActions={true}
                emptyMessage="No prizes available or still loading..."
            />
        </div>
    );
};

export default OrganizerDashboard;