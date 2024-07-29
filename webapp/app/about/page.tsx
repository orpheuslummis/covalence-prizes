import Link from 'next/link';
import React from 'react';

const AboutPage: React.FC = () => {
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl text-white">
            <h1 className="text-4xl font-bold mb-8 text-purple-300">About</h1>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-purple-200">Our Mission</h2>
                <p className="text-lg leading-relaxed">
                    Covalence Prizes is a decentralized platform that's changing how prizes are created, managed, and awarded.
                    We use advanced smart contracts to ensure privacy, fair decision-making, and transparency in prize management.
                </p>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-purple-200">Key Features</h2>
                <ul className="list-disc list-inside text-lg space-y-2">
                    <li>Community-driven prize management</li>
                    <li>Privacy protection with smart contracts</li>
                    <li>Flexible rewards (money and non-money prizes)</li>
                    <li>Easy-to-use web interface for everyone</li>
                </ul>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-purple-200">How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-purple-800 p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold mb-3 text-purple-200">Organizers</h3>
                        <p className="leading-relaxed">Create prizes, set rules, choose judges and participants, and oversee the entire process</p>
                    </div>
                    <div className="bg-purple-800 p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold mb-3 text-purple-200">Evaluators</h3>
                        <p className="leading-relaxed">Vote on criteria, review submissions, and score them based on agreed-upon standards</p>
                    </div>
                    <div className="bg-purple-800 p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold mb-3 text-purple-200">Participants</h3>
                        <p className="leading-relaxed">See prize details, submit their work, and track their entries</p>
                    </div>
                </div>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-purple-200">Use Cases</h2>
                <p className="text-lg mb-4 leading-relaxed">
                    Covalence Prizes can be used for many different purposes, such as:
                </p>
                <ul className="list-disc list-inside text-lg space-y-2">
                    <li>Unconference Prizes for events like AI Safety meetups</li>
                    <li>Carbon Ecosystem Prizes to encourage new ideas in sustainability</li>
                    <li>Innovation challenges across various industries</li>
                </ul>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-purple-200">Get Involved</h2>
                <p className="text-lg mb-6 leading-relaxed">
                    We're always looking for developers, content creators, and enthusiasts to join us.
                    Help us shape the future of prize management!
                </p>
                <Link href="/contact" className="inline-block bg-purple-300 hover:bg-purple-400 text-purple-900 font-bold py-3 px-6 rounded-lg transition duration-300">
                    Contact Us
                </Link>
            </section>
        </div>
    );
};

export default AboutPage;