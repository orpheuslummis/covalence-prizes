'use client';

import { useAppContext } from '../AppContext';
import Dashboard from '../components/Dashboard';

export default function DashboardPage() {
    const context = useAppContext();

    if (!context) {
        return <div>Loading...</div>;
    }

    return <Dashboard />;
}