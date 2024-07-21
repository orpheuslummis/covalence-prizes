import Link from 'next/link';
import { useAppContext } from '../AppContext';
import ConnectWallet from './ConnectWallet';

const Navbar: React.FC = () => {
    const { web3, role } = useAppContext();
    const isConnected = web3?.isConnected;

    return (
        <nav className="bg-purple-900 text-white p-4">
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/" className="text-2xl font-bold">
                    Covalence Prizes
                </Link>
                <div className="flex items-center space-x-4">
                    <Link href="/" className="hover:text-purple-200">Home</Link>
                    {isConnected && role && (
                        <Link href="/dashboard" className="hover:text-purple-200">Dashboard</Link>
                    )}
                    <ConnectWallet />
                </div>
            </div>
        </nav>
    );
};

export default Navbar;