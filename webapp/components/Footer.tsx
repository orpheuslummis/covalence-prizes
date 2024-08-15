import Link from 'next/link';
import { FaDiscord, FaGithub, FaTwitter } from 'react-icons/fa';

const Footer: React.FC = () => {
    const socialLinks = [
        { icon: FaGithub, href: "https://github.com/covalence-prizes", label: "GitHub" },
        { icon: FaTwitter, href: "https://twitter.com/covalenceprizes", label: "Twitter" },
        { icon: FaDiscord, href: "https://discord.gg/covalenceprizes", label: "Discord" },
    ];

    const quickLinks = [
        { href: "/", label: "Home" },
        { href: "/prizes", label: "Prizes" },
        { href: "/about", label: "About" },
        { href: "/contact", label: "Contact" },
    ];

    return (
        <footer className="bg-gradient-to-r from-primary-900 to-primary-800 text-white py-12">
            <div className="container mx-auto px-4">
                <div className="flex flex-wrap justify-between items-center">
                    <div className="w-full md:w-1/3 mb-8 md:mb-0">
                        <h3 className="text-2xl font-bold mb-4">Covalence Prizes</h3>
                        <p className="text-sm mb-4">Revolutionizing collaboration</p>
                        <div className="flex space-x-4">
                            {socialLinks.map((link, index) => (
                                <a
                                    key={index}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-2xl hover:text-primary-300 transition-colors"
                                >
                                    <link.icon />
                                    <span className="sr-only">{link.label}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                    <div className="w-full md:w-1/3 mb-8 md:mb-0">
                        <h4 className="text-xl font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2">
                            {quickLinks.map((link, index) => (
                                <li key={index}>
                                    <Link href={link.href} className="hover:text-primary-300 transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="w-full md:w-1/3">
                        <h4 className="text-xl font-semibold mb-4">Stay Updated</h4>
                        <form className="flex">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="flex-grow p-2 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-300 bg-primary-700 text-white"
                            />
                            <button
                                type="submit"
                                className="bg-secondary-500 hover:bg-secondary-600 text-white font-bold py-2 px-4 rounded-r-md transition duration-300"
                            >
                                Subscribe
                            </button>
                        </form>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-primary-700 text-center">
                    <p className="text-sm">&copy; {new Date().getFullYear()} Covalence. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;