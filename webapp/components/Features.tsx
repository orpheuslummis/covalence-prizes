import { motion } from 'framer-motion';
import { FaChartLine, FaHandshake, FaLightbulb, FaShieldAlt } from 'react-icons/fa';

const features = [
    { icon: FaLightbulb, title: 'Innovative Research', description: 'Foster groundbreaking scientific discoveries' },
    { icon: FaHandshake, title: 'Collaboration', description: 'Connect with researchers worldwide' },
    { icon: FaChartLine, title: 'Transparent Funding', description: 'Track and manage research funding efficiently' },
    { icon: FaShieldAlt, title: 'Secure Platform', description: 'Protect your intellectual property with blockchain' },
];

export default function Features() {
    return (
        <section className="section-padding bg-primary-800">
            <div className="container mx-auto">
                <h2 className="section-title">Key Features</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-primary-700 rounded-lg p-8 shadow-lg transition duration-300 hover:shadow-xl flex flex-col items-center h-full"
                        >
                            <feature.icon className="text-6xl mb-6 text-primary-200" />
                            <h3 className="text-2xl font-semibold mb-4 text-white text-center">{feature.title}</h3>
                            <p className="text-lg text-primary-100 text-center">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}