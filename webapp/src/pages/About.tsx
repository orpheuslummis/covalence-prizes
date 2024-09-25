import React from "react";

const About: React.FC = () => {
  return (
    <div className="container-default max-w-3xl text-white bg-neutral-900/70 p-8 rounded-lg shadow-lg">
      <h1 className="text-4xl font-bold mb-8">About</h1>

      <section className="mb-10">
        <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
        <p className="text-lg leading-relaxed">
          Covalence Prizes is a decentralized platform that's changing how prizes are created, managed, and awarded. We
          use advanced smart contracts to ensure privacy, fair decision-making, and transparency in prize management.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-3xl font-bold mb-4">Key Features</h2>
        <ul className="list-disc list-inside text-lg leading-relaxed space-y-2 pl-6">
          <li>Community-driven prize management</li>
          <li>Privacy protection with smart contracts</li>
          <li>Flexible rewards (money and non-money prizes)</li>
          <li>Easy-to-use web interface for everyone</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-3xl font-bold mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 p-6 rounded-lg shadow-md"> {/* Added styling to cards */}
            <h3 className="text-2xl font-semibold mb-3 text-accent-400">Organizers</h3> {/* Changed color */}
            <p className="text-lg leading-relaxed">
              Create prizes, set rules, choose judges and participants, and oversee the entire process
            </p>
          </div>
          <div className="bg-white/10 p-6 rounded-lg shadow-md">
            <h3 className="text-2xl font-semibold mb-3 text-accent-400">Evaluators</h3>
            <p className="text-lg leading-relaxed">
              Vote on criteria, review submissions, and score them based on agreed-upon standards
            </p>
          </div>
          <div className="bg-white/10 p-6 rounded-lg shadow-md">
            <h3 className="text-2xl font-semibold mb-3 text-accent-400">Participants</h3>
            <p className="text-lg leading-relaxed">See prize details, submit their work, and track their entries</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-3xl font-bold mb-4">Use Cases</h2>
        <p className="text-lg leading-relaxed mb-4">
          Covalence Prizes can be used for many different purposes, such as:
        </p>
        <ul className="list-disc list-inside text-lg leading-relaxed space-y-2 pl-6">
          <li>Unconference Prizes for events like AI Safety meetups</li>
          <li>Carbon Ecosystem Prizes to encourage new ideas in sustainability</li>
          <li>Innovation challenges across various industries</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-3xl font-bold mb-4">Get Involved</h2>
        <p className="text-lg leading-relaxed mb-6">
          We're always looking for developers, content creators, and enthusiasts to join us. Help us shape the future of
          prize management!
        </p>
        <a
          href="mailto:team@covalence.info"
          className="bg-accent-500 hover:bg-accent-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300" // Added Tailwind styling
        >
          Contact Us
        </a>
      </section>
    </div>
  );
};

export default About;
