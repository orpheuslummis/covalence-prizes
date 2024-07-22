'use client';

import React from 'react';
import { useAppContext } from '../AppContext';
import Layout from './Layout';
import OrganizePrize from './OrganizePrize';

const OrganizePrizeContent: React.FC = () => {
    const { web3 } = useAppContext();

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <OrganizePrize />
            </div>
        </Layout>
    );
};

export default OrganizePrizeContent;