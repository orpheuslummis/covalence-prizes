'use client';

import React from 'react';
import Layout from '../../components/Layout';
import PrizeList from '../../components/PrizeList';
import { usePrizeManager } from '../../hooks/usePrizeManager';
import { PrizeStatus } from '../../types';

const PrizesPage: React.FC = () => {
    const { prizes } = usePrizeManager();

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Active Prizes</h1>
                <PrizeList prizes={prizes.filter(p => p.state === PrizeStatus.Open)} />
            </div>
        </Layout>
    );
};

export default PrizesPage;