"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from "react";
import { GAME_CONTRACT_ABI, getGameContractAddress, type PlayerStats } from "@/lib/blockchain";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { sdk } from "@farcaster/miniapp-sdk";

interface User {
  address: string;
  displayName: string;
  fid?: number;
  username?: string;
}

interface AppContextType {
  user: User | null;
  isLoading: boolean;
  gameContract: unknown | null;
  isAuthenticated: boolean;
  playerStats: PlayerStats | null;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  signOut: () => void;
  refreshPlayerStats: () => Promise<void>;
  setWalletAddress: (address: string | null) => void;
  invalidateLeaderboardCache: () => void;
}

const AppContext = createContext<AppContextType>({
  user: null,
  isLoading: true,
  gameContract: null,
  isAuthenticated: false,
  playerStats: null,
  walletAddress: null,
  connectWallet: async () => {},
  signOut: () => {},
  refreshPlayerStats: async () => {},
  setWalletAddress: () => {},
  invalidateLeaderboardCache: () => {},
});

// Create a client for react-query
const queryClient = new QueryClient();

function InnerProviders({ children }: { children: ReactNode }) {
  const { address: wagmiAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const contractAddress = getGameContractAddress();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameContract] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [farcasterUser, setFarcasterUser] = useState<{
    fid: number;
    username?: string;
  } | null>(null);

  // Get player stats from blockchain using wagmi
  const { data: playerStatsData } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getPlayerStats',
    args: wagmiAddress ? [wagmiAddress] : undefined,
    query: { 
      enabled: !!contractAddress && !!wagmiAddress,
      refetchInterval: 15000, // Refresh every 15 seconds
    }
  });

  useEffect(() => {
    const initFarcaster = async () => {
      try {
        // Initialize Farcaster SDK and get context
        await sdk.actions.ready();
        const context = await sdk.context;

        if (context?.user) {
          setFarcasterUser({
            fid: context.user.fid,
            username: context.user.username || context.user.displayName,
          });
        }
      } catch (error) {
        console.log("Farcaster context not available:", error);
        // This is fine - we'll fall back to wallet-only mode
      }

      setIsLoading(false);
    };

    initFarcaster();
  }, []);

  // Sync wagmi wallet state with local state
  useEffect(() => {
    if (isConnected && wagmiAddress && wagmiAddress !== walletAddress) {
      setWalletAddress(wagmiAddress);
      console.log("Wallet connected via wagmi:", wagmiAddress);
    } else if (!isConnected && walletAddress) {
      setWalletAddress(null);
      console.log("Wallet disconnected");
    }
  }, [isConnected, wagmiAddress, walletAddress]);

  // Update player stats when blockchain data changes
  useEffect(() => {
    if (playerStatsData && wagmiAddress) {
      const [totalGames, bestScore, totalTokens] = playerStatsData as [bigint, bigint, bigint];
      
      // Convert totalTokens from wei (18 decimals) to readable format
      const tokensInEther = Number(totalTokens) / Math.pow(10, 18);
      
      console.log("📊 Provider - Player stats from blockchain:", {
        contractAddress,
        walletAddress: wagmiAddress,
        totalGames: Number(totalGames),
        bestScore: Number(bestScore), 
        totalTokensRaw: Number(totalTokens),
        totalTokensFormatted: tokensInEther,
      });
      
      setPlayerStats({
        totalGames: Number(totalGames),
        bestScore: Number(bestScore),
        totalTokens: tokensInEther, // Store the formatted value
      });
    } else {
      setPlayerStats(null);
    }
  }, [playerStatsData, wagmiAddress, contractAddress]);

  const refreshPlayerStats = useCallback(async () => {
    // This is now handled automatically by wagmi useReadContract
    console.log("📊 Provider - Player stats will auto-refresh via wagmi");
  }, []);

  // Sync authentication state with wallet address
  useEffect(() => {
    if (walletAddress) {
      // Player stats are now auto-loaded via wagmi hook

      // Set authentication state when wallet is connected via wagmi
      const displayName =
        farcasterUser?.username ||
        `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        
      setUser({
        address: walletAddress,
        displayName,
        fid: farcasterUser?.fid,
        username: farcasterUser?.username,
      });
      setIsAuthenticated(true);
      
      console.log("User authenticated:", {
        address: walletAddress,
        displayName,
        isAuthenticated: true,
      });
    } else {
      // Clear authentication when wallet is disconnected
      setUser(null);
      setIsAuthenticated(false);
      setPlayerStats(null);
      console.log("User disconnected");
    }
  }, [walletAddress, farcasterUser]);

  const connectWallet = useCallback(async () => {
    try {
      if (!isLoading) setIsLoading(true);

      // Try to connect using wagmi first
      const farcasterConnector = connectors.find(
        (c) => c.name === "Farcaster Miniapp"
      );
      const injectedConnector = connectors.find((c) => c.name === "Injected");

      if (farcasterConnector) {
        console.log("Connecting with Farcaster connector");
        connect({ connector: farcasterConnector });
      } else if (injectedConnector) {
        console.log("Connecting with injected connector");
        connect({ connector: injectedConnector });
      } else {
        console.warn("No wallet connectors available");
        throw new Error("No wallet connectors found. Please try refreshing the page.");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      if (isLoading) setIsLoading(false);
    }
  }, [connect, connectors, isLoading]);

  const signOut = () => {
    disconnect();
    setUser(null);
    setIsAuthenticated(false);
    setPlayerStats(null);
    setWalletAddress(null);
  };
  
  const invalidateLeaderboardCache = useCallback(() => {
    console.log("🧹 Invalidating leaderboard cache after game completion");
    // leaderboardCache.invalidateAll();
  }, []);

  const value = {
    user,
    isLoading,
    gameContract,
    isAuthenticated,
    playerStats,
    walletAddress,
    connectWallet,
    signOut,
    refreshPlayerStats,
    setWalletAddress,
    invalidateLeaderboardCache,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <InnerProviders>{children}</InnerProviders>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within Providers");
  }
  return context;
};