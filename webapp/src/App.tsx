import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { Toaster } from "react-hot-toast";
import { Outlet, RouterProvider, createHashRouter } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { wagmiConfig } from "./config";
import { AppProvider } from "./contexts/AppContext";
import { WalletProvider } from "./contexts/WalletContext";
import About from "./pages/About";
import ContributionPage from "./pages/Contribution";
import CreatePrizePage from "./pages/CreatePrize";
import Evaluator from "./pages/Evaluator";
import Home from "./pages/Home";
import ManagePage from "./pages/Manage";
import NotFound from "./pages/NotFound";
import PrizePage from "./pages/Prize";
import SubmitContribution from "./pages/SubmitContribution";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const RootLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-20 mx-auto ">
        <Outlet />
      </main>
      <Footer />
      <Toaster position="top-center" />
    </div>
  );
};

const router = createHashRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "create-prize", element: <CreatePrizePage /> },
      { path: "prize/:prizeId", element: <PrizePage /> },
      { path: "prize/:prizeId/contribution/:id", element: <ContributionPage /> },
      { path: "prize/:prizeId/evaluator", element: <Evaluator /> },
      { path: "prize/:prizeId/manage", element: <ManagePage /> },
      { path: "prize/:prizeId/submit", element: <SubmitContribution /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const App: React.FC = () => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <AppProvider>
            <RouterProvider router={router} />
          </AppProvider>
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;
