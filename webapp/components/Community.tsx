import { motion } from 'framer-motion';
import React from 'react';

const Community: React.FC = () => {
    return (
        <section className="py-16 bg-purple-600">
            <div className="container mx-auto text-center px-4">
                <motion.h2
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-3xl font-bold mb-8 text-white"
                >
                    Join the Covalence Prizes Community
                </motion.h2>
                <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                    <motion.a
                        href="https://github.com/your-repo"
                        className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-full inline-block"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Contribute on GitHub
                    </motion.a>
                    <motion.a
                        href="#"
                        className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-8 rounded-full inline-block"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Get Involved
                    </motion.a>
                </div>
            </div>
        </section>
    );
};

export default Community;