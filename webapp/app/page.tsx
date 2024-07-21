'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useAppContext } from './AppContext';

export default function Home() {
  const context = useAppContext();
  const isConnected = context?.web3?.isConnected ?? false;
  const address = context?.web3?.address ?? '';
  const role = context?.role;

  useEffect(() => {
    if (!isConnected && context?.setRole) {
      context.setRole(null);
    }
  }, [isConnected, context?.setRole]);

  const handleRoleSelect = (selectedRole: 'organizer' | 'evaluator' | 'contestant') => {
    context?.setRole(selectedRole);
  };

  const handleGetStarted = async () => {
    if (!isConnected) {
      try {
        await context?.web3?.connect();
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else if (!role) {
      const roleSection = document.getElementById('role-selection');
      if (roleSection) {
        roleSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="flex flex-col justify-between min-h-full">
      <section className="bg-gradient-to-br from-purple-700 to-indigo-800 rounded-2xl p-8 shadow-lg mb-12">
        <h1 className="text-4xl font-bold mb-4 text-purple-100">
          Revolutionizing Prize Management
        </h1>
        <p className="mb-8 text-xl text-purple-200 leading-relaxed">
          Covalence Prizes: Empowering innovation through decentralized, privacy-preserving prize management.
        </p>
        <button
          onClick={handleGetStarted}
          className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-6 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
        >
          {isConnected ? 'Get Started' : 'Connect Wallet'}
        </button>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-purple-100">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            "Decentralized prize management",
            "Privacy-preserving evaluations",
            "Flexible reward mechanisms",
            "Community-driven criteria selection",
            "Transparent and immutable records",
            "Global accessibility"
          ].map((feature, index) => (
            <div key={index} className="flex items-center space-x-2 bg-purple-800 bg-opacity-50 rounded-lg p-4">
              <svg className="w-5 h-5 text-pink-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-purple-100">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-purple-100">How It Works</h2>
        <div className="bg-purple-800 bg-opacity-50 rounded-lg p-6">
          <ol className="list-decimal list-inside text-purple-100">
            <li className="mb-2">Connect your wallet to get started</li>
            <li className="mb-2">Choose your role: Organizer, Evaluator, or Contestant</li>
            <li className="mb-2">Create or participate in prizes</li>
            <li>Enjoy a transparent and fair prize management process</li>
          </ol>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-purple-100">Success Stories</h2>
        <div className="bg-purple-800 bg-opacity-50 rounded-lg p-6">
          <p className="text-purple-100 italic">
            "Covalence Prizes has revolutionized how we manage our innovation challenges. The platform's transparency and privacy features have significantly increased participation and trust in our prize programs."
          </p>
          <p className="text-purple-200 mt-2">- John Doe, Innovation Manager at TechCorp</p>
        </div>
      </section>

      {isConnected && (
        <section id="role-selection" className="mt-8">
          <p className="text-center text-sm text-purple-200 mb-4">
            Connected: {address}
          </p>
          <div>
            <h3 className="text-2xl font-semibold mb-4 text-center text-purple-100">
              {role ? 'Current Role:' : 'Choose Your Role:'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['organizer', 'evaluator', 'contestant'].map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleSelect(r as 'organizer' | 'evaluator' | 'contestant')}
                  className={`py-3 px-6 ${role === r
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                    } text-white rounded-full transition duration-300 ease-in-out transform hover:scale-105`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {role && (
            <div className="mt-8 text-center">
              <Link href="/dashboard" className="inline-block py-3 px-8 bg-pink-500 hover:bg-pink-600 text-white rounded-full transition duration-300 ease-in-out transform hover:scale-105">
                Go to Dashboard
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}