import React from "react";
import { Link } from "react-router-dom";
import { FaGithub, FaTwitter, FaEnvelope } from "react-icons/fa";

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-between items-center">
          <div className="w-full md:w-auto mb-4 md:mb-0">
            <h3 className="text-xl font-bold">Covalence Prizes</h3>
            <p className="text-sm mt-1 text-purple-200">Revolutionizing collaboration</p>
          </div>
          <nav className="w-full md:w-auto mb-4 md:mb-0">
            <ul className="flex flex-wrap justify-center md:justify-end space-x-6">
              <li>
                <Link to="/" className="hover:text-purple-300 transition duration-300">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-purple-300 transition duration-300">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-purple-300 transition duration-300">
                  Contact
                </Link>
              </li>
            </ul>
          </nav>
          <div className="w-full md:w-auto flex justify-center md:justify-end space-x-6">
            <a
              href="https://github.com/orpheuslummis/covalence-prizes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xl hover:text-purple-300 transition duration-300"
            >
              <FaGithub />
            </a>
            <a
              href="https://www.covalence.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xl hover:text-purple-300 transition duration-300"
            >
              <FaTwitter />
            </a>
            <a href="mailto:team@covalence.info" className="text-2xl hover:text-purple-300 transition duration-300">
              <FaEnvelope />
            </a>
          </div>
        </div>
        <div className="mt-8 text-center text-sm text-purple-200">
          &copy; {currentYear} Covalence Prizes. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
