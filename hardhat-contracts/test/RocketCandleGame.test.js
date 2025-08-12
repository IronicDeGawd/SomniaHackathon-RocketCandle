const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RocketCandleGame", function () {
  let rocketCandleGame;
  let owner;
  let player1;
  let player2;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    const RocketCandleGame = await ethers.getContractFactory(
      "RocketCandleGame"
    );
    rocketCandleGame = await RocketCandleGame.deploy();
    await rocketCandleGame.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right token details", async function () {
      expect(await rocketCandleGame.name()).to.equal("Rocket Candle Fuel");
      expect(await rocketCandleGame.symbol()).to.equal("RocketFUEL");
    });

    it("Should set the right owner", async function () {
      expect(await rocketCandleGame.owner()).to.equal(owner.address);
    });

    it("Should mint initial supply correctly", async function () {
      const expectedOwnerBalance = ethers.parseEther("1000000");
      const expectedTreasuryBalance = ethers.parseEther("9000000");

      expect(await rocketCandleGame.balanceOf(owner.address)).to.equal(
        expectedOwnerBalance
      );
      expect(
        await rocketCandleGame.balanceOf(await rocketCandleGame.getAddress())
      ).to.equal(expectedTreasuryBalance);
    });
  });

  describe("Game Mechanics", function () {
    it("Should allow submitting valid scores", async function () {
      const score = 5000;
      const level = 3;
      const gameTime = 120; // 2 minutes
      const enemiesDestroyed = 10;
      const rocketsUsed = 8;

      await expect(
        rocketCandleGame
          .connect(player1)
          .submitScore(score, level, gameTime, enemiesDestroyed, rocketsUsed)
      )
        .to.emit(rocketCandleGame, "GameCompleted")
        .withArgs(player1.address, score, level, gameTime, enemiesDestroyed);
    });

    it("Should calculate token rewards correctly", async function () {
      const score = 10000; // 10 tokens
      const level = 5; // 7.5 tokens

      const expectedReward = await rocketCandleGame.calculateTokenReward(
        score,
        level
      );
      expect(expectedReward).to.equal(ethers.parseEther("17.5"));
    });

    it("Should reject invalid scores", async function () {
      // Score too high for time
      await expect(
        rocketCandleGame.connect(player1).submitScore(
          1000000, // 1M score
          1,
          10, // 10 seconds
          5,
          3
        )
      ).to.be.revertedWith("Suspicious score");
    });

    it("Should reject games that are too short", async function () {
      await expect(
        rocketCandleGame.connect(player1).submitScore(
          1000,
          1,
          3, // Less than MIN_GAME_TIME (5 seconds)
          5,
          3
        )
      ).to.be.revertedWith("Game too short");
    });
  });

  describe("Token Economics", function () {
    it("Should allow revive purchase", async function () {
      // First, player needs tokens
      await rocketCandleGame
        .connect(owner)
        .transfer(player1.address, ethers.parseEther("100"));

      const initialBalance = await rocketCandleGame.balanceOf(player1.address);

      await expect(rocketCandleGame.connect(player1).purchaseRevive())
        .to.emit(rocketCandleGame, "RevivePurchased")
        .withArgs(player1.address, ethers.parseEther("50"));

      const finalBalance = await rocketCandleGame.balanceOf(player1.address);
      expect(initialBalance - finalBalance).to.equal(ethers.parseEther("50"));
    });

    it("Should reject revive without enough tokens", async function () {
      await expect(
        rocketCandleGame.connect(player1).purchaseRevive()
      ).to.be.revertedWith("Insufficient RocketFUEL tokens");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to pause", async function () {
      await rocketCandleGame.connect(owner).pause();

      await expect(
        rocketCandleGame.connect(player1).submitScore(1000, 1, 30, 5, 3)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow owner to unpause", async function () {
      await rocketCandleGame.connect(owner).pause();
      await rocketCandleGame.connect(owner).unpause();

      // Should work now
      await expect(
        rocketCandleGame.connect(player1).submitScore(1000, 1, 30, 5, 3)
      ).to.not.be.reverted;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        rocketCandleGame.connect(player1).pause()
      ).to.be.revertedWithCustomError(
        rocketCandleGame,
        "OwnableUnauthorizedAccount"
      );
    });
  });
});
