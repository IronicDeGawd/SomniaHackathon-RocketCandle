import { UIComponents } from "@/components/UIComponents.js";
import { MarketDataProvider } from "@/data/MarketDataProvider.js";
import { KeyboardTimerController } from "@/utils/KeyboardTimerController.js";

/**
 * GameScene - Main gameplay scene for Rocket Candle
 * Handles all game mechanics, physics, and player interactions
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });

    // Game state variables
    this.currentLevel = 0;
    this.score = 0;
    this.enemiesRemaining = 0;
    this.totalEnemiesInLevel = 0; // Track total enemies generated
    this.maxLevels = MarketDataProvider.getTotalLevels(); // Total number of levels from data provider
    this.launchAttempts = 0; // Track total number of rockets launched across all levels

    // Level attempt system
    this.maxAttemptsPerLevel = 3; // Maximum attempts allowed per level
    this.currentLevelAttempts = 0; // Attempts used in current level
    this.gameOver = false; // Flag for game over state

    // Candlestick barrier system - now using MarketDataProvider
    this.candlestickData = MarketDataProvider.generateGameLevels();
    this.candlestickSprites = []; // Store generated candlestick sprites

    // Rocket launcher properties
    this.launcher = null;
    this.launchAngle = 45; // degrees (15-75 range)
    this.launchPower = 50; // percentage (0-100 range)
    this.maxLaunchSpeed = 800; // pixels per second
    this.canLaunch = true;

    // Rocket physics properties
    this.airResistance = 0.998; // Slight air resistance (0.1% drag per frame) for realistic trajectory
    this.explosionSize = 70; // Explosion radius in pixels - increased from 120 for even better area coverage
    this.rocketTrail = []; // Store trail points for visual effect

    // Trajectory prediction properties
    this.trajectoryGraphics = null;
    this.showTrajectory = true;
    this.trajectoryPoints = [];
    this.gravity = 300; // matches physics world gravity
    this.trajectoryTimer = null; // For temporary trajectory display
    this.trajectoryDisplayTime = 1500; // milliseconds to show trajectory after adjustment

    // Physics groups
    this.rockets = null;
    this.candlesticks = null;
    this.blocks = null;
    this.enemies = null;

    // UI elements
    this.scoreText = null;
    this.levelText = null;
    this.enemiesText = null;
    this.angleSlider = null;
    this.powerSlider = null;
    this.launchButton = null;
    this.angleText = null;
    this.powerText = null;

    // Keyboard and timer controller
    this.keyboardTimerController = null;
    this.angleStepSize = 2; // degrees per key press
    this.powerStepSize = 5; // percentage per key press

    // Legacy timer properties (kept for compatibility)
    this.launchTimer = null;
    this.timerBar = null;
    this.timerText = null;
    this.timerDuration = 8000; // 8 seconds in milliseconds
    this.isTimerActive = false;
    this.timerStartTime = 0;
  }

  create() {
    // Set world bounds (1200x600 as updated)
    this.physics.world.setBounds(0, 0, 1200, 600);

    // Set world gravity for proper physics
    this.physics.world.gravity.y = this.gravity;

    // Initialize sounds
    this.sounds = {
      enemyDestroy: this.sound.add("enemy-destroy", { volume: 0.5 }),
      levelComplete: this.sound.add("level-complete", { volume: 0.6 }),
      gameOver: this.sound.add("game-over", { volume: 0.7 }),
      gameLevel: this.sound.add("level-complete", { volume: 0.3, loop: true }),
    };

    // Set camera bounds
    this.cameras.main.setBounds(0, 0, 1200, 600);

    // Add background image
    this.backgroundImage = this.add
      .image(600, 300, "game-background")
      .setOrigin(0.5, 0.5)
      .setDisplaySize(1200, 600);

    // Set the background image as the deepest layer
    this.backgroundImage.setDepth(-1000);

    // Initialize wallet and Web3 services
    this.initializeWeb3();

    // Create ground/floor collision boundary
    this.createGround();

    // Initialize physics groups
    this.initializePhysicsGroups();

    // Set up HUD
    this.createHUD();

    // Create rocket launcher system
    this.createLauncher();

    // Generate candlestick barriers for current level
    this.generateCandlestickBarriers();
    
    // Start background music for game level (delay to ensure no overlap)
    // Check if game music is already playing globally to prevent multiple instances
    this.time.delayedCall(100, () => {
      const globalSounds = this.sound.sounds;
      const isGameMusicPlaying = globalSounds.some(sound => 
        sound.key === "level-complete" && sound.isPlaying
      );
      
      if (!isGameMusicPlaying && this.sounds.gameLevel) {
        this.sounds.gameLevel.play();
      }
    });

    // Create trajectory prediction system
    this.createTrajectorySystem();

    // Create graphics object for rocket trails
    this.trailGraphics = this.add.graphics();

    // Set up keyboard controls
    this.setupKeyboardControls();

    // Initialize scene state
    this.initializeScene();
  }

  /**
   * Initialize Web3 and wallet services
   */
  initializeWeb3() {
    // Get global wallet manager and web3 service from main.js
    this.walletManager = window.walletManager;
    this.web3Service = window.web3Service;

    // Set wallet connection status
    this.walletConnected = this.walletManager?.isConnected || false;

    //console.log("🔗 GameScene: Web3 services initialized");

    if (this.walletConnected) {
      this.loadRocketFuelBalance();
    }
  }

  /**
   * Load RocketFUEL balance for display
   */
  async loadRocketFuelBalance() {
    if (!this.walletConnected || !this.web3Service) return;

    try {
      const _balance = await this.web3Service.getFuelBalance();
      //console.log(`💰 Current RocketFUEL balance: ${balance}`);
    } catch (error) {
      console.error("Failed to load RocketFUEL balance in GameScene:", error);
    }
  }

  /**
   * Set up keyboard controls with timer lock system
   */
  setupKeyboardControls() {
    // Initialize the keyboard timer controller
    this.keyboardTimerController = new KeyboardTimerController(this, {
      angleMin: 15,
      angleMax: 75,
      powerMin: 0,
      powerMax: 100,
      angleStepSize: this.angleStepSize,
      powerStepSize: this.powerStepSize,
      timerDuration: this.timerDuration,
      onAngleChange: (_angle) => {
        this.updateLauncherRotation();
        this.updateControlDisplay();
        this.showTemporaryTrajectory();
      },
      onPowerChange: (_power) => {
        this.updateControlDisplay();
        this.showTemporaryTrajectory();
      },
      onAutoLaunch: () => {
        this.launchRocket();
      },
    });

    //console.log("✅ Keyboard controls and timer lock system initialized");
  }

  /**
   * Create ground/floor collision boundary
   */
  createGround() {
    // Ground height at y=550 (50px from bottom)
    this.groundY = 550;

    // Create tiled ground using brown candle blocks (50px each)
    const blockSize = 50;
    const screenWidth = 1200;
    const numBlocks = Math.ceil(screenWidth / blockSize);

    // Create container for ground blocks
    this.groundBlocks = this.add.container(0, 0);

    // Create tiled ground blocks
    for (let i = 0; i < numBlocks; i++) {
      const x = i * blockSize + blockSize / 2; // Center each block
      const groundBlock = this.add.image(
        x,
        this.groundY + blockSize / 2,
        "ground-block"
      );
      groundBlock.setDisplaySize(blockSize, blockSize);
      this.groundBlocks.add(groundBlock);
    }

    // Create physics body for ground collision
    this.groundBody = this.physics.add.staticGroup();
    const groundCollider = this.groundBody.create(600, this.groundY, null); // Updated x center
    groundCollider.setSize(1200, 50); // Updated width
    groundCollider.setVisible(false);

    //console.log("✅ Ground created with collision detection");
  }

  /**
   * Initialize all physics groups for game objects
   */
  initializePhysicsGroups() {
    // Create physics groups for different object types
    this.rockets = this.physics.add.group({
      defaultKey: "rocket",
      maxSize: 1, // Only one rocket at a time
    });

    this.candlesticks = this.physics.add.staticGroup();
    this.blocks = this.physics.add.staticGroup(); // Make blocks static
    this.enemies = this.physics.add.group();

    // Set up collision detection between groups
    this.setupCollisions();

    //console.log("✅ Physics groups initialized");
  }

  /**
   * Set up collision detection between different physics groups
   */
  setupCollisions() {
    // Rocket collisions with ground
    this.physics.add.collider(
      this.rockets,
      this.groundBody,
      this.onRocketHitGround,
      null,
      this
    );

    // Rocket collisions with candlesticks
    this.physics.add.collider(
      this.rockets,
      this.candlesticks,
      this.onRocketHitCandlestick,
      null,
      this
    );

    // Rocket collisions with blocks
    this.physics.add.collider(
      this.rockets,
      this.blocks,
      this.onRocketHitBlock,
      null,
      this
    );

    // Rocket collisions with enemies
    this.physics.add.overlap(
      this.rockets,
      this.enemies,
      this.onRocketHitEnemy,
      null,
      this
    );

    // Block collisions with ground (not needed for static blocks)
    // this.physics.add.collider(this.blocks, this.groundBody);

    // Block collisions with candlesticks (not needed for static blocks)
    // this.physics.add.collider(this.blocks, this.candlesticks);

    // Block to block collisions (not needed for static blocks)
    // this.physics.add.collider(this.blocks, this.blocks);

    // Enemy collisions with ground
    this.physics.add.collider(this.enemies, this.groundBody);

    // Enemy collisions with candlesticks
    this.physics.add.collider(this.enemies, this.candlesticks);

    // Enemy collisions with blocks (so they can walk on them)
    this.physics.add.collider(this.enemies, this.blocks);
  }

  /**
   * Create HUD elements (score, level, enemies remaining)
   */
  createHUD() {
    // Score display (top-left)
    this.scoreText = this.add.text(16, 16, "Score: 0", {
      fontSize: "28px", // Increased from 24px
      fill: "#ffffff",
      fontFamily: "Pixelify Sans, Arial",
      stroke: "#000000", // Add black outline for better visibility
      strokeThickness: 3, // Thick stroke for contrast against any background
    });

    // Level display (top-center)
    this.levelText = this.add
      .text(600, 16, "Level: 3", {
        // Updated center position for 1200px width
        fontSize: "28px", // Increased from 24px
        fill: "#ffffff",
        fontFamily: "Pixelify Sans, Arial",
        stroke: "#000000", // Add black outline for better visibility
        strokeThickness: 3, // Thick stroke for contrast against any background
      })
      .setOrigin(0.5, 0);

    // Enemies remaining (top-right)
    this.enemiesText = this.add
      .text(1184, 16, "Enemies: 0", {
        // Updated for 1200px width (1200-16)
        fontSize: "28px", // Increased from 24px
        fill: "#ffffff",
        fontFamily: "Pixelify Sans, Arial",
        stroke: "#000000", // Add black outline for better visibility
        strokeThickness: 3, // Thick stroke for contrast against any background
      })
      .setOrigin(1, 0);

    // Total attempts display (top-left, below score)
    this.attemptsText = this.add.text(16, 50, "Total: 0", {
      fontSize: "22px", // Increased from 20px
      fill: "#ffffff",
      fontFamily: "Pixelify Sans, Arial",
      stroke: "#000000", // Add black outline for better visibility
      strokeThickness: 3, // Thick stroke for contrast against any background
    });

    // Level attempts display (top-left, below total attempts)
    this.levelAttemptsText = this.add.text(16, 75, "Attempt: 0/3", {
      fontSize: "20px", // Increased from 18px
      fill: "#ff6666",
      fontFamily: "Pixelify Sans, Arial",
      stroke: "#000000", // Add black outline for better visibility
      strokeThickness: 3, // Thick stroke for contrast against any background
    });

    //console.log("✅ HUD elements created");
  }

  /**
   * Update HUD displays
   */
  updateHUD() {
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${this.score}`);
    }
    if (this.levelText) {
      this.levelText.setText(`Level: ${this.currentLevel + 1}`);
    }
    if (this.enemiesText) {
      this.enemiesText.setText(`Enemies: ${this.enemiesRemaining}`);
    }
    if (this.attemptsText) {
      this.attemptsText.setText(`Total: ${this.launchAttempts}`);
    }
    if (this.levelAttemptsText) {
      const remaining = this.maxAttemptsPerLevel - this.currentLevelAttempts;
      const color =
        remaining <= 1 ? "#ff0000" : remaining === 2 ? "#ffaa00" : "#ff6666";
      this.levelAttemptsText.setText(
        `Attempt: ${this.currentLevelAttempts}/${this.maxAttemptsPerLevel}`
      );
      this.levelAttemptsText.setColor(color);
    }
  }

  /**
   * Initialize scene state and start first level
   */
  initializeScene() {
    // Reset game state
    this.currentLevel = 0;
    this.score = 0;
    this.enemiesRemaining = 0;
    this.launchAttempts = 0;
    this.currentLevelAttempts = 0;
    this.gameOver = false;

    // Update HUD
    this.updateHUD();

    //console.log("✅ Scene state initialized");
  }

  /**
   * Clear existing candlesticks, blocks, and enemies for level transitions
   */
  clearCandlesticks() {
    // Clear all candlestick barriers (containers and their blocks)
    this.candlestickSprites.forEach((candlestickData) => {
      if (candlestickData.container) {
        candlestickData.container.destroy();
      }
      if (candlestickData.blocks) {
        candlestickData.blocks.forEach((block) => {
          if (block.body) {
            block.body.destroy();
          }
          block.destroy();
        });
      }
    });

    // Clear physics groups
    this.candlesticks.clear(true, true);
    this.blocks.clear(true, true);
    this.enemies.clear(true, true);

    // Clear candlestick sprites array
    this.candlestickSprites = [];

    //console.log("🧹 Cleared existing candlesticks, blocks, and enemies");
  }

  /**
   * Generate candlestick barriers for the current level
   */
  generateCandlestickBarriers() {
    // Clear existing candlesticks
    this.clearCandlesticks();

    // Reset enemy counters and level attempts (but keep cumulative launch attempts)
    this.enemiesRemaining = 0;
    this.totalEnemiesInLevel = 0;
    this.currentLevelAttempts = 0; // Reset attempts for new level
    // Note: launchAttempts is NOT reset - it's cumulative across all levels

    const levelData = this.candlestickData[this.currentLevel];
    if (!levelData) {
      console.warn(`⚠️ No data found for level ${this.currentLevel}`);
      return;
    }

    const candlesticks = levelData.candlesticks;
    const startX = 350; // Start position closer to launcher (reduced from 400)
    const barWidth = 30; // Thinner candlestick barriers (reduced from 40)
    const spacing = 80; // Reduced spacing between barriers (reduced from 100)

    //console.log(`📊 Generating ${candlesticks.length} candlestick barriers for level ${this.currentLevel}: ${levelData.name}` );

    candlesticks.forEach((candle, index) => {
      const x = startX + index * spacing;

      // Create candlestick barrier (replaces fixed-height platform)
      const {
        barrier: _barrier,
        topY,
        height,
      } = this.createCandlestickBarrier(x, this.groundY, candle, barWidth);

      // Calculate distance from launcher to determine if structures should be built
      const launcherX = 160;
      const distanceFromLauncher = Math.abs(x - launcherX);

      // Build structures with higher probability for distant candlesticks
      // Near launcher: 40% chance, far from launcher: 80% chance
      const distanceFactor = Math.min(distanceFromLauncher / 800, 1);
      const structureProbability = 0.4 + distanceFactor * 0.4; // 40%-80%

      // Always build on some candlesticks, more likely on distant ones
      const shouldBuildStructure =
        index % 3 === 0 || Math.random() < structureProbability;

      if (shouldBuildStructure) {
        this.generateBlocksOnCandlestickTop(
          x,
          topY, // Top of the candlestick barrier
          barWidth, // Width for block placement
          candle, // Candle data for structure variation
          height // Barrier height for difficulty scaling
        );
      }

      // Removed: displayMinimalPriceIndicator call (cleaner UI)
    });

    // Update total enemies count
    this.totalEnemiesInLevel = this.enemiesRemaining;

    // Update HUD with new enemy count
    this.updateHUD();

    //console.log(`✅ Generated ${candlesticks.length} candlestick barriers with variable heights and ${this.enemiesRemaining} enemies`);
  }

  /**
   * Create a candlestick barrier with height based on price volatility
   * @param {number} x - X position
   * @param {number} groundY - Ground Y position
   * @param {object} candle - OHLC candle data
   * @param {number} barWidth - Width of the barrier
   * @returns {object} Barrier data with sprite and topY position
   */
  createCandlestickBarrier(x, groundY, candle, barWidth) {
    // Calculate height based on high-low range
    const priceRange = candle.high - candle.low;
    const maxRange = this.getMaxPriceRangeForLevel();
    const MIN_HEIGHT = 50; // Minimum barrier height (1 block) - reduced from 100
    const MAX_HEIGHT = 150; // Maximum barrier height (3 blocks) - reduced from 350

    const scaledHeight = Math.max(
      MIN_HEIGHT,
      Math.min(MAX_HEIGHT, (priceRange / maxRange) * MAX_HEIGHT)
    );

    // Determine color based on bull/bear market
    const candleType =
      candle.close >= candle.open ? "green-candle" : "red-candle";

    // Calculate number of blocks needed (each block is 50px)
    const blockSize = 50;
    const numBlocks = Math.ceil(scaledHeight / blockSize);

    // Create container for candlestick blocks
    const candlestickContainer = this.add.container(x, 0);

    // Create stacked blocks
    const candlestickBlocks = [];
    for (let i = 0; i < numBlocks; i++) {
      const blockY = groundY - i * blockSize - blockSize / 2;
      const block = this.add.image(x, blockY, candleType); // Use absolute position for physics
      block.setDisplaySize(barWidth, blockSize);

      // Add to candlesticks physics group for collision detection
      this.candlesticks.add(block);
      block.body.setSize(barWidth, blockSize);

      candlestickBlocks.push(block);
    }

    // Store references for cleanup
    this.candlestickSprites.push({
      container: candlestickContainer,
      blocks: candlestickBlocks,
      data: candle,
      height: numBlocks * blockSize,
    });

    // Return barrier info and top position for block placement
    return {
      barrier: candlestickContainer,
      topY: groundY - numBlocks * blockSize,
      height: numBlocks * blockSize,
    };
  }

  /**
   * Get maximum price range for the current level (for height scaling)
   * @returns {number} Maximum price range in the current level
   */
  getMaxPriceRangeForLevel() {
    const levelData = this.candlestickData[this.currentLevel];
    if (!levelData || !levelData.candlesticks.length) return 1;

    return Math.max(...levelData.candlesticks.map((c) => c.high - c.low));
  }

  /**
   * Generate blocks on top of a candlestick barrier with distance-based enemy stacking
   * @param {number} x - X position
   * @param {number} topY - Top Y position of the candlestick barrier
   * @param {number} width - Width for block placement
   * @param {object} candle - Candle data for structure variation
   * @param {number} barrierHeight - Height of the barrier for difficulty scaling
   */
  generateBlocksOnCandlestickTop(x, topY, width, candle, _barrierHeight) {
    // Determine structure complexity based on barrier height and candle volatility
    const priceRange = candle.high - candle.low;
    const maxRange = this.getMaxPriceRangeForLevel();
    const volatilityFactor = priceRange / maxRange;

    // Use the same width as barrier blocks for consistency (passed as 'width' parameter = 30px)
    const blockWidth = width; // Use barrier width (30px) instead of fixed 25px
    const blockHeight = 20;

    // Calculate distance from launcher for difficulty scaling
    const launcherX = 160; // Launcher position
    const distanceFromLauncher = Math.abs(x - launcherX);
    const maxDistance = 1000; // Maximum expected distance across level
    const distanceFactor = Math.min(distanceFromLauncher / maxDistance, 1);

    // Determine stack height based on volatility AND distance from launcher
    // Near launcher: 2-3 elements, farther: 4-7 elements
    const baseStackHeight = Math.floor(2 + volatilityFactor * 2); // 2-4 base
    const distanceBonus = Math.floor(distanceFactor * 3); // 0-3 additional elements
    const stackHeight = Math.min(baseStackHeight + distanceBonus, 7); // Cap at 7 elements

    // Calculate enemy density - significantly more enemies farther from launcher
    const baseEnemyChance = 0.3; // 30% base chance
    const distanceEnemyBonus = distanceFactor * 0.4; // Up to 40% additional chance
    const enemyDensity = Math.min(baseEnemyChance + distanceEnemyBonus, 0.8); // Cap at 80%

    let _enemiesCreated = 0;
    let _blocksCreated = 0;

    // Create stack with smart enemy/block distribution
    for (let layer = 0; layer < stackHeight; layer++) {
      const elementY = topY - layer * blockHeight - blockHeight / 2;

      // Layer 0 (bottom) is always a block for stability
      if (layer === 0) {
        this.createDestructibleBlock(
          x,
          elementY,
          blockWidth,
          blockHeight,
          layer
        );
        _blocksCreated++;
        continue;
      }

      // For other layers, decide based on distance and random chance
      const shouldCreateEnemy = Math.random() < enemyDensity;

      if (shouldCreateEnemy) {
        // Create enemy
        this.createEnemy(x, elementY);
        _enemiesCreated++;
      } else {
        // Create block
        this.createDestructibleBlock(
          x,
          elementY,
          blockWidth,
          blockHeight,
          layer
        );
        _blocksCreated++;
      }
    }
  }

  /**
   * Create a destructible block sprite with physics
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Block width
   * @param {number} height - Block height
   * @param {number} layer - Layer index for color variation
   */
  createDestructibleBlock(x, y, width, height, _layer) {
    // Randomly select between dest and dest2 sprites
    const blockSprites = ["dest-block", "dest2-block"];
    const randomSprite =
      blockSprites[Math.floor(Math.random() * blockSprites.length)];

    // Create block sprite using the randomly selected sprite
    const block = this.add.image(x, y, randomSprite);

    // Scale to match the barrier width (use width parameter instead of fixed 50px)
    // This ensures destructible blocks match the candlestick barrier size (30px)
    block.setDisplaySize(width, height);

    // Add to physics group manually
    this.physics.add.existing(block, true); // true makes it static/immovable
    this.blocks.add(block);

    // Set physics body size to match the scaled sprite
    block.body.setSize(width, height);

    return block;
  }

  /**
   * Create an enemy sprite with basic properties
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  createEnemy(x, y) {
    // Randomly select one of the 4 enemy variants
    const enemyVariants = [
      "enemy-var1",
      "enemy-var2",
      "enemy-var3",
      "enemy-var4",
    ];
    const randomVariant =
      enemyVariants[Math.floor(Math.random() * enemyVariants.length)];

    // Create enemy sprite using the randomly selected variant
    const enemy = this.add.sprite(x, y, randomVariant);

    // Scale the enemy sprite to appropriate size
    enemy.setScale(0.8); // Increased from 0.6 to 0.8 for better visibility

    // Add to physics group manually
    this.physics.add.existing(enemy);
    this.enemies.add(enemy);

    // Set collision body size to match the scaled sprite dimensions
    // Since the sprite is scaled to 0.8, the effective size is 40x40px
    enemy.body.setSize(40, 40);
    enemy.body.setOffset(5, 5); // Center the collision body on the sprite

    // Make enemies immovable so they don't fall or move around
    enemy.body.setImmovable(true);
    enemy.body.moves = false; // Completely disable physics movement

    // Add basic AI properties
    enemy.shouldMove = false; // Static positioning - no movement
    enemy.moveDirection = Math.random() > 0.5 ? 1 : -1; // Random initial direction (unused)
    enemy.moveSpeed = 0; // No movement speed

    // Remove physics properties that would cause movement
    // enemy.body.setBounce(0.2); // Removed - don't want bouncing
    // enemy.body.setCollideWorldBounds(true); // Removed - not needed for static enemies

    // Store the variant type for potential future use
    enemy.variantType = randomVariant;

    // Increment enemy counter
    this.enemiesRemaining++;

    return enemy;
  }

  /**
   * Create rocket launcher system
   */
  createLauncher() {
    // Create launcher sprite using actual launcher image (positioned on left side)
    this.launcher = this.add
      .image(160, this.groundY - 25, "launcher") // Use actual launcher sprite
      .setOrigin(0.5, 0.5) // Pivot at center for proper rotation
      .setScale(1.2) // Slightly larger launcher
      .setFlipX(true); // Flip horizontally so launcher mouth faces right

    // Set initial rotation based on launch angle
    this.updateLauncherRotation();

    // Create angle control slider (15°-75° range) - vertical, left of launcher
    this.angleSlider = UIComponents.createVerticalSlider(
      this,
      50, // Moved further left
      this.groundY - 200, // Moved higher up
      15,
      75,
      this.launchAngle,
      (value) => {
        this.launchAngle = Math.round(value);
        this.updateLauncherRotation();
        this.updateControlDisplay();
        this.showTemporaryTrajectory(); // Show trajectory temporarily
        // Start timer when slider is adjusted
        if (this.keyboardTimerController) {
          this.keyboardTimerController.startTimer();
        }
      },
      150 // height of vertical slider, increased
    );

    // Create power control slider (0-100% range) - vertical, between angle and launcher
    this.powerSlider = UIComponents.createVerticalSlider(
      this,
      100, // Adjusted x position
      this.groundY - 200, // Moved higher up
      0,
      100,
      this.launchPower,
      (value) => {
        this.launchPower = Math.round(value);
        this.updateControlDisplay();
        this.showTemporaryTrajectory(); // Show trajectory temporarily
        // Start timer when slider is adjusted
        if (this.keyboardTimerController) {
          this.keyboardTimerController.startTimer();
        }
      },
      150 // height of vertical slider, increased
    );

    // Create launch button (positioned above the ground)
    this.launchButton = UIComponents.createButton(
      this,
      150,
      this.groundY + 25, // Moved above ground level
      "LAUNCH",
      () => this.launchRocket(),
      {
        width: 120, // Wider button
        height: 40, // Taller button
        fontSize: "20px", // Increased font size for Pixelify Sans
        fill: 0x8a2be2, // Purple background
        hoverFill: 0x7b68ee, // Lighter purple on hover
        textColor: "#ffffff", // White text for contrast
        fontFamily: "Pixelify Sans, Arial", // Add Pixelify Sans font
      }
    );

    // Create end game button (positioned next to launch button)
    this.endGameButton = UIComponents.createButton(
      this,
      290, // Positioned to the right of launch button
      this.groundY + 25, // Same height as launch button
      "END GAME",
      () => this.endGameManually(),
      {
        width: 120, // Same width as launch button
        height: 40, // Same height as launch button
        fontSize: "16px", // Slightly smaller font for longer text
        fill: 0xdc143c, // Crimson red background
        hoverFill: 0xff6347, // Tomato red on hover
        textColor: "#ffffff", // White text for contrast
        fontFamily: "Pixelify Sans, Arial", // Same font family
      }
    );

    // Create control display labels
    this.createControlLabels();

    //console.log("✅ Launcher controls created");
  }

  /**
   * Update launcher rotation based on launch angle
   */
  updateLauncherRotation() {
    // Convert angle to radians and apply rotation
    // Since the launcher mouth points down, rotate 25 degrees counterclockwise to point righ8
    // (45 - 20 = 25 degrees, adding 20 degrees clockwise from previous position)
    const baseRotation = -Math.PI / 8; // -25 degrees (45 - 20 = 25)
    const angleRad = Phaser.Math.DegToRad(-this.launchAngle) + baseRotation;
    this.launcher.setRotation(angleRad);
  }

  /**
   * Create control display labels
   */
  createControlLabels() {
    // Angle label and value (for vertical slider on far left)
    this.add
      .text(50, this.groundY - 200 - 90, "Angle:", {
        // Adjusted position to be above slider
        fontSize: "18px", // Increased from 16px
        fill: "#ffffff",
        fontFamily: "Pixelify Sans, Arial",
        stroke: "#000000", // Add black outline for better visibility
        strokeThickness: 1,
      })
      .setOrigin(0.5, 0.5);

    this.angleText = this.add
      .text(50, this.groundY - 200 + 90, `${this.launchAngle}°`, {
        // Adjusted position to be below slider
        fontSize: "20px", // Increased from 18px
        fill: "#ffff00",
        fontFamily: "Pixelify Sans, Arial",
        stroke: "#000000", // Add black outline for better visibility
        strokeThickness: 1,
      })
      .setOrigin(0.5, 0.5);

    // Power label and value (for vertical slider in middle)
    this.add
      .text(100, this.groundY - 200 - 90, "Power:", {
        // Adjusted position to be above slider
        fontSize: "18px", // Increased from 16px
        fill: "#ffffff",
        stroke: "#000000", // Add black outline for better visibility
        strokeThickness: 1,
        fontFamily: "Pixelify Sans, Arial",
      })
      .setOrigin(0.5, 0.5);

    this.powerText = this.add
      .text(100, this.groundY - 200 + 90, `${this.launchPower}%`, {
        // Adjusted position to be below slider
        fontSize: "20px", // Increased from 18px
        fill: "#ff6b6b",
        fontFamily: "Pixelify Sans, Arial",
        stroke: "#000000", // Add black outline for better visibility
        strokeThickness: 1,
      })
      .setOrigin(0.5, 0.5);
  }

  /**
   * Update control display values
   */
  updateControlDisplay() {
    if (this.angleText) {
      this.angleText.setText(`${this.launchAngle}°`);
    }
    if (this.powerText) {
      this.powerText.setText(`${this.launchPower}%`);
    }

    // Update slider handle positions to match keyboard changes
    this.updateSliderPositions();
  }

  /**
   * Update slider handle positions to match current values
   */
  updateSliderPositions() {
    // Update angle slider handle position
    if (this.angleSlider && this.angleSlider.handle) {
      const angleSliderConfig = {
        min: 15,
        max: 75,
        height: 150,
        centerY: this.groundY - 200,
      };

      const angleProgress =
        (this.launchAngle - angleSliderConfig.min) /
        (angleSliderConfig.max - angleSliderConfig.min);
      const angleHandleY =
        angleSliderConfig.centerY +
        angleSliderConfig.height / 2 -
        angleProgress * angleSliderConfig.height;
      this.angleSlider.handle.y = angleHandleY;
    }

    // Update power slider handle position
    if (this.powerSlider && this.powerSlider.handle) {
      const powerSliderConfig = {
        min: 0,
        max: 100,
        height: 150,
        centerY: this.groundY - 200,
      };

      const powerProgress =
        (this.launchPower - powerSliderConfig.min) /
        (powerSliderConfig.max - powerSliderConfig.min);
      const powerHandleY =
        powerSliderConfig.centerY +
        powerSliderConfig.height / 2 -
        powerProgress * powerSliderConfig.height;
      this.powerSlider.handle.y = powerHandleY;
    }
  }

  /**
   * Launch rocket with current angle and power settings
   */
  launchRocket() {
    // Validate launch conditions
    if (!this.canLaunch) {
      //console.log("⚠️ Cannot launch - rocket already in flight");
      return;
    }

    if (this.launchPower <= 0) {
      //console.log("⚠️ Cannot launch - power must be greater than 0");
      return;
    }

    // Clear trajectory preview during flight
    this.trajectoryGraphics.clear();

    // Calculate launch velocity components
    const angleRad = Phaser.Math.DegToRad(this.launchAngle);
    const speed = (this.launchPower / 100) * this.maxLaunchSpeed;

    const velocityX = Math.cos(angleRad) * speed;
    const velocityY = -Math.sin(angleRad) * speed; // Negative for upward movement

    // Create rocket sprite at launcher position
    const rocket = this.rockets.create(
      this.launcher.x + Math.cos(angleRad) * 30, // Offset from launcher
      this.launcher.y - Math.sin(angleRad) * 30,
      "rocket"
    );

    // Set rocket physics properties
    rocket.setVelocity(velocityX, velocityY);
    rocket.setRotation(angleRad + Math.PI / 2); // Rotate rocket to match trajectory (+ π/2 for proper orientation)
    rocket.setBounce(0.1); // Reduced bounce for more realistic physics
    // Note: No setDrag() here - air resistance is handled in updateRocketPhysics()
    rocket.setScale(1.0); // Use actual rocket image size (50px)

    // Fix rocket hitbox - reduce size and center it to match actual texture
    rocket.body.setSize(35, 35); // Reduce from default 50x50 to 35x35 to match actual texture
    rocket.body.setOffset(7.5, 7.5); // Center the smaller hitbox on the 50x50 sprite

    // Add custom properties for enhanced physics
    rocket.initialVelocityX = velocityX;
    rocket.initialVelocityY = velocityY;
    rocket.trailPoints = [];
    rocket.explosionTriggered = false;

    // Disable launching until rocket is destroyed
    this.canLaunch = false;

    // Reset timer when rocket is launched
    if (this.keyboardTimerController) {
      this.keyboardTimerController.stopTimer();
    }

    // Increment both total attempts and current level attempts
    this.launchAttempts++;
    this.currentLevelAttempts++;

    // Update HUD to reflect new attempt counts
    this.updateHUD();
  }

  /**
   * Create trajectory prediction system
   */
  createTrajectorySystem() {
    // Create graphics object for trajectory line
    this.trajectoryGraphics = this.add.graphics();

    // Initial trajectory calculation
    this.updateTrajectory();

    //console.log("📈 Trajectory prediction system created");
  }

  /**
   * Calculate and update trajectory preview
   */
  updateTrajectory() {
    if (!this.trajectoryGraphics || !this.showTrajectory) {
      return;
    }

    // Clear previous trajectory
    this.trajectoryGraphics.clear();

    // Calculate trajectory physics
    const trajectoryPoints = this.calculateTrajectoryPoints();

    if (trajectoryPoints.length > 0) {
      this.renderTrajectoryLine(trajectoryPoints);
    }
  }

  /**
   * Show trajectory temporarily when adjusting sliders
   */
  showTemporaryTrajectory() {
    // Clear any existing timer
    if (this.trajectoryTimer) {
      this.trajectoryTimer.destroy();
    }

    // Show trajectory immediately
    this.updateTrajectory();

    // Set timer to hide trajectory after delay
    this.trajectoryTimer = this.time.delayedCall(
      this.trajectoryDisplayTime,
      () => {
        this.trajectoryGraphics.clear();
        this.trajectoryTimer = null;
      }
    );
  }

  /**
   * Calculate parabolic trajectory points (limited to 75% of full path)
   */
  calculateTrajectoryPoints() {
    const points = [];

    // Initial conditions
    const angleRad = Phaser.Math.DegToRad(this.launchAngle);
    const speed = (this.launchPower / 100) * this.maxLaunchSpeed;

    // Initial velocity components
    const v0x = Math.cos(angleRad) * speed;
    const v0y = -Math.sin(angleRad) * speed; // Negative for upward movement

    // Starting position (from launcher)
    const startX = this.launcher.x + Math.cos(angleRad) * 30;
    const startY = this.launcher.y - Math.sin(angleRad) * 30;

    // Calculate trajectory points over time
    const timeStep = 0.05; // 50ms intervals
    const maxTime = 5.0; // 5 seconds maximum

    for (let t = 0; t <= maxTime; t += timeStep) {
      // Physics equations: x = x0 + v0x*t, y = y0 + v0y*t + 0.5*g*t^2
      const x = startX + v0x * t;
      const y = startY + v0y * t + 0.5 * this.gravity * t * t;

      // Stop calculating if trajectory goes below ground or off screen
      if (y >= this.groundY || x > 1200 || x < 0) {
        break;
      }

      points.push({ x, y });
    }

    // Limit to 75% of the trajectory points
    const limitedPoints = points.slice(0, Math.floor(points.length * 0.75));

    this.trajectoryPoints = limitedPoints;
    return limitedPoints;
  }

  /**
   * Render trajectory preview line
   */
  renderTrajectoryLine(points) {
    if (points.length < 2) return;

    // Draw trajectory as dark gray dots for better visibility
    this.trajectoryGraphics.fillStyle(0x404040, 0.9); // Dark gray dots with high opacity

    // Draw dots for every point (not every 5th)
    for (let i = 0; i < points.length; i++) {
      this.trajectoryGraphics.fillCircle(points[i].x, points[i].y, 2);
    }
  }

  // Collision callback functions
  onRocketHitGround(rocket, _ground) {
    //console.log("💥 Rocket hit ground");
    this.triggerExplosion(rocket.x, rocket.y);

    // Clean up rocket trail graphics
    if (rocket.trailGraphics) {
      rocket.trailGraphics.destroy();
      rocket.trailGraphics = null;
    }
    rocket.trailPoints = []; // Clear trail points

    rocket.setActive(false).setVisible(false);
    rocket.destroy();
    this.canLaunch = true;
    this.checkLevelEndConditions(); // Check if this was the last attempt
  }

  /**
   * Handle rocket collision with candlestick barrier
   * @param {Phaser.GameObjects.Sprite} rocket
   * @param {Phaser.GameObjects.Sprite} candlestick
   */
  onRocketHitCandlestick(rocket, _candlestick) {
    //console.log("💥 Rocket hit candlestick");
    this.triggerExplosion(rocket.x, rocket.y);
    // candlestick.destroy(); // Make candlesticks destructible if desired

    // Clean up rocket trail graphics
    if (rocket.trailGraphics) {
      rocket.trailGraphics.destroy();
      rocket.trailGraphics = null;
    }
    rocket.trailPoints = []; // Clear trail points

    rocket.setActive(false).setVisible(false);
    rocket.destroy();
    this.canLaunch = true;
    this.checkLevelEndConditions();
  }

  /**
   * Handle rocket collision with a block
   * @param {Phaser.GameObjects.Sprite} rocket
   * @param {Phaser.GameObjects.Sprite} block
   */
  onRocketHitBlock(rocket, block) {
    //console.log("💥 Rocket hit block");
    this.triggerExplosion(rocket.x, rocket.y);
    block.destroy(); // Blocks are destructible
    this.score += 5; // Score for destroying a block
    this.updateHUD();

    // Clean up rocket trail graphics
    if (rocket.trailGraphics) {
      rocket.trailGraphics.destroy();
      rocket.trailGraphics = null;
    }
    rocket.trailPoints = []; // Clear trail points

    rocket.setActive(false).setVisible(false);
    rocket.destroy();
    this.canLaunch = true;
    this.checkLevelEndConditions();
  }

  /**
   * Handle rocket collision with an enemy
   * @param {Phaser.GameObjects.Sprite} rocket
   * @param {Phaser.GameObjects.Sprite} enemy
   */
  onRocketHitEnemy(rocket, enemy) {
    //console.log("💥 Rocket hit enemy");
    this.triggerExplosion(enemy.x, enemy.y); // Explode at enemy's position
    enemy.destroy();
    this.enemiesRemaining--;
    this.score += 10; // Score for hitting an enemy
    this.updateHUD();

    // Clean up rocket trail graphics
    if (rocket.trailGraphics) {
      rocket.trailGraphics.destroy();
      rocket.trailGraphics = null;
    }
    rocket.trailPoints = []; // Clear trail points

    rocket.setActive(false).setVisible(false);
    rocket.destroy();
    this.canLaunch = true;
    this.checkLevelEndConditions();
  }

  /**
   * Trigger explosion effect with damage calculation
   * @param {number} x
   * @param {number} y
   */
  triggerExplosion(x, y) {
    // Use the comprehensive explosion system
    this.createExplosion(x, y);
    this.handleExplosionDamage(x, y);
  }

  /**
   * Check level end conditions (all enemies defeated or out of attempts)
   */
  checkLevelEndConditions() {
    if (this.gameOver) return;

    if (this.enemiesRemaining <= 0) {
      this.completeLevel();
    } else if (
      this.currentLevelAttempts >= this.maxAttemptsPerLevel &&
      this.canLaunch
    ) {
      // Only fail level if player can launch again (meaning previous rocket finished)
      // and there are still enemies.
      this.levelFailed();
    }
  }

  /**
   * Destroy rocket with explosion effect
   */
  destroyRocket(rocket) {
    // Create explosion at rocket position
    this.createExplosion(rocket.x, rocket.y);

    // Check for explosion damage to nearby objects
    this.handleExplosionDamage(rocket.x, rocket.y);

    // Clean up rocket trail graphics
    if (rocket.trailGraphics) {
      rocket.trailGraphics.destroy();
      rocket.trailGraphics = null;
    }

    // Clear trail points
    rocket.trailPoints = [];

    // Destroy the rocket
    rocket.destroy();

    // Re-enable launching
    this.canLaunch = true;

    // Reset timer when rocket is destroyed
    if (this.keyboardTimerController) {
      this.keyboardTimerController.reset();
    }

    // Check if level failed after using all attempts
    if (this.currentLevelAttempts >= this.maxAttemptsPerLevel) {
      // Check if there are still enemies remaining
      const actualEnemiesRemaining = this.enemies.children.entries.length;
      if (this.enemiesRemaining > 0 || actualEnemiesRemaining > 0) {
        this.levelFailed();
        return;
      }
    }

    //console.log("💥 Rocket exploded - ready for next launch");
  }

  /**
   * Create visual explosion effect with particles
   */
  createExplosion(x, y) {
    // Create explosion circle that expands and fades
    const explosionCircle = this.add.circle(x, y, 5, 0x8000ff, 0.8);

    // Animate explosion expansion
    this.tweens.add({
      targets: explosionCircle,
      radius: this.explosionSize,
      alpha: 0,
      duration: 400,
      ease: "Power2",
      onComplete: () => {
        explosionCircle.destroy();
      },
    });

    // Create particle explosion effect
    const particles = this.add.particles(x, y, "rocket", {
      speed: { min: 80, max: 200 }, // Increased speed for larger explosion
      scale: { start: 0.4, end: 0 }, // Slightly larger particles
      tint: [0x8000ff, 0xaa00ff, 0xffffff], // Brighter purple ascent colors for dark theme
      lifespan: 500, // Longer lifespan for more impact
      quantity: 18, // More particles for better coverage
    });

    // Clean up particles after explosion
    this.time.delayedCall(500, () => {
      particles.destroy();
    });

    // Add stronger screen shake effect for larger explosion
    this.cameras.main.shake(300, 0.015);
  }

  /**
   * Handle explosion damage to nearby objects
   */
  handleExplosionDamage(explosionX, explosionY) {
    const explosionRadius = this.explosionSize;
    let enemiesDestroyed = 0;

    // Check damage to blocks
    this.blocks.children.entries.forEach((block) => {
      const distance = Phaser.Math.Distance.Between(
        explosionX,
        explosionY,
        block.x,
        block.y
      );

      if (distance <= explosionRadius) {
        this.destroyBlock(block);
      }
    });

    // Check damage to enemies
    this.enemies.children.entries.forEach((enemy) => {
      const distance = Phaser.Math.Distance.Between(
        explosionX,
        explosionY,
        enemy.x,
        enemy.y
      );

      if (distance <= explosionRadius) {
        this.destroyEnemy(enemy);
        this.score += 10;
        this.enemiesRemaining--;
        enemiesDestroyed++;
      }
    });

    // Update HUD if enemies were destroyed
    if (enemiesDestroyed > 0) {
      this.updateHUD();

      // Check if level is complete after explosion damage (verify both counters)
      const actualEnemiesRemaining = this.enemies.children.entries.length;
      if (this.enemiesRemaining <= 0 && actualEnemiesRemaining <= 0) {
        this.completeLevel();
      }
    }
  }

  /**
   * Destroy block with breaking effect
   */
  destroyBlock(block) {
    // Create breaking effect with small particles
    const particles = this.add.particles(block.x, block.y, 0x9900ff, {
      speed: { min: 30, max: 80 },
      scale: { start: 0.5, end: 0.1 },
      tint: 0x9900ff,
      lifespan: 200,
      quantity: 4,
    });

    // Clean up particles
    this.time.delayedCall(300, () => {
      particles.destroy();
    });

    block.destroy();
    //console.log("🧱 Block destroyed with breaking effect");
  }

  /**
   * Destroy enemy and update score
   */
  destroyEnemy(enemy) {
    // Play enemy destroy sound
    if (this.sounds.enemyDestroy) {
      this.sounds.enemyDestroy.play();
    }

    // Create enemy death effect
    const deathEffect = this.add.circle(enemy.x, enemy.y, 15, 0x8000ff, 0.6);

    // Animate death effect
    this.tweens.add({
      targets: deathEffect,
      radius: 30,
      alpha: 0,
      duration: 300,
      ease: "Power2",
      onComplete: () => {
        deathEffect.destroy();
      },
    });

    // Add score popup effect
    const scoreText = this.add
      .text(enemy.x, enemy.y - 20, "+10", {
        fontSize: "16px",
        fill: "#aa00ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Animate score popup
    this.tweens.add({
      targets: scoreText,
      y: enemy.y - 40,
      alpha: 0,
      duration: 800,
      ease: "Power2",
      onComplete: () => {
        scoreText.destroy();
      },
    });

    enemy.destroy();
    //console.log("👾 Enemy destroyed with death effect");
  }

  /**
   * Handle level completion
   */
  completeLevel() {
    // Play level complete sound
    if (this.sounds.levelComplete) {
      this.sounds.levelComplete.play();
    }

    // Double-check enemy count from actual enemies still in the scene
    const actualEnemiesRemaining = this.enemies.children.entries.length;

    // Don't complete if there were no enemies generated
    if (this.totalEnemiesInLevel === 0) {
      //console.log("⚠️ Level has no enemies - progressing to next level");
      this.nextLevel();
      return;
    }

    // Ensure all enemies are actually destroyed before completing (check both counters)
    if (this.enemiesRemaining > 0 || actualEnemiesRemaining > 0) {
      // Sync counters if they're out of sync
      if (this.enemiesRemaining !== actualEnemiesRemaining) {
        this.enemiesRemaining = actualEnemiesRemaining;
        this.updateHUD();
      }
      return;
    }

    // Add bonus score for level completion
    this.score += 50;

    // Add efficiency bonus for completing with fewer attempts
    const maxAttempts = 10;
    if (this.launchAttempts <= maxAttempts) {
      const efficiencyBonus = Math.max(
        0,
        (maxAttempts - this.launchAttempts) * 5
      );
      this.score += efficiencyBonus;
      //console.log(`✨ Efficiency bonus: +${efficiencyBonus} points`);
    }

    this.updateHUD();

    // Submit score to blockchain with verification
    this.submitScoreToBlockchainWithVerification();

    // Check if this was the final level
    if (this.currentLevel >= this.maxLevels - 1) {
      this.gameComplete();
      return;
    }

    // Progress to next level automatically
    this.nextLevel();
  }

  /**
   * Get total number of enemies that should be in the current level
   */
  getTotalEnemiesInLevel() {
    // Count enemies that were generated (this should be called after generation)
    return this.enemies.children.entries.length + this.enemiesRemaining;
  }

  /**
   * Progress to the next level
   */
  nextLevel() {
    this.currentLevel++;

    // Reset level attempts for new level
    this.currentLevelAttempts = 0;

    // Clear current level
    this.clearCandlesticks();

    // Generate new candlestick barriers for next level
    this.generateCandlestickBarriers();

    // Reset level state (will be set during generation)
    this.updateHUD();

    // Show level transition message
    this.showLevelTransition();
    
    // Continue background music (already playing)
  }

  /**
   * Show level transition message
   */
  showLevelTransition() {
    const levelData = this.candlestickData[this.currentLevel];

    // Create level transition overlay
    const overlay = this.add.rectangle(600, 300, 1200, 600, 0x000000, 0.7);

    // Level title
    const titleText = this.add
      .text(600, 250, `LEVEL ${this.currentLevel + 1}`, {
        fontSize: "54px", // Increased from 48px
        fill: "#ffffff",
        fontStyle: "bold",
        fontFamily: "Pixelify Sans, Arial",
      })
      .setOrigin(0.5);

    // Level name
    const nameText = this.add
      .text(600, 310, levelData.name, {
        fontSize: "28px", // Increased from 24px
        fill: "#ffaa00",
        fontFamily: "Pixelify Sans, Arial",
      })
      .setOrigin(0.5);

    // Difficulty
    const difficultyText = this.add
      .text(600, 350, `Difficulty: ${levelData.difficulty}`, {
        fontSize: "20px", // Increased from 18px
        fill: "#aaaaaa",
        fontFamily: "Pixelify Sans, Arial",
      })
      .setOrigin(0.5);

    // Fade out transition after 2 seconds
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [overlay, titleText, nameText, difficultyText],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          overlay.destroy();
          titleText.destroy();
          nameText.destroy();
          difficultyText.destroy();
        },
      });
    });
  }

  /**
   * Handle level failure when max attempts are exceeded
   */
  levelFailed() {
    // Check if this is the final level (level 7, index 6)
    if (this.currentLevel >= this.maxLevels - 1) {
      // Play game over sound
      if (this.sounds.gameOver) {
        this.sounds.gameOver.play();
      }

      // Final level failed - end the game
      this.gameOver = true;
      this.canLaunch = false;

      // Submit final score to blockchain before ending
      this.submitFinalScoreToBlockchain("game-failed");

      // Stop all sounds before transitioning
      this.sound.stopAll();
      
      // Transition to EndGameScene with failure data
      this.scene.start("EndGameScene", {
        score: this.score,
        totalAttempts: this.launchAttempts,
        levelsCompleted: this.currentLevel, // Levels completed before failure
        reason: "failed",
      });
    } else {
      // Not final level - progress to next level despite failure
      // Add small penalty for failing a level (optional)
      // this.score = Math.max(0, this.score - 10);

      // Progress to next level
      this.nextLevel();
    }
  }

  /**
   * Handle game completion
   */
  gameComplete() {
    //console.log("🏆 GAME COMPLETED! All levels finished!");

    this.gameOver = true;
    this.canLaunch = false;

    // Play game over sound for victory
    if (this.sounds.gameOver) {
      this.sounds.gameOver.play();
    }

    // Submit final score to blockchain before ending
    this.submitFinalScoreToBlockchain("game-complete");

    // Stop all sounds before transitioning
    this.sound.stopAll();
    
    // Transition to EndGameScene with victory data
    this.scene.start("EndGameScene", {
      score: this.score,
      totalAttempts: this.launchAttempts,
      levelsCompleted: this.maxLevels, // All levels completed
      reason: "completed",
    });
  }

  /**
   * Submit final score to blockchain with game completion status
   * @param {string} gameResult - "game-complete" or "game-failed"
   */
  async submitFinalScoreToBlockchain(gameResult) {
    if (!this.walletConnected || !this.web3Service) {
      //console.log("⚠️ Wallet not connected, skipping final score submission");
      return;
    }

    try {
      //console.log(`📝 Submitting FINAL score to blockchain: ${gameResult}...`);

      // Submit final score with game result indicator
      const _scoreResult = await this.web3Service.submitScore(
        `final-${gameResult}`, // Use special level identifier for final scores
        this.score
      );

      //console.log("✅ Final score submitted:", scoreResult.transactionHash);

      // Calculate final RocketFUEL reward based on total score and completion status
      const baseReward = Math.max(20, Math.floor(this.score / 50)); // Higher reward for final score
      const completionBonus = gameResult === "game-complete" ? 50 : 10; // Bonus for completing all levels
      const finalReward = baseReward + completionBonus;

      // Reward RocketFUEL tokens for final score
      const _rocketFuelResult = await this.web3Service.rewardFuel(finalReward);

      // Update balance
      this.loadRocketFuelBalance();

      // Show success message
      this.showBlockchainSuccessMessage(finalReward, "Final Score Saved!");
    } catch (error) {
      console.error("Failed to submit final score to blockchain:", error);
      this.showBlockchainErrorMessage(`Final score error: ${error.message}`);
    }
  }

  /**
   * Submit score to blockchain
   */
  async submitScoreToBlockchain() {
    // Enhanced wallet validation
    if (
      !this.walletConnected ||
      !this.web3Service ||
      !this.walletManager?.isReadyForGame()
    ) {
      //console.log("⚠️ Wallet not ready, skipping blockchain submission");
      this.showWalletNotReadyMessage();
      return;
    }

    try {
      //console.log("📝 Submitting score to blockchain...");

      // Submit score
      const _scoreResult = await this.web3Service.submitScore(
        this.currentLevel + 1,
        this.score
      );

      //console.log("✅ Score submitted:", scoreResult.transactionHash);

      // Calculate FUEL reward based on level and score
      const fuelReward = Math.max(
        10,
        (this.currentLevel + 1) * 5 + Math.floor(this.score / 100)
      );

      // Reward FUEL tokens
      const _fuelResult = await this.web3Service.rewardFuel(fuelReward);

      //console.log("🎁 FUEL reward:", fuelResult.transactionHash);

      // Update balance
      this.loadFuelBalance();

      // Refresh the game leaderboard if it's visible
      if (window.refreshGameLeaderboard) {
        window.refreshGameLeaderboard();
      }

      // Show success message
      this.showBlockchainSuccessMessage(fuelReward);
    } catch (error) {
      console.error("Failed to submit to blockchain:", error);
      this.showBlockchainErrorMessage(error.message);
    }
  }

  /**
   * Comprehensive blockchain storage verification system
   */
  async verifyGameStoredOnBlockchain() {
    if (!this.walletConnected || !this.web3Service) {
      //console.log("⚠️ Cannot verify blockchain storage - wallet not connected");
      return false;
    }

    try {
      //console.log("🔍 Verifying all game data stored on blockchain...");

      // Check recent transactions for this player
      const playerScores = await this.web3Service.getPlayerScores();

      if (
        !playerScores ||
        !playerScores.results ||
        playerScores.results.length === 0
      ) {
        console.warn("⚠️ No game data found on blockchain for this player");
        return false;
      }

      // Check if recent games are present (last 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const recentGames = playerScores.results.filter(
        (result) => new Date(result.timestamp).getTime() > fiveMinutesAgo
      );

      if (recentGames.length === 0) {
        console.warn("⚠️ No recent games found on blockchain");
        return false;
      }

      //console.log(`✅ Found ${recentGames.length} recent games on blockchain`);
      return true;
    } catch (error) {
      console.error("❌ Error verifying blockchain storage:", error);
      return false;
    }
  }

  /**
   * Enhanced blockchain submission with verification
   */
  async submitScoreToBlockchainWithVerification() {
    if (!this.walletConnected || !this.web3Service) {
      //console.log("⚠️ Wallet not connected, skipping blockchain submission");
      return;
    }

    try {
      //console.log("📝 Submitting score to blockchain with verification...");

      // Submit score first
      await this.submitScoreToBlockchain();

      // Wait for transaction to process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify storage
      const verified = await this.verifyGameStoredOnBlockchain();

      if (verified) {
        //console.log("✅ Blockchain storage verified successfully");
        this.showBlockchainSuccessMessage(
          0,
          "Game data verified on blockchain!"
        );
      } else {
        console.warn("⚠️ Blockchain verification failed - attempting retry");
        await this.retryBlockchainSubmission();
      }
    } catch (error) {
      console.error("❌ Error in verified blockchain submission:", error);
      this.showBlockchainErrorMessage("Verification failed: " + error.message);
    }
  }

  /**
   * Retry blockchain submission with improved error handling
   */
  async retryBlockchainSubmission(attempt = 1) {
    const maxRetries = 3;

    if (attempt > maxRetries) {
      console.error("❌ Max retries exceeded for blockchain submission");
      this.showBlockchainErrorMessage(
        "Failed to store game data after multiple attempts"
      );
      return;
    }

    try {
      //console.log(`🔄 Blockchain retry attempt ${attempt}/${maxRetries}`);

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Retry submission
      await this.submitScoreToBlockchain();

      // Verify the retry
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const verified = await this.verifyGameStoredOnBlockchain();

      if (verified) {
        //console.log(`✅ Blockchain retry ${attempt} successful`);
        this.showBlockchainSuccessMessage(
          0,
          `Game saved on attempt ${attempt}`
        );
      } else {
        throw new Error(`Retry ${attempt} verification failed`);
      }
    } catch (error) {
      console.error(`❌ Blockchain retry ${attempt} failed:`, error);
      return await this.retryBlockchainSubmission(attempt + 1);
    }
  }

  /**
   * Show wallet not ready message
   */
  showWalletNotReadyMessage() {
    // Determine the specific issue
    let message = "⚠️ Score Not Saved";
    let details = "";

    if (!this.walletConnected) {
      details = "Wallet not connected";
    } else if (!this.walletManager?.isCorrectNetwork) {
      details = "Wrong network";
    } else if (!this.walletConnected) {
      details = "Wallet not authenticated";
    } else {
      details = "Wallet not ready";
    }

    const messageText = this.add
      .text(600, 300, `${message}\n${details}`, {
        fontSize: "20px",
        fill: "#ffaa00",
        fontFamily: "Arial",
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Animate message
    this.tweens.add({
      targets: messageText,
      alpha: 1,
      duration: 500,
      yoyo: true,
      hold: 2000,
      onComplete: () => messageText.destroy(),
    });
  }

  /**
   * Load FUEL balance from blockchain
   */
  async loadFuelBalance() {
    if (!this.walletConnected || !this.web3Service) return;

    try {
      this.fuelBalance = await this.web3Service.getFuelBalance();
      //console.log("💰 FUEL balance loaded:", this.fuelBalance);
    } catch (error) {
      console.error("Failed to load FUEL balance:", error);
    }
  }

  /**
   * Cleanup method called when scene shuts down
   */
  shutdown() {
    // Clean up keyboard timer controller
    if (this.keyboardTimerController) {
      this.keyboardTimerController.cleanup();
      this.keyboardTimerController = null;
    }

    // Clean up any remaining timers
    if (this.trajectoryTimer) {
      this.trajectoryTimer.destroy();
      this.trajectoryTimer = null;
    }

    //console.log("✅ GameScene shutdown - cleanup completed");
  }

  /**
   * Main game loop update method
   * @param {number} time - Current time
   * @param {number} delta - Time since last frame (ms)
   */
  update(time, delta) {
    if (this.gameOver) {
      return;
    }

    // Update keyboard timer controller (if it needs per-frame updates)
    if (this.keyboardTimerController && this.keyboardTimerController.update) {
      this.keyboardTimerController.update(delta);
    }

    // Update rocket trail effects and enhanced physics
    this.rockets.children.entries.forEach((rocket) => {
      if (rocket.active) {
        this.updateRocketTrail(rocket);
        this.updateRocketPhysics(rocket);

        // Check if rocket has left the game bounds and destroy it
        // Allow more vertical space for steep angles, but strict horizontal bounds
        if (
          rocket.x < -100 ||
          rocket.x > 1300 ||
          rocket.y < -200 ||
          rocket.y > 750
        ) {
          this.destroyRocket(rocket);
        }
      }
    });

    // Update enemy AI
    this.updateEnemyAI();
  }

  /**
   * Update simple enemy AI movement
   */
  updateEnemyAI() {
    this.enemies.children.entries.forEach((enemy) => {
      // Skip AI movement if enemy shouldn't move (static positioning)
      if (!enemy.shouldMove || !enemy.body || enemy.body.moves === false) {
        return;
      }

      // Simple left-right movement (only when enabled)
      if (enemy.moveDirection) {
        enemy.body.setVelocityX(enemy.moveDirection * enemy.moveSpeed);

        // Change direction if hitting world bounds or randomly
        if (enemy.x <= 50 || enemy.x >= 1150 || Math.random() < 0.01) {
          enemy.moveDirection *= -1;
        }
      }
    });
  }

  /**
   * Update rocket trail visual effect
   */
  updateRocketTrail(rocket) {
    // Calculate the rocket's tail position (opposite to the nose direction)
    // The rocket sprite is 20x60px.
    // The rocket's visual rotation is set in updateRocketPhysics.
    const rocketLength = 30; // Half the rocket height (60px / 2)

    // Determine the angle of the rocket's tail based on its current velocity.
    // This is 180 degrees (Math.PI) opposite to the direction of movement.
    const angleOfVelocity = Math.atan2(
      rocket.body.velocity.y,
      rocket.body.velocity.x
    );
    const tailAngle = angleOfVelocity + Math.PI; // Pointing directly opposite to velocity

    const tailX = rocket.x + Math.cos(tailAngle) * rocketLength;
    const tailY = rocket.y + Math.sin(tailAngle) * rocketLength;

    // Add tail position to trail (not center position)
    if (!rocket.trailPoints) {
      rocket.trailPoints = [];
    }
    rocket.trailPoints.push({ x: tailX, y: tailY, time: this.time.now });

    // Remove old trail points (keep last 20 points or 1 second)
    const maxTrailTime = 1000; // 1 second
    rocket.trailPoints = rocket.trailPoints.filter((point) => {
      return this.time.now - point.time < maxTrailTime;
    });

    // Limit trail length
    if (rocket.trailPoints.length > 20) {
      rocket.trailPoints.shift();
    }

    // Draw trail if we have at least 2 points
    if (rocket.trailPoints.length >= 2 && !rocket.trailGraphics) {
      rocket.trailGraphics = this.add.graphics();
    }

    if (rocket.trailGraphics && rocket.trailPoints.length >= 2) {
      rocket.trailGraphics.clear();

      // Draw trail as connected line segments with fading alpha
      for (let i = 1; i < rocket.trailPoints.length; i++) {
        const point1 = rocket.trailPoints[i - 1];
        const point2 = rocket.trailPoints[i];

        // Calculate alpha based on age (newer = brighter)
        const age = (this.time.now - point2.time) / 1000; // age in seconds
        const alpha = Math.max(0, 1 - age);

        // Set line style with fading effect
        rocket.trailGraphics.lineStyle(3, 0xff6600, alpha * 0.7);
        rocket.trailGraphics.beginPath();
        rocket.trailGraphics.moveTo(point1.x, point1.y);
        rocket.trailGraphics.lineTo(point2.x, point2.y);
        rocket.trailGraphics.strokePath();
      }
    }
  }

  /**
   * Update rocket physics with enhanced air resistance
   */
  updateRocketPhysics(rocket) {
    // Apply air resistance to rocket velocity
    rocket.body.velocity.x *= this.airResistance;
    rocket.body.velocity.y *= this.airResistance;

    // No need to apply gravity manually - world gravity handles this

    // Update rocket rotation to match velocity direction
    // Add π/2 (90 degrees)     because the rocket sprite is created vertically
    // and we want it to point in the direction of travel
    const angle =
      Math.atan2(rocket.body.velocity.y, rocket.body.velocity.x) + Math.PI / 2;
    rocket.setRotation(angle);

    // Add slight scaling effect based on speed for visual enhancement
    const speed = Math.sqrt(
      rocket.body.velocity.x ** 2 + rocket.body.velocity.y ** 2
    );
    const scale = Math.max(0.8, Math.min(1.4, 1 + speed / 1000));
    rocket.setScale(scale);
  }

  /**
   * Handle manual game ending by player
   */
  endGameManually() {
    console.log("🔚 Player manually ended the game");

    // Play game over sound
    if (this.sounds.gameOver) {
      this.sounds.gameOver.play();
    }

    // Set game over state
    this.gameOver = true;
    this.canLaunch = false;

    // Submit final score to blockchain before ending
    this.submitFinalScoreToBlockchain("game-ended-manually");

    // Stop all sounds before transitioning
    this.sound.stopAll();
    
    // Transition to EndGameScene with manual end data
    this.scene.start("EndGameScene", {
      score: this.score,
      totalAttempts: this.launchAttempts,
      levelsCompleted: this.currentLevel, // Levels completed before manual end
      reason: "ended-manually",
    });
  }
} // End of GameScene class
