import React from 'react';
import { usePrizeManager } from '../hooks/usePrizeManager';
import PrizeList from './PrizeList';

const OrganizerDashboard: React.FC = () => {
    const { prizes } = usePrizeManager();

    return (
        <div>
            <h2>Organizer Dashboard</h2>
            <PrizeList prizes={prizes} showActions={true} />
            {/* Add more organizer-specific components here */}
        </div>
    );
};

export default OrganizerDashboard;