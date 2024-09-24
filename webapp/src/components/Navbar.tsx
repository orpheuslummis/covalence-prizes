import { Link } from "react-router-dom";
import { ConnectKitButton } from "connectkit";
import { useWalletContext } from "../contexts/WalletContext";
import { useState, useEffect } from "react";
import { FaInfoCircle } from "react-icons/fa";
import toast from "react-hot-toast";

const Navbar: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { account, isLoading } = useWalletContext();
  const isConnected = account.isConnected;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <nav className="fixed w-full z-50 bg-gradient-to-r from-purple-900 to-indigo-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl sm:text-3xl font-bold text-white hover:text-purple-200 transition duration-300"
          >
            Covalence Prizes
          </Link>
          <div className="flex items-center space-x-6">
            <Link
              to={isConnected ? "/create-prize" : "#"}
              className={`text-lg font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors duration-300 px-4 py-2 rounded-full ${
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
            <Link to="/about" className="text-white hover:text-purple-200 transition duration-300 flex items-center">
              <FaInfoCircle className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">About</span>
            </Link>
            <ConnectKitButton />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
