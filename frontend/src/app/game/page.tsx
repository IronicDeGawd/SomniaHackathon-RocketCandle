"use client";

import { useApp } from "../providers";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useReadContract, useSwitchChain } from "wagmi";
import { GAME_CONTRACT_ABI, getGameContractAddress, validateScore, calculateExpectedReward } from "@/lib/blockchain";
import Navbar from "@/components/layout/Navbar";

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
  const [blockchainStatus, setBlockchainStatus] = useState<{
    status: 'idle' | 'submitting' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

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
      setBlockchainStatus({ 
        status: 'error', 
        message: `Transaction failed: ${writeError.message}` 
      });
    }
  }, [writeError]);

  useEffect(() => {
    if (receiptError) {
      console.error("❌ Receipt error:", receiptError);
      setBlockchainStatus({ 
        status: 'error', 
        message: `Receipt error: ${receiptError.message}` 
      });
    }
  }, [receiptError]);

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
      setBlockchainStatus({ 
        status: 'error', 
        message: 'User not authenticated' 
      });
      return;
    }

    if (!isConnected || !address) {
      console.warn("❌ Cannot submit score: wallet not connected");
      setBlockchainStatus({ 
        status: 'error', 
        message: 'Wallet not connected' 
      });
      return;
    }

    if (chainId !== 50312) {
      console.warn("❌ Wrong network detected, attempting to switch to Somnia...");
      try {
        setBlockchainStatus({ 
          status: 'submitting', 
          message: 'Switching to Somnia network...' 
        });
        await switchChain({ chainId: 50312 });
        console.log("✅ Successfully switched to Somnia network");
        // Continue with score submission after network switch
      } catch (switchError) {
        console.error("❌ Failed to switch network:", switchError);
        setBlockchainStatus({ 
          status: 'error', 
          message: 'Please manually switch to Somnia network in your wallet' 
        });
        return;
      }
    }

    if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
      console.error("❌ Cannot submit score: invalid contract address");
      setBlockchainStatus({ 
        status: 'error', 
        message: 'Invalid contract configuration' 
      });
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
      setBlockchainStatus({ 
        status: 'error', 
        message: 'Score validation failed' 
      });
      return;
    }

    // Calculate expected token reward (using adjusted level)
    const expectedTokens = calculateExpectedReward(score, adjustedLevel);
    
    try {
      setIsSubmittingScore(true);
      setBlockchainStatus({ status: 'submitting', message: 'Preparing blockchain transaction...' });
      
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

      setBlockchainStatus({ status: 'submitting', message: 'Confirming transaction in wallet...' });

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

      setBlockchainStatus({ status: 'submitting', message: 'Waiting for blockchain confirmation...' });

    } catch (error) {
      console.error("Failed to submit score:", error);
      setBlockchainStatus({ 
        status: 'error', 
        message: error?.message?.includes('rejected') 
          ? 'Transaction was rejected by user' 
          : 'Failed to submit to blockchain. Please try again.' 
      });
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // Track transaction hash changes
  useEffect(() => {
    if (hash) {
      console.log("📝 Transaction hash generated:", hash);
      setBlockchainStatus({ status: 'submitting', message: 'Transaction submitted, waiting for confirmation...' });
    }
  }, [hash]);

  // Track pending state
  useEffect(() => {
    console.log("📝 isPending:", isPending, "isConfirming:", isConfirming);
  }, [isPending, isConfirming]);

  // Refresh player stats after successful transaction
  useEffect(() => {
    if (isSuccess) {
      console.log("✅ Score submitted successfully! Hash:", hash);
      setBlockchainStatus({ status: 'success', message: 'Score saved to blockchain successfully!' });
      refreshPlayerStats();
    }
  }, [isSuccess, refreshPlayerStats, hash]);
  
  // Clear blockchain status after some time
  useEffect(() => {
    if (blockchainStatus.status === 'success' || blockchainStatus.status === 'error') {
      const timer = setTimeout(() => {
        setBlockchainStatus({ status: 'idle', message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [blockchainStatus.status]);

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
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 pt-20">
      {/* Blockchain Status Notification */}
      {blockchainStatus.status !== 'idle' && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border backdrop-blur-sm max-w-sm ${
          blockchainStatus.status === 'success' 
            ? 'bg-green-900/80 border-green-500 text-green-100' 
            : blockchainStatus.status === 'error'
            ? 'bg-red-900/80 border-red-500 text-red-100'
            : 'bg-blue-900/80 border-blue-500 text-blue-100'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {blockchainStatus.status === 'success' && <span className="text-xl">✅</span>}
              {blockchainStatus.status === 'error' && <span className="text-xl">❌</span>}
              {blockchainStatus.status === 'submitting' && 
                <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full"></div>
              }
            </div>
            <div>
              <h4 className="font-semibold text-sm">
                {blockchainStatus.status === 'success' && 'Success!'}
                {blockchainStatus.status === 'error' && 'Error'}
                {blockchainStatus.status === 'submitting' && 'Blockchain Transaction'}
              </h4>
              <p className="text-xs mt-1 opacity-90">{blockchainStatus.message}</p>
            </div>
          </div>
        </div>
      )}

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
          
          {/* Score Submission Overlay */}
          {(isSubmittingScore || isPending || isConfirming) && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <div className="bg-blue-900/80 border border-blue-500 rounded-lg p-6 text-center max-w-sm">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <h3 className="text-lg font-bold mb-2">📤 Blockchain Submission</h3>
                <p className="text-sm text-gray-300">
                  {blockchainStatus.message || 
                    (isPending && "Confirming transaction...") ||
                    (isConfirming && "Waiting for blockchain confirmation...") ||
                    "Preparing transaction..."
                  }
                </p>
              </div>
            </div>
          )}

          {/* Success Overlay */}
          {isSuccess && lastGameResult && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <div className="bg-green-900/80 border border-green-500 rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-lg font-bold mb-2">Score Submitted!</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Score:</strong> {lastGameResult.score.toLocaleString()}</p>
                  <p><strong>Level:</strong> {lastGameResult.level}</p>
                  <p><strong>RocketFUEL Earned:</strong> {lastGameResult.tokensEarned}</p>
                </div>
                <button
                  onClick={() => setLastGameResult(null)}
                  className="mt-4 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Continue Playing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Stats */}
      {playerStats && (
        <div className="game-stats-section">
          <h2 className="stats-title">Your Stats</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{playerStats.totalGames}</div>
              <div className="stat-label">Games Played</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{playerStats.bestScore.toLocaleString()}</div>
              <div className="stat-label">Best Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{playerStats.totalTokens.toFixed(2)}</div>
              <div className="stat-label">Total RocketFUEL</div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}