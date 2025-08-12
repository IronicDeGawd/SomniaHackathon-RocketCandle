import SomniaLogo from "../ui/SomniaLogo";

const HeroSection = () => {
  const scrollToHowToPlay = () => {
    const howToPlaySection = document.querySelector(".how-to-play-section");
    if (howToPlaySection) {
      howToPlaySection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <section className="hero-section">
      {/* Somnia Logo */}
      <SomniaLogo size="large" className="mb-8" />
      
      <h1 className="hero-title">🚀 Rocket Candle</h1>
      <p className="hero-subtitle">
        Blast through candlestick barriers and earn RocketFUEL tokens on the
        Somnia blockchain! Master physics-based gameplay in this revolutionary
        Web3 gaming experience.
      </p>
      <button
        className="scroll-down-button"
        onClick={scrollToHowToPlay}
        aria-label="Scroll to How to Play section"
      />
    </section>
  );
};

export default HeroSection;