"use client";

import { useApp } from "@/app/providers";

interface WalletSectionProps {
  onDashboard?: () => void;
  onStartGame?: () => void;
}

const WalletSection = ({ onDashboard, onStartGame }: WalletSectionProps) => {
  const { connectWallet, isLoading, isAuthenticated, user, playerStats } =
    useApp();

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
          <p className="text-gray-400 mt-4 p-2">
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
