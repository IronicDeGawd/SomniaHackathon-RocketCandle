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

        {/* Footer with Credits */}
        <footer className="py-8 text-center text-sm text-gray-400 border-t border-gray-800/50 mt-16">
          <p>
            Sound Effect by{" "}
            <a 
              href="https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=38511"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              freesound_community
            </a>{" "}
            from{" "}
            <a 
              href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=38511"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Pixabay
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}

