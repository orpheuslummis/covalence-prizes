import { Link, useLocation } from "react-router-dom";
import { ConnectKitButton } from "connectkit";
import { useWalletContext } from "../contexts/WalletContext";
import { useState, useEffect } from "react";
import { FaInfoCircle } from "react-icons/fa";

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const location = useLocation();
  const { account, isLoading } = useWalletContext();
  const isConnected = account.isConnected;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <nav className="fixed w-full z-50 bg-purple-950 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl sm:text-3xl font-bold text-white hover:text-purple-200 transition duration-300">
            Covalence Prizes
          </Link>
          <div className="flex items-center space-x-4">
            <Link
              to={isConnected ? "/create-prize" : "#"}
              className={`text-lg font-semibold text-white bg-purple-700 hover:bg-purple-600 transition-colors duration-300 px-4 py-2 rounded-full ${
                !isConnected || isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={(e) => {
                if (!isConnected || isLoading) {
                  e.preventDefault();
                  alert("Please connect your wallet to create a prize.");
                }
              }}
            >
              {isLoading ? "Connecting..." : "Create a Prize"}
            </Link>
            <Link to="/about" className="text-white hover:text-purple-200 transition duration-300" aria-label="About">
              <FaInfoCircle className="w-6 h-6" />
              <span className="sr-only">About</span>
            </Link>
            <ConnectKitButton />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
