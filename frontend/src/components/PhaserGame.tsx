"use client";

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { PreloadScene } from '@/scenes/PreloadScene.js';
import { MenuScene } from '@/scenes/MenuScene.js';
import { GameScene } from '@/scenes/GameScene.js';
import { EndGameScene } from '@/scenes/EndGameScene.js';
import { useApp } from '@/app/providers';

export interface PhaserGameProps {
  onGameComplete?: (score: number, level: number) => void;
}

export default function PhaserGame({ onGameComplete }: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { walletAddress, isAuthenticated } = useApp();

  useEffect(() => {
    if (!containerRef.current) return;

    // Game configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1200,
      height: 600,
      parent: containerRef.current,
      backgroundColor: '#0a0a0f',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 300, x: 0 },
          debug: false,
        },
      },
      scene: [PreloadScene, MenuScene, GameScene, EndGameScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: {
          width: 800,
          height: 400,
        },
        max: {
          width: 1200,
          height: 600,
        },
      },
    };

    // Create game instance
    gameRef.current = new Phaser.Game(config);
    setIsLoading(false);

    // Set up global wallet state for game scenes
    if (typeof window !== 'undefined') {
      window.marketBusterWallet = {
        isConnected: isAuthenticated,
        address: walletAddress,
        onGameComplete: onGameComplete || (() => {}),
      };
    }

    // Cleanup function
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      if (typeof window !== 'undefined') {
        delete window.marketBusterWallet;
      }
    };
  }, [isAuthenticated, walletAddress, onGameComplete]);

  // Update global wallet state when authentication changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.marketBusterWallet) {
      window.marketBusterWallet.isConnected = isAuthenticated;
      window.marketBusterWallet.address = walletAddress;
    }
  }, [isAuthenticated, walletAddress]);

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {/* Game Status */}
      <div className="flex items-center space-x-4 text-sm text-gray-400">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
          <span>{isLoading ? 'Loading...' : 'Game Ready'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{isAuthenticated ? 'Wallet Connected' : 'Wallet Disconnected'}</span>
        </div>
      </div>

      {/* Game Container */}
      <div 
        ref={containerRef}
        className="border-2 border-gray-700 rounded-lg bg-black shadow-2xl"
        style={{
          width: '1200px',
          height: '600px',
          maxWidth: '100%',
          maxHeight: '80vh',
        }}
      />

      {/* Game Instructions */}
      <div className="game-instructions">
        <h3 className="instructions-title">🎮 How to Play</h3>
        <div className="instructions-content">
          <p className="mb-2">
            <strong>Controls:</strong> W/S keys to adjust angle, A/D keys to adjust power, SPACE to launch rocket
          </p>
          <p>
            Destroy all enemies to complete each level. You have 3 attempts per level.
            {isAuthenticated && ' Your scores will be saved to the blockchain!'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    marketBusterWallet?: {
      isConnected: boolean;
      address: string | null;
      onGameComplete: (score: number, level: number) => void;
    };
  }
}