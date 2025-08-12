"use client";

import { useApp } from "@/app/providers";

interface WalletSectionProps {
  onDashboard?: () => void;
  onStartGame?: () => void;
}

const WalletSection = ({ onDashboard, onStartGame }: WalletSectionProps) => {
  const { connectWallet, isLoading, isAuthenticated, user, playerStats } = useApp();

  if (!isAuthenticated) {
    return (
      <section className="cta-section py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Play?</h2>
          <button
            onClick={connectWallet}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-12 py-4 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
          >
            {isLoading ? "Connecting..." : "🔗 Connect Wallet"}
          </button>
          <p className="text-gray-400 mt-4">
            Connect your wallet to start earning RocketFUEL tokens
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="wallet-section">
      <div className="auth-status-indicator authenticated">
        <div className="auth-text">
          <div className="auth-title">✅ Wallet Connected</div>
          <div className="auth-subtitle">{user?.displayName}</div>
        </div>
        
        {/* Player Stats */}
        {playerStats && (
          <div className="glass-card p-6 max-w-2xl mx-auto mb-6">
            <h3 className="text-xl font-semibold mb-4 text-center">Your Stats</h3>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400">{playerStats.totalGames}</div>
                <div className="text-sm text-gray-400">Games Played</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">{playerStats.bestScore.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Best Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{playerStats.totalTokens.toFixed(2)}</div>
                <div className="text-sm text-gray-400">RocketFUEL Tokens</div>
              </div>
            </div>
          </div>
        )}

        <div className="navigation-buttons">
          <button 
            onClick={onStartGame}
            className="btn btn-success btn-large play-button"
          >
            🎮 Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletSection;