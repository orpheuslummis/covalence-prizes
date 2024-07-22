'use client';

import React, { useEffect, useState } from 'react';
import { AppProvider } from '../AppContextProvider';

const ClientWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return null; // or a loading indicator
    }

    return <AppProvider>{children}</AppProvider>;
};

export default ClientWrapper;