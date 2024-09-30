import { Link } from "react-router-dom";
import { ConnectKitButton } from "connectkit";
import { useWalletContext } from "../contexts/WalletContext";
import { useState, useEffect } from "react";
import { FaInfoCircle, FaBars, FaTimes } from "react-icons/fa";
import toast from "react-hot-toast";
import React from "react";

const Navbar: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isConnected, isLoading } = useWalletContext();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <nav className="fixed w-full z-50 bg-gradient-to-r from-primary-600 to-primary-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-white hover:text-accent-300 transition duration-300">
            Covalence Prizes
          </Link>
          <div className="hidden md:flex items-center space-x-4">
            <NavLinks isConnected={isConnected} isLoading={isLoading} />
          </div>
          <button className="md:hidden text-white focus:outline-none" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <div className="md:hidden bg-primary-700 py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col space-y-2">
            <NavLinks isConnected={isConnected} isLoading={isLoading} />
          </div>
        </div>
      )}
    </nav>
  );
};

const NavLinks: React.FC<{ isConnected: boolean; isLoading: boolean }> = ({ isConnected, isLoading }) => (
  <>
    <Link
      to={isConnected ? "/create-prize" : "#"}
      className={`block md:inline-block px-4 py-2 text-sm font-medium rounded-md text-white bg-accent-500 hover:bg-accent-600 transition duration-300 ${
        !isConnected || isLoading ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={(e) => {
        if (!isConnected || isLoading) {
          e.preventDefault();
          toast.error("Please connect your wallet to create a prize.");
        }
      }}
    >
      {isLoading ? "Connecting..." : "Create a Prize"}
    </Link>
    <Link
      to="/about"
      className="block md:inline-block px-4 py-2 text-sm font-medium text-white hover:text-accent-300 transition duration-300"
    >
      <FaInfoCircle className="inline-block w-4 h-4 mr-1" />
      <span>About</span>
    </Link>
    <div className="mt-2 md:mt-0">
      <ConnectKitButton />
    </div>
  </>
);

export default Navbar;
