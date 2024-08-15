import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const AnimatedParticles = dynamic(() => import('./AnimatedParticles'), { ssr: false });

export default function Hero() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center text-center min-h-screen py-20 px-4 sm:px-6 lg:px-8">
            <AnimatedParticles />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 max-w-5xl"
            >
                <motion.h1
                    className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-8 text-white tracking-tight"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                >
                    Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-primary-100">Covalence Prizes</span>
                </motion.h1>
                <motion.p
                    className="text-xl sm:text-2xl md:text-3xl mb-12 text-primary-100 font-light max-w-3xl mx-auto leading-relaxed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                >
                    Revolutionizing scientific collaboration through blockchain technology
                </motion.p>
                <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(255,255,255,0.3)" }}
                    whileTap={{ scale: 0.95 }}
                    className="button-primary text-lg md:text-xl py-4 px-8 rounded-full bg-gradient-to-r from-primary-500 to-primary-400 text-white font-semibold transition-all duration-300 ease-in-out"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                >
                    Get Started
                </motion.button>
            </motion.div>
        </section>
    );
}