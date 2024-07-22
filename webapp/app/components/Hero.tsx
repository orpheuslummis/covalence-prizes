import { motion } from 'framer-motion';

export default function Hero() {
    return (
        <section className="relative bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center text-center min-h-[70vh] py-16">
            <div className="absolute inset-0 bg-black opacity-50"></div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 max-w-4xl"
            >
                <h1 className="section-title">Welcome to Covalence Prizes</h1>
                <p className="text-2xl md:text-3xl mb-12 text-primary-100 font-light max-w-3xl mx-auto">Revolutionizing scientific collaboration through blockchain technology</p>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="button-primary"
                >
                    Get Started
                </motion.button>
            </motion.div>
        </section>
    );
}