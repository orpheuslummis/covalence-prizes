import React from "react";
import { Link } from "react-router-dom";
import { FaGithub, FaTwitter, FaEnvelope } from "react-icons/fa";

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-primary-600 to-primary-700 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-between items-center">
          <div className="w-full md:w-auto mb-4 md:mb-0">
            <h3 className="text-xl font-bold text-white">Covalence Prizes</h3>
            <p className="text-sm mt-1 text-primary-200">Revolutionizing collaboration</p> {/* Consider changing text-purple-200 to a Tailwind color */}
          </div>
          <nav className="w-full md:w-auto mb-4 md:mb-0">
            <ul className="flex flex-wrap justify-center md:justify-end space-x-6">
              <li>
                <Link to="/" className="hover:text-accent-300 transition duration-300 text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-accent-300 transition duration-300 text-white">
                  About
                </Link>
              </li>
              <li>
                <a href="mailto:team@covalence.info" className="hover:text-accent-300 transition duration-300 text-white">
                  Contact
                </a>
              </li>
            </ul>
          </nav>
          <div className="w-full md:w-auto flex justify-center md:justify-end space-x-6">
            <a
              href="https://github.com/orpheuslummis/covalence-prizes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xl hover:text-accent-300 transition duration-300 text-white"
            >
              <FaGithub />
            </a>
            <a
              href="https://www.covalence.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xl hover:text-accent-300 transition duration-300 text-white"
            >
              <FaTwitter />
            </a>
            <a href="mailto:team@covalence.info" className="text-2xl hover:text-accent-300 transition duration-300 text-white">
              <FaEnvelope />
            </a>
          </div>
        </div>
        <div className="mt-8 text-center text-sm text-neutral-400"> {/* Changed to text-neutral-400 */}
          &copy; {currentYear} Covalence Prizes. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
