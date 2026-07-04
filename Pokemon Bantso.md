# **Functional & Technical Specification: Pokémon Bantso**

## **1\. Project Overview & Target Audience**

* **Game Title:** Pokémon Bantso  
* **Target Audience:** A 7-year-old child. English is a second language (requires heavy reliance on visual iconography, minimal text, high-contrast states, and high win-rates).  
* **Platform:** iPad-optimized Single Page Application (SPA). Must be configured as a Progressive Web App (PWA) so it can be installed to the iOS Home Screen and run completely offline without browser address bars.  
* **Core Loop:** Walk through a forest $\\rightarrow$ Trigger a winnable random encounter $\\rightarrow$ Defeat or Catch the Pokémon $\\rightarrow$ Add it to the collection $\\rightarrow$ Level up based on collection size $\\rightarrow$ Fill the progress bar $\\rightarrow$ Unlock the Pokémon League.

## **2\. Core Game Loop & Phase Architecture**

The game flows through a finite state machine with three primary views. No complex nesting or deeply buried menus are allowed.  
      \[ 1\. Forest Exploration Screen \]   
                      |  
           (Random Step Event)  
                      v  
         \[ 2\. Turn-Based Battle Screen \] \<----\> \[ 3\. Team Selection Overlay \]  
                      |  
         (Win / Catch Success Event)  
                      v  
   (Collection Appends \-\> Level Up Check)   
                      |  
        (If Max Level reached)  
                      v  
          \[ 4\. League Unlocked Screen \]

### **Phase 1: Forest Exploration Screen**

* **Visuals:** A beautiful, loopable side-scrolling or isometric 2D forest backdrop. A generic trainer avatar stands in the center.  
* **Interaction:** A single, large, high-contrast button at the bottom center: **"EXPLORE" (with a green boot icon)**.  
* **Mechanic:** Every time the player taps "EXPLORE", the background scrolls briefly (simple CSS transform animation).  
* **Encounter Logic:** There is a **35% chance** per tap to trigger a Pokémon combat encounter. When triggered, the screen flashes white, playing an encounter sound effect, and transitions immediately to Phase 2\.  
* **Progress Tracking:** The top 15% of the screen is permanently occupied by a massive **League Progress Bar** (see Section 3).

### **Phase 2: Turn-Based Battle Screen**

* **Visuals:** Split screen layout from a side-view perspective.  
  1. **Left Side (Ally):** The player's currently fielded Pokémon, facing right (back/side profile). Displays a large, colored Health Bar.  
  2. **Right Side (Enemy):** The encountered wild Pokémon, facing left. Displays a large, colored Health Bar.  
* **Level Scaling Algorithm:** To keep the game highly rewarding and easy for a 7-year-old, wild enemy levels match the player's current level, but their max HP is artificially capped at 70% of the player's Pokémon HP. **The player should win roughly 90% of fights.**  
* **Turn Structure:**  
  1. **Player Turn:** The game pauses and waits for the player to press an action button (Attack, Catch, or Swap).  
  2. **Player Action Execution:** An animation plays, damage/capture logic runs, and health bars update smoothly.  
  3. **Enemy Turn:** If the enemy survives/remains uncaught, it executes a basic attack automatically after a 1.5-second delay.  
  4. **Repeat** until a win, catch, or loss condition is met.

### **Phase 3: Team Selection / Collection Overlay**

* **Visuals:** A clean grid layout displaying all Pokémon currently in the player's collection database. Each card features a large image of the Pokémon and its health status.  
* **Interaction:** Tapping a Pokémon sets it as the "Active Fielded Pokémon". This overlay can be accessed freely before clicking "EXPLORE" or during a battle when selecting the "SWAP" action.

## **3\. Detailed UI/UX Specifications (Designed for 7-Year-Olds)**

To account for developing reading skills, the UI utilizes universal iconography alongside clear, static words. Buttons must have a minimum touch target size of **64px x 64px** with a **12px border-radius** to make them satisfying and easy to tap on an iPad.

### **The Combat Action Menu**

The action menu is a horizontal bar of three giant buttons locked at the bottom of the combat screen:

1. **ATTACK**  
   * **Visuals:** Red background. Icon: A cartoon white sword. Text below: "ATTACK" (All-caps, bold sans-serif).  
   * **Behavior:** Deals direct damage to the enemy.  
2. **CATCH**  
   * **Visuals:** Blue background. Icon: A classic Pokéball. Text below: "CATCH".  
   * **Behavior:** Triggers the RNG catch attempt.  
3. **SWAP**  
   * **Visuals:** Yellow background. Icon: Two green arrows forming a circular loop. Text below: "SWAP".  
   * **Behavior:** Opens the clean Team Selection grid overlay.

### **Visual & Audio Feedback System**

The game must clearly differentiate success from failure without relying on reading paragraphs of text.

* **Attack Hit:** The target Pokémon sprite shakes violently along the X-axis for 300ms, accompanied by a sharp comic-book "Slash" visual effect overlay and a crunchy impact sound.  
* **Successful Capture / Victory:**  
  * **Visual:** Screen bursts with colorful confetti particle effects. A massive green checkmark ($\\checkmark$) appears in the center. A happy, bouncing cartoon mascot pops up.  
  * **Audio:** A triumphant, upbeat musical chime scales upward.  
* **Failed Action (e.g., Pokémon escapes Ball):**  
  * **Visual:** The Pokéball shakes on screen, cracks open, and a gentle, pulsing red "X" appears briefly over the enemy. No punishing animations.  
  * **Audio:** A soft, comical "boing" or low-pitch double beep indicating a missed attempt.

### **Persistent League Progress Bar**

* Positioned statically at the top of the viewport.  
* **UI Components:** Left side displays a large, gold Star icon containing the player's current level number (e.g., 4). The right side displays a glowing checkered-flag "League Gate" icon.  
* Between them is a thick, bright green loading bar. Inside the bar, simple text reads: **"8 / 10 Catch to Unlock\!"**

## **4\. Technical Architecture & Calculations**

### **Database Schema (**IndexedDB **via Dexie.js or native)**

To ensure the game saves automatically when closed, the state must be mirrored continuously to local storage.  
JavaScript  
// Database definition  
const db \= {  
  playerState: {  
    id: "main\_player",  
    currentLevel: 1,  
    pokemonCaughtCount: 1,  
    activePokemonId: "pikachu\_01"  
  },  
  collection: \[  
    {  
      id: "pikachu\_01",  
      name: "Pikachu",  
      sprite: "./assets/sprites/pikachu.png",  
      maxHp: 100,  
      currentHp: 100,  
      baseDamage: 25  
    }  
  \]  
};

### **Game Logic Formulas**

#### **1\. Leveling System Algorithm**

The Player Level is a derived property completely dictated by the total length of the collection array.  
$$Player\\\_Level \= \\lfloor \\frac{Total\\\_Pokémon\\\_Caught}{2} \\rfloor \+ 1$$

* Every **2 new unique Pokémon caught** increments the player's level by 1\.  
* When Player\_Level reaches **10**, the progress bar completely fills, exploration stops, and the "League Unlocked\!" celebration scene triggers.

#### **2\. Turn-Based Battle Formulas**

* **Player Damage Dealt:** $\\text{Damage} \= \\text{baseDamage} \\pm \\text{Random}(-3, \+3)$  
* **Enemy Damage Dealt:** Fixed at exactly $15\\%$ of the player's maximum HP, ensuring the player can safely survive at least 6 full rounds of combat.

#### **3\. Catch Probability Formula**

The catch success rate is an explicit decision-and-chance system. It scales dynamically based on the current health percentage of the wild Pokémon, making the strategy intuitive: *Lower its health to make catching easier.*  
$$\\text{Catch\\\_Chance} \= 0.30 \+ \\left(1.0 \- \\frac{\\text{Enemy\\\_Current\\\_HP}}{\\text{Enemy\\\_Max\\\_HP}}\\right) \\times 0.50$$

* **Full Health Enemy:** $30\\%$ flat chance of a successful catch.  
* **Critical Health Enemy (near 0 HP):** Climbs up to an $80\\%$ maximum chance of a successful catch.

## **5\. Developer Acceptance Criteria (Definitions of Done)**

1. **Mobile Web Verification:** The app runs layout-perfect inside iPad Safari and when saved to the home screen as a standalone standalone app (manifest.json configuration complete).  
2. **No Text Walls:** No UI notification or dialog box can exceed 3 words in English.  
3. **Persistent Storage:** Force-closing the browser tab mid-exploration and reloading must restore the exact team collection and level progress seamlessly.  
4. **Audio Asset Resiliency:** All sound effects must trigger via low-latency audio contexts (Web Audio API) to prevent delays when tapping action buttons on iOS devices.

