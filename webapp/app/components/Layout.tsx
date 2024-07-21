import React from 'react';
import Navbar from './Navbar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-8 flex flex-col">
                {children}
            </main>
            <footer className="bg-purple-800 text-white py-2 text-center text-sm mt-auto">
                <p>&copy; 2024 Covalence Prizes. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Layout;