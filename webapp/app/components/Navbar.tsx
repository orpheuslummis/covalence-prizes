'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../AppContext';
import { usePrizeManager } from '../hooks/usePrizeManager';
import { useRoleBasedAccess } from '../hooks/useRoleBasedAccess';
import { Role } from '../types';

const useScrollEffect = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 0);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    return isScrolled;
};

const Navbar: React.FC = () => {
    const isScrolled = useScrollEffect();
    const { web3, role, setRole } = useAppContext();
    const isConnected = web3?.isConnected;
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const access = useRoleBasedAccess();
    const { prizes } = usePrizeManager();

    const roleIcons: Record<Exclude<Role, null>, string> = useMemo(() => ({
        organizer: '🏆',
        evaluator: '🔍',
        contestant: '🏃',
    }), []);

    const handleRoleChange = useCallback((newRole: Role) => {
        if (newRole !== role) {
            setRole(newRole);
        }
        setIsDropdownOpen(false);
    }, [role, setRole]);

    const renderNavLinks = () => (
        <>
            <Link href="/" className="nav-link">Home</Link>
            {isConnected && (
                <>
                    <Link href="/dashboard" className="nav-link">Dashboard</Link>
                    {access.canCreatePrize && (
                        <Link href="/organize-prize" className={`nav-link ${prizes && prizes.length === 0 ? 'glitter-effect' : ''}`}>Create Prize</Link>
                    )}
                    {access.canAssignScores && (
                        <Link href="/evaluate-contributions" className="nav-link">Evaluate Contributions</Link>
                    )}
                    {access.canSubmitContribution && (
                        <Link href="/my-contributions" className="nav-link">My Contributions</Link>
                    )}
                </>
            )}
        </>
    );

    const renderRoleSelector = () => (
        <div className="relative">
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 text-white hover:text-purple-200 transition duration-300"
            >
                <span className="text-2xl">{role ? roleIcons[role as keyof typeof roleIcons] : '👤'}</span>
                <span className="text-lg">{role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Select Role'}</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    {['organizer', 'evaluator', 'contestant'].map((r) => (
                        <button
                            key={r}
                            onClick={() => handleRoleChange(r as Role)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-100 transition duration-300"
                        >
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <nav className="fixed w-full z-50 bg-purple-950 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    <Link href="/" className="text-3xl font-bold text-white hover:text-purple-200 transition duration-300">
                        Covalence Prizes
                    </Link>
                    <div className="flex items-center space-x-8">
                        {renderNavLinks()}
                        {isConnected ? renderRoleSelector() : (
                            <button
                                onClick={web3.connect}
                                className="button-connect"
                            >
                                Connect Wallet
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;