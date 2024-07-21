'use client';

import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { usePrizeContract } from './hooks/usePrizeContract';
import { useWeb3 } from './hooks/useWeb3';

type UserRole = 'organizer' | 'evaluator' | 'contestant' | null;

interface Prize {
    id: number;
    name: string;
    description: string;
    amount: string;
    prizeAddress: string;
    totalRewardPool: string;
    active: boolean;
}

interface Contribution {
    // Define the properties for a Contribution here
}

interface AppError {
    message: string;
    code?: string;
    details?: any;
}

interface AppContextType {
    web3: ReturnType<typeof useWeb3>;
    prizeContract: ReturnType<typeof usePrizeContract>;
    role: UserRole;
    setRole: React.Dispatch<React.SetStateAction<UserRole>>;
    prizes: Prize[];
    setPrizes: React.Dispatch<React.SetStateAction<Prize[]>>;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    error: AppError | null;
    setError: React.Dispatch<React.SetStateAction<AppError | null>>;
    contributions: Contribution[];
    setContributions: React.Dispatch<React.SetStateAction<Contribution[]>>;
    getAllPrizes: () => Promise<void>;
    createPrize: (name: string, description: string, amount: string) => Promise<void>;
    submitContribution: (prizeId: number, contribution: string) => Promise<void>;
    assignScores: (prizeId: number, contributionIds: number[], scores: number[]) => Promise<void>;
    claimReward: (prizeId: number) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const web3 = useWeb3();
    const prizeContract = usePrizeContract(web3);
    const [role, setRole] = useState<UserRole>(() => {
        if (typeof window !== 'undefined') {
            const savedRole = localStorage.getItem('userRole');
            return savedRole as UserRole || null;
        }
        return null;
    });
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<AppError | null>(null);
    const [contributions, setContributions] = useState<Contribution[]>([]);

    const updateRole = (newRole: UserRole) => {
        setRole(newRole);
        if (typeof window !== 'undefined') {
            localStorage.setItem('userRole', newRole || '');
        }
    };

    useEffect(() => {
        if (!web3.isConnected) {
            updateRole(null);
        }
    }, [web3.isConnected]);

    const contextValue: AppContextType = {
        web3,
        prizeContract,
        role,
        setRole: updateRole,
        prizes,
        setPrizes,
        loading,
        setLoading,
        error,
        setError,
        contributions,
        setContributions,
        getAllPrizes: prizeContract.getAllPrizes,
        createPrize: prizeContract.createPrize,
        submitContribution: prizeContract.submitContribution,
        assignScores: prizeContract.assignScores,
        claimReward: prizeContract.claimReward,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};