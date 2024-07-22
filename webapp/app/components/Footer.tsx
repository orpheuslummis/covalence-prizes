import Link from 'next/link';
import { FaDiscord, FaGithub, FaTwitter } from 'react-icons/fa';

const Footer: React.FC = () => {
    return (
        <footer className="bg-primary-900 text-white py-12">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h3 className="text-xl font-bold mb-4">Covalence Prizes</h3>
                        <p className="text-sm">Revolutionizing scientific collaboration through blockchain technology</p>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2">
                            <li><Link href="/" className="hover:text-primary-300 transition-colors">Home</Link></li>
                            <li><Link href="/dashboard" className="hover:text-primary-300 transition-colors">Dashboard</Link></li>
                            <li><Link href="/prizes" className="hover:text-primary-300 transition-colors">Prizes</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold mb-4">Connect</h4>
                        <div className="flex space-x-4">
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-primary-300 transition-colors"><FaGithub /></a>
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-primary-300 transition-colors"><FaTwitter /></a>
                            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-primary-300 transition-colors"><FaDiscord /></a>
                        </div>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-primary-700 text-center">
                    <p className="text-sm">&copy; 2024 Covalence Prizes. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;