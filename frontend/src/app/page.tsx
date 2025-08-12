"use client";

import { useRouter } from "next/navigation";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowToPlaySection from "@/components/landing/HowToPlaySection";
import Navbar from "@/components/layout/Navbar";

export default function LandingPage() {
  const router = useRouter();

  // Navigation handlers
  const handleDashboard = () => {
    router.push("/dashboard");
  };

  const handleStartGame = () => {
    router.push("/game");
  };

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

  return (
    <>
      {/* Navigation Bar */}
      <Navbar onNavigate={handleNavigation} />
      
      {/* Main content container with navbar padding */}
      <div className="landing-container pt-20">
        {/* Hero Section with integrated CTA */}
        <HeroSection 
          onDashboard={handleDashboard}
          onStartGame={handleStartGame}
        />

        {/* Content Section */}
        <section className="content-section">
          {/* Features Section */}
          <FeaturesSection />

          {/* How to Play Section */}
          <HowToPlaySection />
        </section>
      </div>
    </>
  );
}

