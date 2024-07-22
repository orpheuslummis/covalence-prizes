'use client';

import { motion } from 'framer-motion';
import { useAppContext } from '../AppContext';
import Community from './Community';
import Features from './Features';
import Footer from './Footer';
import Hero from './Hero';
import Layout from './Layout';
import UserRoles from './UserRoles';

export default function HomeContent() {
    const context = useAppContext();
    const isConnected = context?.web3?.isConnected || false;

    return (
        <Layout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col min-h-screen bg-gradient-to-b from-purple-950 to-purple-800"
            >
                <main className="flex-grow">
                    <Hero />
                    <Features />
                    <UserRoles />
                    <Community />
                </main>
                <Footer />
            </motion.div>
        </Layout>
    );
}