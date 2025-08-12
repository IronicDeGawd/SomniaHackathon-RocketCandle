"use client";

import { useApp } from "../providers";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useReadContract, useSwitchChain } from "wagmi";
import { GAME_CONTRACT_ABI, getGameContractAddress, validateScore, calculateExpectedReward } from "@/lib/blockchain";
import Navbar from "@/components/layout/Navbar";
import NotificationSystem, { useNotifications } from "@/components/ui/NotificationSystem";

// Dynamically import PhaserGame to avoid SSR issues
const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-gray-900 rounded-lg flex items-center justify-center">
      <div className="text-white">Loading Game...</div>
    </div>
  ),
});

export default function GamePage() {
  const { isAuthenticated, user, playerStats, refreshPlayerStats } = useApp();
  const router = useRouter();
  const {
    notifications,
    removeNotification,
    // notifySuccess, // Currently unused
    notifyError,
    notifyInfo,
    notifyTransactionSubmitted,
    notifyTransactionConfirmed,
    notifyScoreSubmitted,
    notifyNetworkError
  } = useNotifications();
  
  const handleNavigation = (page: 'home' | 'game' | 'leaderboard') => {
    switch (page) {
      case 'home':
        router.push('/');
        break;
      case 'game':
        router.push('/game');
        break;
      case 'leaderboard':
        router.push('/scores');
        break;
    }
  };
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [lastGameResult, setLastGameResult] = useState<{
    score: number;
    level: number;
    tokensEarned: number;
  } | null>(null);
  // Remove old blockchainStatus state - using notifications instead

  const contractAddress = getGameContractAddress();
  
  // Debug contract address and wallet state
  useEffect(() => {
    console.log("🔧 Game Page Debug Info:", {
      contractAddress,
      isAuthenticated,
      isConnected,
      address,
      chainId,
      expectedChainId: 50312, // Somnia
    });
    
    if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
      console.error("❌ Invalid contract address! Check environment variables.");
    }
    
    if (chainId !== 50312) {
      console.warn("⚠️ Wrong chain! Expected Somnia (50312), current:", chainId);
    }
  }, [contractAddress, isAuthenticated, isConnected, address, chainId]);

  // Test contract read function
  const { data: tokenName, error: tokenNameError } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GAME_CONTRACT_ABI,
    functionName: 'name',
    query: { 
      enabled: !!contractAddress && !!isConnected,
    }
  });

  useEffect(() => {
    if (tokenName) {
      console.log("✅ Contract read successful - Token name:", tokenName);
    }
    if (tokenNameError) {
      console.error("❌ Contract read failed:", tokenNameError);
    }
  }, [tokenName, tokenNameError]);
  
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  });

  // Debug transaction errors
  useEffect(() => {
    if (writeError) {
      console.error("❌ Write contract error:", writeError);
      notifyError('Transaction Failed', writeError.message);
    }
  }, [writeError, notifyError]);

  useEffect(() => {
    if (receiptError) {
      console.error("❌ Receipt error:", receiptError);
      notifyError('Receipt Error', receiptError.message);
    }
  }, [receiptError, notifyError]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    
    // Record game start time
    setGameStartTime(Date.now());
  }, [isAuthenticated, router]);

  const handleGameComplete = async (score: number, level: number) => {
    console.log("🎮 Game Complete called with:", { score, level });
    
    if (!isAuthenticated || !user?.address) {
      console.warn("❌ Cannot submit score: user not authenticated");
      notifyError('Authentication Error', 'User not authenticated');
      return;
    }

    if (!isConnected || !address) {
      console.warn("❌ Cannot submit score: wallet not connected");
      notifyError('Wallet Error', 'Wallet not connected');
      return;
    }

    if (chainId !== 50312) {
      console.warn("❌ Wrong network detected, attempting to switch to Somnia...");
      try {
        notifyInfo('Network Switch', 'Switching to Somnia network...');
        await switchChain({ chainId: 50312 });
        console.log("✅ Successfully switched to Somnia network");
        // Continue with score submission after network switch
      } catch (switchError) {
        console.error("❌ Failed to switch network:", switchError);
        notifyNetworkError();
        return;
      }
    }

    if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
      console.error("❌ Cannot submit score: invalid contract address");
      notifyError('Contract Error', 'Invalid contract configuration');
      return;
    }

    const gameEndTime = Date.now();
    const gameTime = Math.floor((gameEndTime - gameStartTime) / 1000); // Convert to seconds
    
    // Convert 0-based level to 1-based level for validation and blockchain submission
    const adjustedLevel = level + 1;
    
    console.log("📊 Score details:", {
      originalLevel: level,
      adjustedLevel,
      score,
      gameTime,
      gameStartTime,
      gameEndTime
    });
    
    // Basic validation (using adjusted level)
    if (!validateScore(score, gameTime, adjustedLevel)) {
      console.error("❌ Score validation failed");
      notifyError('Validation Error', 'Score validation failed');
      return;
    }

    // Calculate expected token reward (using adjusted level)
    const expectedTokens = calculateExpectedReward(score, adjustedLevel);
    
    try {
      setIsSubmittingScore(true);
      notifyInfo('Blockchain Submission', 'Preparing blockchain transaction...');
      
      // Mock data for enemies destroyed and rockets used (these would come from the game)
      const enemiesDestroyed = Math.min(Math.floor(score / 1000) + adjustedLevel, 50);
      const rocketsUsed = Math.min(Math.floor(score / 500) + adjustedLevel * 2, 20);

      console.log("📤 Submitting score to blockchain:", {
        score,
        level: adjustedLevel,
        gameTime,
        enemiesDestroyed,
        rocketsUsed,
        expectedTokens
      });

      notifyInfo('Wallet Confirmation', 'Confirming transaction in wallet...');

      console.log("📝 Calling writeContract with args:", {
        address: contractAddress,
        functionName: 'submitScore',
        args: [
          BigInt(score),
          BigInt(adjustedLevel),
          BigInt(gameTime),
          enemiesDestroyed,
          rocketsUsed
        ]
      });

      const writeResult = writeContract({
        address: contractAddress as `0x${string}`,
        abi: GAME_CONTRACT_ABI,
        functionName: 'submitScore',
        args: [
          BigInt(score),
          BigInt(adjustedLevel),
          BigInt(gameTime),
          enemiesDestroyed,
          rocketsUsed
        ],
      });

      console.log("📝 WriteContract result:", writeResult);

      // Store game result for display (using adjusted level)
      setLastGameResult({
        score,
        level: adjustedLevel,
        tokensEarned: expectedTokens
      });

      notifyInfo('Blockchain Confirmation', 'Waiting for blockchain confirmation...');

    } catch (error) {
      console.error("Failed to submit score:", error);
      const errorMessage = (error as Error)?.message?.includes('rejected') 
        ? 'Transaction was rejected by user' 
        : 'Failed to submit to blockchain. Please try again.';
      notifyError('Submission Failed', errorMessage);
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // Track transaction hash changes
  useEffect(() => {
    if (hash) {
      console.log("📝 Transaction hash generated:", hash);
      notifyTransactionSubmitted(hash);
    }
  }, [hash, notifyTransactionSubmitted]);

  // Track pending state
  useEffect(() => {
    console.log("📝 isPending:", isPending, "isConfirming:", isConfirming);
  }, [isPending, isConfirming]);

  // Refresh player stats after successful transaction
  useEffect(() => {
    if (isSuccess && lastGameResult) {
      console.log("✅ Score submitted successfully! Hash:", hash);
      if (hash) {
        notifyTransactionConfirmed(hash);
      }
      notifyScoreSubmitted(lastGameResult.score, lastGameResult.tokensEarned);
      refreshPlayerStats();
    }
  }, [isSuccess, refreshPlayerStats, hash, lastGameResult, notifyScoreSubmitted, notifyTransactionConfirmed]);
  
  // Notifications are auto-cleared by the notification system

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-400">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Navigation Bar */}
      <Navbar onNavigate={handleNavigation} />
      
      <div className="min-h-screen text-white p-4" style={{paddingTop: '100px'}}>
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      {/* Header */}
      <header className="game-header">
        <div className="game-header-content">
          <div className="game-title-section">
            <h1 className="game-title">🚀 Rocket Candle</h1>
            <p className="game-subtitle">Destroy enemies, earn RocketFUEL tokens!</p>
          </div>
          
          <div className="game-header-stats">
            {/* Player Info */}
            <div className="stat-card">
              <div className="stat-label">Player</div>
              <div className="stat-value">{user?.displayName}</div>
            </div>
            
            {/* Player Stats */}
            {playerStats && (
              <div className="stat-card">
                <div className="stat-label">RocketFUEL Tokens</div>
                <div className="stat-value highlight">{playerStats.totalTokens.toFixed(2)}</div>
              </div>
            )}
            
            {/* Back Button */}
            <button
              onClick={() => router.push('/')}
              className="btn btn-back"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      {/* Game Container */}
      <div className="flex justify-center">
        <div className="relative">
          <PhaserGame onGameComplete={handleGameComplete} />
          
        </div>
      </div>

    </div>
    </>
  );
}