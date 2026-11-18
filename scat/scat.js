// Scat! — Side-Scrolling Retro Cat Care Game for Teresa & Her 6 Cats
(() => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const WORLD_WIDTH = 2400;
    const VIEW_W = canvas.width;   // 960
    const VIEW_H = canvas.height;  // 460
    const FLOOR_Y = 386;

    // UI Elements
    const titleOverlay = document.getElementById('title-overlay');
    const startGameBtn = document.getElementById('start-game-btn');
    const roomIndicator = document.getElementById('room-indicator');
    const timeIndicator = document.getElementById('time-indicator');
    const overallBar = document.getElementById('overall-happiness-bar');
    const overallVal = document.getElementById('overall-happiness-val');
    const catsHudGrid = document.getElementById('cats-hud-grid');
    const litterSummary = document.getElementById('litter-summary');
    const activityLog = document.getElementById('activity-log');

    const toggleTimeBtn = document.getElementById('toggle-time-btn');
    const musicBtn = document.getElementById('music-btn');
    const sfxBtn = document.getElementById('sfx-btn');

    // Time of Day system:
    // timeOfDay in [0, 24): 7..18 = Day, 18..20 = Sunset, 20..7 = Night
    let gameTimeHours = 11.0; // Starts at 11:00 AM (sunny cat-nap daytime)
    const TIME_SPEED = 0.14;  // Hours per real second (~2.8 min full 24h cycle)

    // Camera
    let cameraX = 420;

    // Input state
    const keys = {
        left: false,
        right: false
    };

    // Teresa (Mom) — Playable Character
    const mom = {
        x: 680,
        y: FLOOR_Y,
        vy: 0,
        vx: 0,
        speed: 215,
        facing: 1, // 1 = right, -1 = left
        walkFrame: 0,
        isHopping: false,
        actionState: null, // 'feed', 'scoop', 'wand', 'pet'
        actionTimer: 0,
        wandAngle: 0,
        speech: 'Time to check on my 6 sweet kitties!',
        speechTimer: 4.5
    };

    // William (Dad) — Sleeping in the big brown recliner watching a B&W Western
    const dad = {
        x: 1075,
        y: FLOOR_Y,
        zTimer: 0,
        zParticles: [],
        mumbleTimer: 12,
        mumbleText: ''
    };

    const DAD_MUMBLES = [
        'Zzz... Duke got those cattle rustlers...',
        'Zzz... Just resting my eyes, Teresa...',
        'Zzz... High noon at Dry Gulch...',
        'Zzz... Good Western on right now...'
    ];

    // Elevated Perches (Cat Trees, Couch, Beds, Kitchen Counters)
    const PERCHES = [
        // Left Tall Gray Cat Tree (by patio door)
        { id: 'tree1_top', name: 'Left Cat Tree Top', x: 112, y: 186, room: 'Living Room' },
        { id: 'tree1_mid', name: 'Left Cat Tree Hammock', x: 138, y: 246, room: 'Living Room' },
        { id: 'tree1_low', name: 'Left Cat Tree Perch', x: 96, y: 302, room: 'Living Room' },
        // Second Gray Cat Tree
        { id: 'tree2_top', name: 'Right Cat Tree Top', x: 226, y: 208, room: 'Living Room' },
        { id: 'tree2_mid', name: 'Right Cat Tree Basket', x: 254, y: 268, room: 'Living Room' },
        // Couch with Floral Throw
        { id: 'couch_back', name: 'Floral Sofa Backrest', x: 375, y: 292, room: 'Living Room' },
        { id: 'couch_cushion', name: 'Sofa Cat Bed', x: 455, y: 318, room: 'Living Room' },
        // Blue Armchair by Fireplace
        { id: 'blue_chair', name: 'Blue Armchair Pillow', x: 562, y: 318, room: 'Living Room' },
        // Gray Donut Bed & Cat Tunnel in front of TV
        { id: 'donut_bed', name: 'Gray Donut Bed', x: 765, y: 374, room: 'Living Room' },
        { id: 'cardboard_box', name: 'Chewy Cat Box', x: 845, y: 356, room: 'Living Room' },
        // Hallway Purple Sticker Cat Cube
        { id: 'purple_cube', name: 'Purple Cat Cube', x: 1435, y: 338, room: 'Hallway' },
        // Dining Chair Cushion
        { id: 'dining_chair', name: 'Dining Chair Cushion', x: 1690, y: 332, room: 'Dining Nook' }
    ];

    // Food Bowl Stations
    const FOOD_BOWLS = [
        { id: 'bowl_lr', name: 'Living Room Snack Bowl', x: 295, y: FLOOR_Y, food: 75, maxFood: 100 },
        { id: 'bowl_hall', name: 'Hallway Water & Kibble', x: 1355, y: FLOOR_Y, food: 80, maxFood: 100 },
        { id: 'bowl_kitchen', name: 'Kitchen Feeding Station', x: 2130, y: FLOOR_Y, food: 90, maxFood: 100 }
    ];

    // Litter Box Stations
    const LITTER_BOXES = [
        { id: 'litter_lr', name: 'Patio Corner Litter Box', x: 48, y: FLOOR_Y, dirtiness: 0, maxDirt: 3 },
        { id: 'litter_hall', name: 'Hallway Nook Litter Box', x: 1290, y: FLOOR_Y, dirtiness: 1, maxDirt: 3 },
        { id: 'litter_kitchen', name: 'Kitchen Corner Litter Box', x: 2325, y: FLOOR_Y, dirtiness: 0, maxDirt: 3 }
    ];

    // The 6 Cats: Mini, Stella, Otis (Tuxedos), Jack, Jill (Orange Tabbies), Cozette (Calico)
    const CATS = [
        {
            id: 'mini',
            name: 'Mini',
            coat: 'tuxedo',
            coatLabel: 'Tuxedo',
            size: 0.88, // Petite!
            pitch: 1.22,
            x: 112,
            y: 186,
            targetX: 112,
            targetY: 186,
            facing: 1,
            state: 'nap', // 'nap', 'idle', 'walk', 'zoomies', 'eat', 'play', 'startled'
            stateTimer: 8,
            perchId: 'tree1_top',
            hunger: 86,
            play: 84,
            happiness: 88,
            tailStepCooldown: 0,
            speech: '',
            speechTimer: 0,
            animFrame: 0
        },
        {
            id: 'stella',
            name: 'Stella',
            coat: 'tuxedo',
            coatLabel: 'Tuxedo',
            size: 0.98,
            pitch: 1.08,
            x: 455,
            y: 318,
            targetX: 455,
            targetY: 318,
            facing: 1,
            state: 'nap',
            stateTimer: 6,
            perchId: 'couch_cushion',
            hunger: 82,
            play: 85,
            happiness: 86,
            tailStepCooldown: 0,
            speech: '',
            speechTimer: 0,
            animFrame: 1.2
        },
        {
            id: 'otis',
            name: 'Otis',
            coat: 'tuxedo',
            coatLabel: 'Tuxedo',
            size: 1.12, // Chonkier tuxedo boy
            pitch: 0.84,
            x: 765,
            y: FLOOR_Y,
            targetX: 765,
            targetY: FLOOR_Y,
            facing: -1,
            state: 'idle',
            stateTimer: 5,
            perchId: null,
            hunger: 78,
            play: 82,
            happiness: 84,
            tailStepCooldown: 0,
            speech: '',
            speechTimer: 0,
            animFrame: 2.4
        },
        {
            id: 'jack',
            name: 'Jack',
            coat: 'orange',
            coatLabel: 'Orange',
            size: 1.03,
            pitch: 0.94,
            x: 1435,
            y: 338,
            targetX: 1435,
            targetY: 338,
            facing: -1,
            state: 'nap',
            stateTimer: 7,
            perchId: 'purple_cube',
            hunger: 84,
            play: 80,
            happiness: 85,
            tailStepCooldown: 0,
            speech: '',
            speechTimer: 0,
            animFrame: 0.7
        },
        {
            id: 'jill',
            name: 'Jill',
            coat: 'orange',
            coatLabel: 'Orange',
            size: 0.95,
            pitch: 1.14,
            x: 1990,
            y: FLOOR_Y,
            targetX: 2050,
            targetY: FLOOR_Y,
            facing: 1,
            state: 'walk',
            stateTimer: 4,
            perchId: null,
            hunger: 80,
            play: 88,
            happiness: 86,
            tailStepCooldown: 0,
            speech: '',
            speechTimer: 0,
            animFrame: 3.1
        },
        {
            id: 'cozette',
            name: 'Cozette',
            coat: 'calico',
            coatLabel: 'Calico',
            size: 0.96,
            pitch: 1.16,
            x: 226,
            y: 208,
            targetX: 226,
            targetY: 208,
            facing: 1,
            state: 'nap',
            stateTimer: 9,
            perchId: 'tree2_top',
            hunger: 88,
            play: 86,
            happiness: 89,
            tailStepCooldown: 0,
            speech: '',
            speechTimer: 0,
            animFrame: 4.0
        }
    ];

    // Floating visual particles (Hearts, Sparkles, Kibble, Z's, Exclamations)
    const particles = [];

    // Western TV animation state
    let westernTick = 0;

    function addLog(text) {
        if (!activityLog) return;
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = text;
        activityLog.prepend(entry);
        while (activityLog.children.length > 12) {
            activityLog.removeChild(activityLog.lastChild);
        }
    }

    function spawnParticle(x, y, text, color = '#ffd166', vy = -38, life = 1.3) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 24,
            vy,
            text,
            color,
            life,
            maxLife: life
        });
    }

    function isNightTime() {
        return gameTimeHours >= 20 || gameTimeHours < 6.5;
    }

    function isSunsetTime() {
        return (gameTimeHours >= 17.5 && gameTimeHours < 20) || (gameTimeHours >= 6.5 && gameTimeHours < 7.8);
    }

    function getDaylightFactor() {
        // Returns 0 (full night) to 1 (bright midday)
        if (gameTimeHours >= 8 && gameTimeHours < 17.5) return 1.0;
        if (gameTimeHours >= 17.5 && gameTimeHours < 20.5) {
            return 1.0 - (gameTimeHours - 17.5) / 3.0;
        }
        if (gameTimeHours >= 6.0 && gameTimeHours < 8.0) {
            return (gameTimeHours - 6.0) / 2.0;
        }
        return 0.0;
    }

    function formatClock(hoursFloat) {
        const totalMinutes = Math.floor(hoursFloat * 60) % (24 * 60);
        const h24 = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const ampm = h24 >= 12 ? 'PM' : 'AM';
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        const mStr = m < 10 ? '0' + m : '' + m;
        return `${h12}:${mStr} ${ampm}`;
    }

    function getRoomName(x) {
        if (x < 1180) return 'Living Room';
        if (x < 1560) return 'Foyer & Hallway';
        if (x < 1850) return 'Dining Nook';
        return 'Kitchen';
    }

    // Build initial Cats HUD Cards
    function initCatsHud() {
        catsHudGrid.innerHTML = '';
        CATS.forEach((cat) => {
            const card = document.createElement('div');
            card.className = 'cat-card';
            card.id = `cat-card-${cat.id}`;

            let tagBg = '#334155';
            let tagColor = '#f8fafc';
            if (cat.coat === 'orange') {
                tagBg = '#9a3412';
                tagColor = '#ffedd5';
            } else if (cat.coat === 'calico') {
                tagBg = '#78350f';
                tagColor = '#fef3c7';
            }

            card.innerHTML = `
                <div class="cat-name-row">
                    <span>🐾 ${cat.name}</span>
                    <span class="cat-coat-tag" style="background:${tagBg};color:${tagColor}">${cat.coatLabel}</span>
                </div>
                <div class="cat-state-text" id="cat-state-${cat.id}">Napping</div>
                <div class="cat-meter-bg">
                    <div class="cat-meter-bar" id="cat-bar-${cat.id}" style="width:${cat.happiness}%;background:#10b981;"></div>
                </div>
                <div class="cat-substats">
                    <span id="cat-hap-${cat.id}">♥ ${Math.round(cat.happiness)}%</span>
                    <span id="cat-room-${cat.id}">Living Room</span>
                </div>
            `;

            card.addEventListener('click', () => {
                // Guide Mom toward this cat!
                mom.speech = `Coming, ${cat.name}!`;
                mom.speechTimer = 2.2;
                cameraX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_W, cat.x - VIEW_W / 2));
                if (Math.abs(mom.x - cat.x) > 40) {
                    mom.AutoWalkTarget = cat.x;
                }
            });

            catsHudGrid.appendChild(card);
        });
    }

    function updateHud() {
        // Room indicator
        roomIndicator.textContent = `📍 ${getRoomName(mom.x)}`;

        // Time indicator
        const clockStr = formatClock(gameTimeHours);
        const night = isNightTime();
        const sunset = isSunsetTime();
        if (night) {
            timeIndicator.textContent = `🌙 Nighttime (${clockStr}) — Playful Zoomie Hours!`;
            timeIndicator.classList.add('night');
        } else if (sunset) {
            timeIndicator.textContent = `🌅 Evening/Dawn (${clockStr}) — Cozy Hours`;
            timeIndicator.classList.remove('night');
        } else {
            timeIndicator.textContent = `☀️ Daytime (${clockStr}) — Sunny Cat-Nap Hours`;
            timeIndicator.classList.remove('night');
        }

        if (window.scatAudio) {
            window.scatAudio.setNightMode(night);
        }

        // Litter summary
        const cleanCount = LITTER_BOXES.filter((b) => b.dirtiness === 0).length;
        const totalDirt = LITTER_BOXES.reduce((acc, b) => acc + b.dirtiness, 0);
        if (totalDirt === 0) {
            litterSummary.textContent = 'Litter Boxes: 3/3 Sparkling Clean ✨';
            litterSummary.className = 'small font-monospace text-info';
        } else {
            litterSummary.textContent = `Litter Boxes: ${cleanCount}/3 Clean (${totalDirt} to scoop 🧹)`;
            litterSummary.className = 'small font-monospace text-warning';
        }

        // Update each cat card
        let totalHappiness = 0;
        CATS.forEach((cat) => {
            totalHappiness += cat.happiness;
            const stateEl = document.getElementById(`cat-state-${cat.id}`);
            const barEl = document.getElementById(`cat-bar-${cat.id}`);
            const hapEl = document.getElementById(`cat-hap-${cat.id}`);
            const roomEl = document.getElementById(`cat-room-${cat.id}`);
            const cardEl = document.getElementById(`cat-card-${cat.id}`);

            if (stateEl) {
                const stateLabels = {
                    nap: '💤 Napping cozily',
                    idle: '😺 Lounging around',
                    walk: '🐾 Strolling around',
                    zoomies: '⚡ Nighttime Zoomies!',
                    eat: '🥣 Crunching kibble',
                    play: '🪶 Chasing feather toy!',
                    startled: '🙀 Tail stepped on! Running!'
                };
                stateEl.textContent = stateLabels[cat.state] || '😺 Relaxing';
            }
            if (barEl) {
                const h = Math.round(cat.happiness);
                barEl.style.width = `${h}%`;
                barEl.style.background = h >= 75 ? '#10b981' : h >= 50 ? '#f59e0b' : '#ef4444';
            }
            if (hapEl) {
                hapEl.textContent = `♥ ${Math.round(cat.happiness)}%`;
            }
            if (roomEl) {
                roomEl.textContent = getRoomName(cat.x);
            }
            if (cardEl) {
                cardEl.classList.toggle('startled', cat.state === 'startled');
            }
        });

        const avgHappiness = Math.round(totalHappiness / CATS.length);
        overallBar.style.width = `${avgHappiness}%`;
        overallVal.textContent = `${avgHappiness}%`;
    }

    // Mom's Actions
    function performFeedAction() {
        mom.actionState = 'feed';
        mom.actionTimer = 0.75;

        // Find nearest food bowl within 120px, or scatter treats on the floor for nearby cats!
        let nearestBowl = null;
        let minBowlDist = 135;
        FOOD_BOWLS.forEach((b) => {
            const d = Math.abs(b.x - mom.x);
            if (d < minBowlDist) {
                minBowlDist = d;
                nearestBowl = b;
            }
        });

        if (window.scatAudio) window.scatAudio.playFeedSound();

        if (nearestBowl) {
            nearestBowl.food = nearestBowl.maxFood;
            mom.speech = `Filled the ${nearestBowl.name}! Come & eat, babies!`;
            mom.speechTimer = 2.6;
            spawnParticle(nearestBowl.x, nearestBowl.y - 36, '🥣 Full Kibble!', '#ffd166');
            addLog(`Teresa refilled the ${nearestBowl.name}.`);

            // Attract nearby or hungry cats to eat
            CATS.forEach((cat) => {
                if (Math.abs(cat.x - nearestBowl.x) < 420 || cat.hunger < 75) {
                    cat.perchId = null;
                    cat.y = FLOOR_Y;
                    cat.state = 'walk';
                    cat.targetX = nearestBowl.x + (Math.random() - 0.5) * 44;
                    cat.stateTimer = 4.0;
                }
            });
        } else {
            // Toss yummy cat treats right where Mom is standing!
            mom.speech = 'Treats for my sweet babies!';
            mom.speechTimer = 2.2;
            spawnParticle(mom.x + mom.facing * 28, FLOOR_Y - 30, '🐟 Treats!', '#f4a261');

            CATS.forEach((cat) => {
                if (Math.abs(cat.x - mom.x) < 260) {
                    cat.hunger = Math.min(100, cat.hunger + 18);
                    cat.happiness = Math.min(100, cat.happiness + 8);
                    cat.speech = 'Mew! Yum! ♥';
                    cat.speechTimer = 2.0;
                    spawnParticle(cat.x, cat.y - 35, '♥ +Yum', '#ff6b6b');
                }
            });
        }
    }

    function performScoopAction() {
        mom.actionState = 'scoop';
        mom.actionTimer = 0.75;

        let nearestBox = null;
        let minDist = 140;
        LITTER_BOXES.forEach((box) => {
            const d = Math.abs(box.x - mom.x);
            if (d < minDist) {
                minDist = d;
                nearestBox = box;
            }
        });

        if (nearestBox) {
            if (window.scatAudio) window.scatAudio.playScoopSound();
            const wasDirty = nearestBox.dirtiness > 0;
            nearestBox.dirtiness = 0;
            mom.speech = wasDirty
                ? `All scooped and fresh! Sparkling clean!`
                : `Checked the ${nearestBox.name} — nice and clean!`;
            mom.speechTimer = 2.5;
            spawnParticle(nearestBox.x, nearestBox.y - 36, '✨ Fresh & Clean!', '#38bdf8');
            if (wasDirty) {
                addLog(`Teresa scooped the ${nearestBox.name} clean!`);
                CATS.forEach((cat) => {
                    cat.happiness = Math.min(100, cat.happiness + 5);
                });
            }
        } else {
            // Let player know where the nearest dirty litter box is
            const dirtyBoxes = LITTER_BOXES.filter((b) => b.dirtiness > 0);
            if (dirtyBoxes.length > 0) {
                const target = dirtyBoxes[0];
                const dir = target.x > mom.x ? 'to the right' : 'to the left';
                mom.speech = `Let's walk ${dir} to scoop the ${target.name}!`;
            } else {
                mom.speech = 'All 3 litter boxes are sparkling clean right now!';
            }
            mom.speechTimer = 2.5;
        }
    }

    function performPlayAction() {
        mom.actionState = 'wand';
        mom.actionTimer = 1.1;
        if (window.scatAudio) window.scatAudio.playToySound();

        mom.speech = 'Look at the feather wand, kitties! Swish swish!';
        mom.speechTimer = 2.4;
        spawnParticle(mom.x + mom.facing * 45, mom.y - 68, '🪶 Swish!', '#a78bfa');

        let playedCount = 0;
        CATS.forEach((cat) => {
            const dist = Math.abs(cat.x - mom.x);
            if (dist < 280 && cat.state !== 'startled') {
                playedCount++;
                cat.perchId = null;
                cat.y = FLOOR_Y;
                cat.state = 'play';
                cat.stateTimer = 3.2;
                cat.targetX = mom.x + mom.facing * (35 + Math.random() * 55);
                cat.play = Math.min(100, cat.play + 22);
                cat.happiness = Math.min(100, cat.happiness + 10);
                cat.speech = 'Pounce! ♥';
                cat.speechTimer = 2.0;
                spawnParticle(cat.x, cat.y - 42, '♥ Play!', '#ec4899');
            }
        });

        if (playedCount > 0) {
            addLog(`Teresa played feather wand with ${playedCount} cat${playedCount > 1 ? 's' : ''}!`);
        }
    }

    function performPetAction() {
        mom.actionState = 'pet';
        mom.actionTimer = 0.8;

        // Find closest cat
        let closestCat = null;
        let minDist = 130;
        CATS.forEach((cat) => {
            const d = Math.abs(cat.x - mom.x);
            if (d < minDist) {
                minDist = d;
                closestCat = cat;
            }
        });

        if (closestCat) {
            if (window.scatAudio) {
                window.scatAudio.playPurrSound();
                window.scatAudio.playHappyMeow(closestCat.pitch);
            }
            closestCat.play = Math.min(100, closestCat.play + 16);
            closestCat.happiness = Math.min(100, closestCat.happiness + 9);
            closestCat.speech = 'Purrrrr... ♥';
            closestCat.speechTimer = 2.4;
            mom.speech = `Good kitty, ${closestCat.name}! Mom loves you!`;
            mom.speechTimer = 2.4;
            spawnParticle(closestCat.x, closestCat.y - 40, '💕 Purrrr!', '#f43f5e');
            addLog(`Teresa petted ${closestCat.name} — loud happy purrs!`);
        } else {
            // Call nearby cats over!
            if (window.scatAudio) window.scatAudio.playHappyMeow(1.0);
            mom.speech = 'Here kitty kitty! Pss pss pss!';
            mom.speechTimer = 2.2;
            CATS.forEach((cat) => {
                if (Math.abs(cat.x - mom.x) < 420 && cat.state !== 'nap') {
                    cat.perchId = null;
                    cat.y = FLOOR_Y;
                    cat.state = 'walk';
                    cat.targetX = mom.x + (Math.random() - 0.5) * 90;
                    cat.stateTimer = 3.5;
                }
            });
        }
    }

    // Smart context action (Space / E / Care button)
    function performSmartAction() {
        // 1. Dirty litter box right nearby?
        const nearbyDirtyBox = LITTER_BOXES.find((b) => Math.abs(b.x - mom.x) < 95 && b.dirtiness > 0);
        if (nearbyDirtyBox) {
            performScoopAction();
            return;
        }
        // 2. Food bowl right nearby that isn't full?
        const nearbyBowl = FOOD_BOWLS.find((b) => Math.abs(b.x - mom.x) < 95 && b.food < 90);
        if (nearbyBowl) {
            performFeedAction();
            return;
        }
        // 3. Cat right next to Mom? Pet or play!
        const nearbyCat = CATS.find((c) => Math.abs(c.x - mom.x) < 95);
        if (nearbyCat) {
            if (nearbyCat.play < 80 || isNightTime()) {
                performPlayAction();
            } else {
                performPetAction();
            }
            return;
        }
        // 4. Otherwise if near any bowl or litter box, interact with it, else wave Feather Wand
        const anyBowl = FOOD_BOWLS.find((b) => Math.abs(b.x - mom.x) < 95);
        if (anyBowl) {
            performFeedAction();
            return;
        }
        const anyBox = LITTER_BOXES.find((b) => Math.abs(b.x - mom.x) < 95);
        if (anyBox) {
            performScoopAction();
            return;
        }
        performPlayAction();
    }

    function performHop() {
        if (!mom.isHopping) {
            mom.isHopping = true;
            mom.vy = -255;
            mom.speech = 'Stepping carefully over tails!';
            mom.speechTimer = 1.3;
        }
    }

    // Accidental Tail-Stepping Check!
    // "If mom accidentally steps on a cat tail, the cat will meow real loud and run away,
    //  but will not continue to be afraid of mom."
    function checkTailStep(cat) {
        if (mom.isHopping || mom.y < FLOOR_Y - 12) return; // Mom stepped over!
        if (cat.y < FLOOR_Y - 10) return; // Cat is up on a perch/tree/couch
        if (cat.state === 'startled' || cat.tailStepCooldown > 0) return;
        if (Math.abs(mom.vx) < 10) return; // Only when Mom is walking

        // Cat's tail sticks out behind the cat (~20-34px behind cat.x)
        const tailX = cat.x - cat.facing * 24;
        const distToTail = Math.abs(mom.x - tailX);

        if (distToTail < 13) {
            // OOPS! Stepped on the cat's tail!
            cat.state = 'startled';
            cat.stateTimer = 1.9; // Runs away briefly, then immediately calms down!
            cat.tailStepCooldown = 9.0; // Don't re-trigger immediately
            cat.perchId = null;
            cat.y = FLOOR_Y;

            // Run away from where Mom stepped
            const runDir = cat.x >= mom.x ? 1 : -1;
            cat.facing = runDir;
            cat.targetX = Math.max(60, Math.min(WORLD_WIDTH - 60, cat.x + runDir * 210));

            cat.speech = 'MREEEOOOWW!! 🙀';
            cat.speechTimer = 2.3;

            mom.speech = `Oh goodness, I'm so sorry ${cat.name}! Mom didn't mean to step on your tail!`;
            mom.speechTimer = 3.0;

            if (window.scatAudio) {
                window.scatAudio.playTailStepMeow();
            }

            spawnParticle(cat.x, cat.y - 48, '⚡ MREOOWW!!', '#ef4444', -55, 1.5);
            addLog(`Oops! Teresa accidentally stepped on ${cat.name}'s tail! ${cat.name} yowled and scampered off (but still loves Mom!).`);
        }
    }

    // Update Game Simulation
    function update(dt) {
        // Advance Day/Night cycle
        gameTimeHours = (gameTimeHours + TIME_SPEED * dt) % 24;
        westernTick += dt;

        // Update Mom movement
        let moveDir = 0;
        if (keys.left) moveDir -= 1;
        if (keys.right) moveDir += 1;

        if (moveDir !== 0) {
            mom.AutoWalkTarget = null;
            mom.vx = moveDir * mom.speed;
            mom.facing = moveDir;
            mom.walkFrame += dt * 9;
        } else if (mom.AutoWalkTarget != null) {
            const diff = mom.AutoWalkTarget - mom.x;
            if (Math.abs(diff) > 18) {
                mom.facing = diff > 0 ? 1 : -1;
                mom.vx = mom.facing * mom.speed;
                mom.walkFrame += dt * 9;
            } else {
                mom.AutoWalkTarget = null;
                mom.vx = 0;
            }
        } else {
            mom.vx = 0;
        }

        mom.x = Math.max(42, Math.min(WORLD_WIDTH - 42, mom.x + mom.vx * dt));

        // Hop physics (stepping over cat tails)
        if (mom.isHopping) {
            mom.y += mom.vy * dt;
            mom.vy += 680 * dt;
            if (mom.y >= FLOOR_Y) {
                mom.y = FLOOR_Y;
                mom.vy = 0;
                mom.isHopping = false;
            }
        }

        if (mom.actionTimer > 0) {
            mom.actionTimer -= dt;
            mom.wandAngle += dt * 14;
            if (mom.actionTimer <= 0) {
                mom.actionState = null;
            }
        }

        if (mom.speechTimer > 0) {
            mom.speechTimer -= dt;
        }

        // Smooth camera follow
        const desiredCamX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_W, mom.x - VIEW_W * 0.5));
        cameraX += (desiredCamX - cameraX) * Math.min(1, dt * 6.5);

        // Update Dad's sleeping Z's and occasional sleepy Western mumble
        dad.zTimer += dt;
        if (dad.zTimer > 1.1) {
            dad.zTimer = 0;
            dad.zParticles.push({
                x: dad.x + 10,
                y: dad.y - 102,
                age: 0,
                char: dad.zParticles.length % 2 === 0 ? 'Z' : 'z'
            });
        }
        for (let i = dad.zParticles.length - 1; i >= 0; i--) {
            dad.zParticles[i].age += dt;
            dad.zParticles[i].y -= dt * 18;
            dad.zParticles[i].x += Math.sin(dad.zParticles[i].age * 3) * dt * 8;
            if (dad.zParticles[i].age > 2.6) {
                dad.zParticles.splice(i, 1);
            }
        }

        dad.mumbleTimer -= dt;
        if (dad.mumbleTimer <= 0) {
            dad.mumbleTimer = 14 + Math.random() * 10;
            dad.mumbleText = DAD_MUMBLES[Math.floor(Math.random() * DAD_MUMBLES.length)];
            setTimeout(() => {
                dad.mumbleText = '';
            }, 4200);
        }

        // Slowly deplete food bowls & occasionally add a litter box visit
        const night = isNightTime();
        const totalDirt = LITTER_BOXES.reduce((acc, b) => acc + b.dirtiness, 0);
        const cleanlinessScore = Math.max(40, 100 - totalDirt * 12);

        // Update each of the 6 Cats
        CATS.forEach((cat) => {
            cat.animFrame += dt * (cat.state === 'zoomies' || cat.state === 'startled' ? 14 : 6);
            if (cat.tailStepCooldown > 0) cat.tailStepCooldown -= dt;
            if (cat.speechTimer > 0) cat.speechTimer -= dt;

            // Gentle, relaxing stat decay
            cat.hunger = Math.max(35, cat.hunger - dt * 0.42);
            cat.play = Math.max(35, cat.play - dt * (night ? 0.55 : 0.32));

            // Overall happiness meter smoothly blends hunger, play, and litter cleanliness
            const targetHappiness = cat.hunger * 0.4 + cat.play * 0.35 + cleanlinessScore * 0.25;
            cat.happiness += (targetHappiness - cat.happiness) * Math.min(1, dt * 2.0);

            // Check if Mom accidentally stepped on this cat's tail!
            checkTailStep(cat);

            cat.stateTimer -= dt;

            // Movement execution based on state
            if (cat.state === 'startled') {
                // Sprint away fast!
                const diff = cat.targetX - cat.x;
                if (Math.abs(diff) > 8) {
                    cat.facing = diff > 0 ? 1 : -1;
                    cat.x += cat.facing * 310 * dt;
                }
                if (cat.stateTimer <= 0) {
                    // Immediately calm down — not afraid of Mom!
                    cat.state = 'idle';
                    cat.stateTimer = 3.0;
                    cat.speech = 'Mew ♥ (Still loves Mom!)';
                    cat.speechTimer = 2.0;
                }
                return;
            }

            if (cat.state === 'walk' || cat.state === 'zoomies' || cat.state === 'play') {
                const speed = cat.state === 'zoomies' ? 225 : cat.state === 'play' ? 165 : 78;
                const diff = cat.targetX - cat.x;
                if (Math.abs(diff) > 6) {
                    cat.facing = diff > 0 ? 1 : -1;
                    cat.x = Math.max(45, Math.min(WORLD_WIDTH - 45, cat.x + cat.facing * speed * dt));
                } else if (cat.state === 'zoomies' && cat.stateTimer > 0) {
                    // Pick another zoomie target back and forth!
                    cat.targetX = Math.max(70, Math.min(WORLD_WIDTH - 70, cat.x + (Math.random() > 0.5 ? 1 : -1) * (240 + Math.random() * 320)));
                }
            }

            // State transitions when timer expires
            if (cat.stateTimer <= 0) {
                chooseNextCatState(cat, night);
            }
        });

        // Update floating particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function chooseNextCatState(cat, night) {
        // 1. If hungry and a bowl has food, go eat!
        if (cat.hunger < 72) {
            const availableBowls = FOOD_BOWLS.filter((b) => b.food >= 10);
            if (availableBowls.length > 0) {
                // Find closest filled bowl
                availableBowls.sort((a, b) => Math.abs(a.x - cat.x) - Math.abs(b.x - cat.x));
                const bowl = availableBowls[0];
                if (Math.abs(cat.x - bowl.x) < 42) {
                    cat.perchId = null;
                    cat.y = FLOOR_Y;
                    cat.state = 'eat';
                    cat.stateTimer = 3.5;
                    bowl.food = Math.max(0, bowl.food - 14);
                    cat.hunger = Math.min(100, cat.hunger + 28);
                    cat.happiness = Math.min(100, cat.happiness + 7);
                    cat.speech = 'Crunch crunch ♥';
                    cat.speechTimer = 2.0;
                    return;
                } else {
                    cat.perchId = null;
                    cat.y = FLOOR_Y;
                    cat.state = 'walk';
                    cat.targetX = bowl.x + (Math.random() - 0.5) * 28;
                    cat.stateTimer = Math.min(6, Math.abs(bowl.x - cat.x) / 75 + 1);
                    return;
                }
            }
        }

        // 2. Occasional litter box visit
        if (Math.random() < 0.08) {
            const box = LITTER_BOXES[Math.floor(Math.random() * LITTER_BOXES.length)];
            if (box.dirtiness < box.maxDirt) {
                box.dirtiness++;
            }
        }

        // 3. Daytime vs Nighttime personality!
        // During the day: cats nap a lot more in the cat trees, couch, and beds.
        // At night: cats are much more playful and run around (zoomies!).
        const r = Math.random();
        if (!night) {
            if (r < 0.58) {
                // Pick an unoccupied perch (or stay on current perch) to nap!
                const occupied = new Set(CATS.filter((c) => c !== cat && c.perchId).map((c) => c.perchId));
                const freePerches = PERCHES.filter((p) => !occupied.has(p.id));
                const chosen = freePerches.length > 0
                    ? freePerches[Math.floor(Math.random() * freePerches.length)]
                    : PERCHES[Math.floor(Math.random() * PERCHES.length)];

                cat.perchId = chosen.id;
                cat.x = chosen.x;
                cat.y = chosen.y;
                cat.targetX = chosen.x;
                cat.state = 'nap';
                cat.stateTimer = 7 + Math.random() * 7;
            } else if (r < 0.85) {
                cat.perchId = null;
                cat.y = FLOOR_Y;
                cat.state = 'walk';
                cat.targetX = Math.max(70, Math.min(WORLD_WIDTH - 70, cat.x + (Math.random() - 0.5) * 380));
                cat.stateTimer = 3.5 + Math.random() * 3;
            } else {
                cat.perchId = null;
                cat.y = FLOOR_Y;
                cat.state = 'idle';
                cat.stateTimer = 3 + Math.random() * 3;
            }
        } else {
            // Nighttime: Zoomies & playful exploring!
            if (r < 0.52) {
                cat.perchId = null;
                cat.y = FLOOR_Y;
                cat.state = 'zoomies';
                cat.targetX = Math.max(80, Math.min(WORLD_WIDTH - 80, cat.x + (Math.random() > 0.5 ? 1 : -1) * (280 + Math.random() * 380)));
                cat.stateTimer = 4.5 + Math.random() * 3.5;
                if (Math.random() < 0.4) {
                    cat.speech = 'Zoom!! 🐾';
                    cat.speechTimer = 1.6;
                }
            } else if (r < 0.82) {
                cat.perchId = null;
                cat.y = FLOOR_Y;
                cat.state = 'walk';
                cat.targetX = Math.max(70, Math.min(WORLD_WIDTH - 70, cat.x + (Math.random() - 0.5) * 440));
                cat.stateTimer = 3 + Math.random() * 3;
            } else {
                // Brief catnap even at night
                const occupied = new Set(CATS.filter((c) => c !== cat && c.perchId).map((c) => c.perchId));
                const freePerches = PERCHES.filter((p) => !occupied.has(p.id));
                const chosen = freePerches[Math.floor(Math.random() * freePerches.length)] || PERCHES[0];
                cat.perchId = chosen.id;
                cat.x = chosen.x;
                cat.y = chosen.y;
                cat.state = 'nap';
                cat.stateTimer = 4 + Math.random() * 4;
            }
        }
    }

    // =========================================================================
    // RETRO PIXEL-ART RENDERING ENGINE
    // =========================================================================

    function drawSkyWindow(wx, wy, ww, wh, daylight) {
        // Sky gradient based on time of day
        if (daylight > 0.65) {
            ctx.fillStyle = '#60a5fa';
            ctx.fillRect(wx, wy, ww, wh);
            // Sun & fluffy clouds
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(wx + ww * 0.72, wy + 34, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillRect(wx + 18, wy + 26, 36, 12);
            ctx.fillRect(wx + 24, wy + 20, 22, 8);
            // Green trees in background (like the Blue Ridge view photo!)
            ctx.fillStyle = '#15803d';
            ctx.fillRect(wx, wy + wh - 34, ww, 34);
            ctx.fillStyle = '#166534';
            ctx.fillRect(wx + 10, wy + wh - 44, 42, 16);
        } else if (daylight > 0.15) {
            // Sunset / Sunrise
            ctx.fillStyle = '#c2410c';
            ctx.fillRect(wx, wy, ww, wh * 0.55);
            ctx.fillStyle = '#fb923c';
            ctx.fillRect(wx, wy + wh * 0.55, ww, wh * 0.45);
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(wx + ww * 0.5, wy + wh - 28, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(wx, wy + wh - 24, ww, 24);
        } else {
            // Starry Night Sky
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(wx, wy, ww, wh);
            // Crescent Moon
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(wx + ww * 0.7, wy + 32, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(wx + ww * 0.7 + 5, wy + 29, 10, 0, Math.PI * 2);
            ctx.fill();
            // Twinkling Stars
            ctx.fillStyle = '#ffffff';
            const stars = [[18, 20], [42, 48], [76, 18], [30, 75], [88, 62]];
            stars.forEach(([sx, sy], idx) => {
                if ((Math.floor(westernTick * 2) + idx) % 3 !== 0) {
                    ctx.fillRect(wx + (sx % (ww - 8)), wy + (sy % (wh - 30)), 2, 2);
                }
            });
            ctx.fillStyle = '#020617';
            ctx.fillRect(wx, wy + wh - 24, ww, 24);
        }
    }

    function drawHouseEnvironment(daylight) {
        // 1. WALL BACKGROUNDS
        // Living Room & Hallway warm cream walls (x: 0 .. 1560)
        ctx.fillStyle = '#e7dec8';
        ctx.fillRect(0, 0, 1560, FLOOR_Y);

        // Dining Nook soft light-blue walls (x: 1560 .. 1850)
        ctx.fillStyle = '#cbe0e6';
        ctx.fillRect(1560, 0, 290, FLOOR_Y);

        // Kitchen patterned feather wallpaper wall (x: 1850 .. 2400)
        ctx.fillStyle = '#f3f1eb';
        ctx.fillRect(1850, 0, 550, FLOOR_Y);
        // Subtle colorful feather/confetti wallpaper accents from kitchen photo
        for (let fx = 1865; fx < 2390; fx += 28) {
            for (let fy = 18; fy < 165; fy += 24) {
                ctx.fillStyle = (fx + fy) % 3 === 0 ? '#60a5fa' : (fx + fy) % 2 === 0 ? '#f472b6' : '#34d399';
                ctx.fillRect(fx, fy, 6, 3);
            }
        }

        // Wallpaper border trim in Dining & Kitchen
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(1560, 210, 290, 8);
        ctx.fillStyle = '#e11d48';
        for (let bx = 1568; bx < 1845; bx += 16) {
            ctx.fillRect(bx, 212, 6, 4);
        }

        // Baseboards
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, FLOOR_Y - 10, WORLD_WIDTH, 10);

        // 2. FLOORS
        // Living Room & Hallway Oak Hardwood Floor (0 .. 1560)
        ctx.fillStyle = '#9a5b25';
        ctx.fillRect(0, FLOOR_Y, 1560, VIEW_H - FLOOR_Y);
        ctx.strokeStyle = '#7c4316';
        ctx.lineWidth = 2;
        for (let px = 0; px < 1560; px += 48) {
            ctx.beginPath();
            ctx.moveTo(px, FLOOR_Y);
            ctx.lineTo(px - 22, VIEW_H);
            ctx.stroke();
        }
        // Horizontal plank lines
        ctx.fillStyle = '#854a1c';
        ctx.fillRect(0, FLOOR_Y + 24, 1560, 2);
        ctx.fillRect(0, FLOOR_Y + 48, 1560, 2);

        // Dining & Kitchen White Tile Floor with Black Diamond Dots (1560 .. 2400)
        ctx.fillStyle = '#f1f0ea';
        ctx.fillRect(1560, FLOOR_Y, 840, VIEW_H - FLOOR_Y);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        for (let tx = 1560; tx < 2400; tx += 28) {
            ctx.beginPath();
            ctx.moveTo(tx, FLOOR_Y);
            ctx.lineTo(tx, VIEW_H);
            ctx.stroke();
            for (let ty = FLOOR_Y + 14; ty < VIEW_H; ty += 22) {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(tx - 2, ty - 2, 4, 4);
            }
        }

        // =====================================================================
        // ZONE 1: LIVING ROOM DETAILS (x: 0 .. 1180)
        // =====================================================================

        // Ceiling Fan in Living Room
        ctx.fillStyle = '#78350f';
        ctx.fillRect(496, 0, 8, 26);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(442, 24, 116, 6);
        // Fan lights
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(488, 36, 7, 0, Math.PI * 2);
        ctx.arc(512, 36, 7, 0, Math.PI * 2);
        ctx.fill();

        // "Jesus" plaque above Patio Door (from photo!)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(118, 52, 74, 22);
        ctx.strokeStyle = '#78350f';
        ctx.strokeRect(118, 52, 74, 22);
        ctx.fillStyle = '#57534e';
        ctx.font = 'italic 11px Georgia, serif';
        ctx.fillText('Jesus', 140, 67);

        // Patio Glass Door & Window (x: 78 .. 240)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(78, 86, 156, 250);
        drawSkyWindow(86, 94, 140, 234, daylight);
        // White Window Grid Panes
        ctx.fillStyle = '#f8fafc';
        for (let gx = 120; gx < 220; gx += 35) {
            ctx.fillRect(gx, 94, 4, 234);
        }
        for (let gy = 140; gy < 320; gy += 45) {
            ctx.fillRect(86, gy, 140, 4);
        }
        // Dark Navy Curtains flanking the patio door
        ctx.fillStyle = '#172554';
        ctx.fillRect(66, 82, 22, 265);
        ctx.fillRect(224, 82, 22, 265);
        // Curtain rod
        ctx.fillStyle = '#475569';
        ctx.fillRect(58, 80, 196, 4);

        // TWO MULTI-TIER GRAY CAT TREES (x: 75..275)
        // Left Tall Gray Cat Tree
        ctx.fillStyle = '#64748b';
        ctx.fillRect(82, 355, 76, 31); // Base cubby
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(104, 362, 28, 24); // Cubby hole
        // Sisal scratching posts
        ctx.fillStyle = '#d6c7a1';
        ctx.fillRect(96, 186, 10, 170);
        ctx.fillRect(132, 246, 10, 110);
        // Plush gray platforms
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(74, 302, 54, 10);  // Low perch
        ctx.fillRect(112, 246, 56, 12); // Mid hammock
        ctx.fillRect(84, 184, 62, 12);  // Top lookout bed

        // Right Gray Cat Tree
        ctx.fillStyle = '#475569';
        ctx.fillRect(196, 350, 74, 36); // Base
        ctx.fillStyle = '#d6c7a1';
        ctx.fillRect(212, 208, 10, 142);
        ctx.fillRect(248, 268, 10, 82);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(198, 206, 60, 12); // Top platform
        ctx.fillRect(228, 266, 56, 11); // Mid platform

        // Framed Blue/Purple Butterfly Painting above Sofa (x: 365, y: 88)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(355, 82, 118, 84);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(361, 88, 106, 72);
        // Butterfly wings in pixel art
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(380, 100, 28, 24);
        ctx.fillRect(420, 100, 28, 24);
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(386, 126, 22, 18);
        ctx.fillRect(420, 126, 22, 18);
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(411, 98, 6, 48);

        // Blue Dresser behind Sofa + Floral Blanket Couch (x: 315 .. 505)
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(325, 255, 160, 125); // Blue dresser behind sofa
        // Sofa body
        ctx.fillStyle = '#292524';
        ctx.fillRect(320, 290, 185, 96);
        // Floral pattern throw blanket over the sofa
        ctx.fillStyle = '#44403c';
        ctx.fillRect(330, 292, 165, 68);
        for (let fx = 338; fx < 488; fx += 18) {
            for (let fy = 298; fy < 354; fy += 16) {
                ctx.fillStyle = (fx + fy) % 2 === 0 ? '#f4a261' : '#93c5fd';
                ctx.fillRect(fx, fy, 5, 5);
            }
        }
        // Cream cat bed on sofa cushion
        ctx.fillStyle = '#f5f5f4';
        ctx.fillRect(434, 312, 44, 12);

        // STACKED STONE FIREPLACE (x: 548 .. 718)
        ctx.fillStyle = '#a89882';
        ctx.fillRect(548, 42, 170, 344);
        // Stone texture bricks
        ctx.fillStyle = '#8c7a65';
        for (let sy = 50; sy < 375; sy += 18) {
            for (let sx = 554; sx < 706; sx += 32) {
                ctx.fillRect(sx + ((sy % 36 === 0) ? 10 : 0), sy, 24, 12);
            }
        }
        // Painting on Stone Fireplace above Mantel
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(584, 66, 98, 74);
        ctx.fillStyle = '#93c5fd';
        ctx.fillRect(592, 74, 82, 58);
        ctx.fillStyle = '#334155';
        ctx.fillRect(592, 108, 82, 24);
        // Wooden Mantel Shelf
        ctx.fillStyle = '#78350f';
        ctx.fillRect(556, 152, 154, 12);
        // Mantel clock & figurines
        ctx.fillStyle = '#451a03';
        ctx.fillRect(624, 140, 18, 12);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(572, 138, 8, 14);
        ctx.fillRect(682, 138, 8, 14);

        // Black Fireplace Hearth & Model Ship inside
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(580, 256, 108, 112);
        // Model tall ship inside the fireplace
        ctx.fillStyle = '#78350f';
        ctx.fillRect(604, 342, 58, 14);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(614, 306, 12, 34);
        ctx.fillRect(630, 298, 14, 42);
        ctx.fillRect(648, 310, 10, 30);

        // Floor Lamp by Fireplace
        ctx.fillStyle = '#334155';
        ctx.fillRect(596, 220, 4, 155);
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.moveTo(580, 224);
        ctx.lineTo(616, 224);
        ctx.lineTo(606, 198);
        ctx.lineTo(590, 198);
        ctx.closePath();
        ctx.fill();

        // Blue-Draped Armchair in front of fireplace left (x: 525 .. 595)
        ctx.fillStyle = '#785946';
        ctx.fillRect(522, 295, 76, 91);
        ctx.fillStyle = '#3b82f6'; // Blue cover blanket
        ctx.fillRect(526, 292, 68, 72);
        ctx.fillStyle = '#fbcfe8'; // Pink/white round cat pillow
        ctx.fillRect(538, 314, 46, 10);

        // Black Ladder-Back Rocking Chair (x: 722 .. 772)
        ctx.fillStyle = '#18181b';
        ctx.fillRect(726, 248, 6, 138);
        ctx.fillRect(764, 248, 6, 138);
        for (let ry = 258; ry < 325; ry += 16) {
            ctx.fillRect(728, ry, 38, 5);
        }
        ctx.fillStyle = '#dc2626'; // Red cushion
        ctx.fillRect(726, 330, 44, 10);

        // FRAMED SHIP PAINTING & WALL CROSS above TV (x: 800 .. 980)
        ctx.fillStyle = '#334155';
        ctx.fillRect(808, 72, 132, 96);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(816, 80, 116, 80);
        // Ghostly tall ship on ocean in painting
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(862, 98, 22, 36);
        ctx.fillStyle = '#475569';
        ctx.fillRect(816, 136, 116, 24);

        // Decorative Wall Cross to the right of TV painting
        ctx.fillStyle = '#44403c';
        ctx.fillRect(968, 102, 6, 42);
        ctx.fillRect(954, 114, 34, 6);

        // WOOD TV CONSOLE & BIG FLATSCREEN TV PLAYING A B&W WESTERN (x: 790 .. 960)
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(788, 308, 174, 78);
        ctx.fillStyle = '#422006';
        ctx.fillRect(798, 322, 72, 24);
        ctx.fillRect(880, 322, 72, 24);

        // Flatscreen TV Frame
        ctx.fillStyle = '#09090b';
        ctx.fillRect(796, 198, 158, 104);

        // Animated Black-and-White Western Movie on TV Screen!
        drawWesternMovieOnTV(802, 204, 146, 92);

        // Navy Blue Area Rug & Cat Toys/Tunnel/Donut Bed in front of TV
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(720, FLOOR_Y, 275, 14);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(728, FLOOR_Y + 3, 259, 4);

        // Gray Donut Cat Bed (x: 745)
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(740, 368, 52, 18);
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(754, 372, 24, 8);

        // Orange/Brown Cardboard Cat Box (x: 822)
        ctx.fillStyle = '#b45309';
        ctx.fillRect(820, 354, 52, 32);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(834, 364, 24, 22);

        // Cat Play Tunnel (x: 895)
        ctx.fillStyle = '#d6d3d1';
        ctx.fillRect(890, 360, 68, 26);
        ctx.fillStyle = '#78716c';
        for (let tx = 896; tx < 952; tx += 12) {
            ctx.fillRect(tx, 362, 4, 22);
        }

        // DAD (WILLIAM) IN THE LARGE PLUSH BROWN RECLINER (x: 1020 .. 1135)
        drawDadInRecliner();

        // =====================================================================
        // ZONE 2: FOYER & HALLWAY (x: 1180 .. 1560)
        // =====================================================================

        // Light Oak Glass Curio Cabinet (x: 1148 .. 1218)
        ctx.fillStyle = '#d6c29f';
        ctx.fillRect(1148, 130, 68, 256);
        ctx.fillStyle = 'rgba(186, 230, 253, 0.38)';
        ctx.fillRect(1156, 152, 52, 218);
        // Shelves & miniature castle figurines inside curio cabinet
        for (let cy = 198; cy <= 338; cy += 46) {
            ctx.fillStyle = '#b49a6c';
            ctx.fillRect(1156, cy, 52, 4);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(1166, cy - 18, 14, 18);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(1184, cy - 14, 16, 14);
        }

        // White Folding Pet Gate in doorway (x: 1228)
        ctx.fillStyle = '#f8fafc';
        for (let gx = 1226; gx <= 1254; gx += 7) {
            ctx.fillRect(gx, 246, 3, 140);
        }
        ctx.fillRect(1226, 254, 31, 4);
        ctx.fillRect(1226, 368, 31, 4);

        // Framed TITANIC Poster on Hallway Wall (x: 1272, y: 96)
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(1272, 92, 68, 98);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(1278, 98, 56, 86);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('TITANIC', 1284, 112);
        // Ship bow illustration
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(1296, 126, 20, 44);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(1302, 116, 8, 10);

        // 3 Decorative Wall Plates on Wire Rack (x: 1364)
        [106, 138, 170].forEach((py) => {
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.arc(1368, py, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Framed Titanic Photo & 3D Titanic Ship Model on Shelf (x: 1410 .. 1545)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(1406, 102, 74, 58);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(1414, 110, 58, 42);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(1422, 128, 42, 10);

        // 3D Model Titanic on Wall Shelf (x: 1495, y: 122)
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(1494, 132, 56, 6);
        ctx.fillStyle = '#18181b';
        ctx.fillRect(1496, 126, 52, 6);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(1502, 120, 40, 6);
        // 4 iconic yellow/black smokestacks!
        [1506, 1515, 1524, 1533].forEach((fx) => {
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(fx, 110, 5, 10);
            ctx.fillStyle = '#18181b';
            ctx.fillRect(fx, 110, 5, 3);
        });

        // Purple Sticker-Covered Cat Cube Box in Hallway (x: 1412)
        ctx.fillStyle = '#7e22ce';
        ctx.fillRect(1410, 342, 52, 44);
        ctx.fillStyle = '#f5f5f4'; // Cozy white plush top pad
        ctx.fillRect(1408, 336, 56, 8);
        ctx.fillStyle = '#1e1b4b'; // Cube opening
        ctx.fillRect(1424, 356, 24, 30);
        // Little stickers on the purple box
        ctx.fillStyle = '#fde047';
        ctx.fillRect(1414, 348, 6, 5);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(1450, 352, 6, 6);

        // =====================================================================
        // ZONE 3: DINING NOOK & KITCHEN (x: 1560 .. 2400)
        // =====================================================================

        // Framed Butterfly Art in Dining Nook (x: 1645, y: 82)
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(1640, 78, 114, 80);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(1646, 84, 102, 68);
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(1664, 96, 28, 22);
        ctx.fillRect(1702, 96, 28, 22);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(1670, 120, 22, 18);
        ctx.fillRect(1702, 120, 22, 18);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(1695, 94, 4, 46);

        // Stained-Glass Tiffany Pendant Lamp above Dining Table (x: 1695)
        ctx.fillStyle = '#334155';
        ctx.fillRect(1696, 0, 3, 146);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(1670, 168);
        ctx.lineTo(1724, 168);
        ctx.lineTo(1708, 144);
        ctx.lineTo(1686, 144);
        ctx.closePath();
        ctx.fill();
        // Stained glass colored segments
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(1676, 160, 12, 6);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(1692, 160, 10, 6);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(1706, 160, 12, 6);

        // Dining Table & Green X-Back Chairs (x: 1615 .. 1775)
        // Green chairs
        ctx.fillStyle = '#4d7c6f';
        ctx.fillRect(1612, 276, 10, 110);
        ctx.fillRect(1612, 332, 38, 8);
        ctx.fillRect(1642, 332, 8, 54);

        ctx.fillRect(1772, 276, 10, 110);
        ctx.fillRect(1742, 332, 38, 8);
        ctx.fillRect(1742, 332, 8, 54);

        // Wood tabletop & white legs
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(1640, 314, 10, 72);
        ctx.fillRect(1744, 314, 10, 72);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(1628, 304, 138, 12);

        // Black Water Cooler Dispenser with Blue 5-Gallon Jug (x: 1806)
        ctx.fillStyle = '#18181b';
        ctx.fillRect(1804, 290, 40, 96);
        ctx.fillStyle = '#2563eb'; // Blue water bottle
        ctx.fillRect(1808, 244, 32, 46);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(1812, 252, 10, 30);

        // BLACK REFRIGERATOR WITH FAMILY MAGNETS & BUTTERFLIES (x: 1864 .. 1958)
        ctx.fillStyle = '#18181b';
        ctx.fillRect(1864, 168, 94, 218);
        ctx.fillStyle = '#52525b';
        ctx.fillRect(1864, 314, 94, 4); // Bottom freezer divider
        ctx.fillRect(1946, 184, 5, 116); // Fridge handle
        ctx.fillRect(1878, 324, 66, 4);  // Freezer handle
        // Family photo magnets & butterfly magnets on the fridge!
        const magnets = [
            { x: 1876, y: 188, w: 16, h: 14, c: '#f8fafc' },
            { x: 1900, y: 184, w: 22, h: 16, c: '#fde68a' },
            { x: 1928, y: 192, w: 12, h: 16, c: '#f8fafc' },
            { x: 1882, y: 214, w: 24, h: 16, c: '#bfdbfe' },
            { x: 1914, y: 218, w: 20, h: 14, c: '#fecdd3' },
            { x: 1876, y: 242, w: 14, h: 18, c: '#d9f99d' },
            { x: 1898, y: 244, w: 22, h: 16, c: '#f8fafc' },
            { x: 1924, y: 250, w: 18, h: 12, c: '#fef08a' }
        ];
        magnets.forEach((m) => {
            ctx.fillStyle = m.c;
            ctx.fillRect(m.x, m.y, m.w, m.h);
            ctx.fillStyle = '#334155';
            ctx.fillRect(m.x + 3, m.y + 3, m.w - 6, m.h - 6);
        });

        // White Kitchen Upper Cabinets & "HOME" Letters on Top (x: 1966 .. 2380)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(1966, 86, 108, 92);
        ctx.strokeStyle = '#cbd5e1';
        ctx.strokeRect(1972, 92, 46, 80);
        ctx.strokeRect(2022, 92, 46, 80);

        // "HOME" letters atop cabinet
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 13px Georgia, serif';
        ctx.fillText('H O M E', 1986, 82);

        // Kitchen Window above Sink with Floral Valance (x: 2088 .. 2178)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(2088, 92, 90, 108);
        drawSkyWindow(2094, 98, 78, 96, daylight);
        // Floral curtain valance
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(2084, 88, 98, 22);
        for (let vx = 2090; vx < 2178; vx += 14) {
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(vx, 94, 6, 6);
        }

        // OVER-ISLAND RANGE HOOD WITH "Love + House + Cat = Happy Home" SIGN (x: 2195 .. 2355)
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(2195, 36, 156, 102);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(2186, 138, 174, 18);
        // The iconic sign from the kitchen photo!
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(2215, 76, 118, 34);
        ctx.fillStyle = '#f5f5f4';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('♥ Love + House + Cat', 2221, 90);
        ctx.fillStyle = '#fde047';
        ctx.fillText('= Happy Home 🏡', 2232, 103);

        // Kitchen Blue Countertops & White Lower Cabinets (x: 1966 .. 2380)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(1966, 268, 414, 118);
        ctx.strokeStyle = '#cbd5e1';
        for (let cx = 1974; cx < 2365; cx += 54) {
            ctx.strokeRect(cx, 280, 48, 96);
        }
        // Blue slate countertop
        ctx.fillStyle = '#334155';
        ctx.fillRect(1962, 256, 422, 12);

        // Sink faucet & Cat Food Bag on Kitchen Counter
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(2130, 236, 6, 20);
        ctx.fillRect(2122, 236, 14, 5);

        // Cat Food Bag ("MEOW MIX / PURR CHOW") on Counter
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(2230, 218, 32, 38);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(2234, 226, 24, 14);
        ctx.fillStyle = '#1c1917';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('CAT', 2238, 236);

        // Draw Interactive Stations (Bowls & Litter Boxes)
        drawFoodBowls();
        drawLitterBoxes();

        // Nighttime Cozy Warm Lighting Overlay & Lamp Glows
        if (daylight < 0.85) {
            const darkness = (1 - daylight) * 0.42;
            ctx.fillStyle = `rgba(10, 15, 35, ${darkness})`;
            ctx.fillRect(0, 0, WORLD_WIDTH, VIEW_H);

            // Warm pools of light from Fireplace Lamp, TV, and Tiffany Lamp
            const lamps = [
                { x: 598, y: 230, r: 170, color: 'rgba(254, 240, 138, 0.22)' },
                { x: 875, y: 250, r: 150, color: 'rgba(226, 232, 240, 0.18)' },
                { x: 1697, y: 195, r: 175, color: 'rgba(254, 215, 102, 0.24)' },
                { x: 2270, y: 190, r: 160, color: 'rgba(254, 240, 138, 0.18)' }
            ];
            lamps.forEach((l) => {
                const grad = ctx.createRadialGradient(l.x, l.y, 10, l.x, l.y, l.r);
                grad.addColorStop(0, l.color);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    // Black & White Western Movie on the Living Room TV!
    function drawWesternMovieOnTV(tx, ty, tw, th) {
        // Grayscale sky & desert floor
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(tx, ty, tw, th * 0.62);
        ctx.fillStyle = '#71717a';
        ctx.fillRect(tx, ty + th * 0.62, tw, th * 0.38);

        // Distant Monument Valley Mesas in B&W
        ctx.fillStyle = '#52525b';
        ctx.fillRect(tx + 14, ty + 34, 28, 24);
        ctx.fillRect(tx + 20, ty + 26, 16, 8);
        ctx.fillRect(tx + 96, ty + 38, 34, 20);

        // Saguaro Cactus
        ctx.fillStyle = '#27272a';
        ctx.fillRect(tx + 122, ty + 44, 4, 22);
        ctx.fillRect(tx + 116, ty + 50, 16, 3);
        ctx.fillRect(tx + 116, ty + 46, 3, 6);
        ctx.fillRect(tx + 129, ty + 45, 3, 7);

        // Animated Cowboy on Horse riding across screen!
        const riderX = tx + ((westernTick * 26) % (tw - 26));
        const bounce = Math.floor(westernTick * 10) % 2 === 0 ? 0 : -2;
        const ry = ty + 50 + bounce;

        // Horse body & legs (black silhouette)
        ctx.fillStyle = '#18181b';
        ctx.fillRect(riderX, ry + 8, 18, 8);      // Horse body
        ctx.fillRect(riderX + 14, ry + 3, 6, 7);  // Horse neck/head
        ctx.fillRect(riderX - 4, ry + 8, 4, 5);   // Tail
        const legOffset = Math.floor(westernTick * 12) % 2 === 0 ? 2 : -2;
        ctx.fillRect(riderX + 2 + legOffset, ry + 16, 3, 6);
        ctx.fillRect(riderX + 13 - legOffset, ry + 16, 3, 6);

        // Cowboy with Stetson hat
        ctx.fillStyle = '#27272a';
        ctx.fillRect(riderX + 6, ry, 6, 9);
        ctx.fillRect(riderX + 3, ry - 3, 12, 3); // Cowboy hat brim

        // Rolling tumbleweed
        const weedX = tx + tw - 12 - ((westernTick * 38) % (tw - 16));
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(weedX, ty + 68 + (Math.floor(westernTick * 8) % 2) * 2, 6, 6);

        // Vintage B&W film grain & cinema subtitle banner
        ctx.fillStyle = '#18181b';
        ctx.fillRect(tx, ty, tw, 12);
        ctx.fillStyle = '#e4e4e7';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('🎬 B&W WESTERN: LONE RIDER', tx + 8, ty + 9);
    }

    // Dad (William) sleeping in the large plush brown recliner watching the Western
    function drawDadInRecliner() {
        const dx = dad.x;
        const dy = dad.y;

        // Large Plush Tufted Brown Recliner Chair (facing slightly left toward TV)
        ctx.fillStyle = '#451a03';
        ctx.fillRect(dx - 44, dy - 104, 88, 104); // Chair back & base
        ctx.fillStyle = '#5c2808';
        ctx.fillRect(dx - 40, dy - 98, 80, 92);   // Plush cushions
        // Tufted segments on brown recliner
        ctx.fillStyle = '#3b1704';
        ctx.fillRect(dx - 38, dy - 72, 76, 3);
        ctx.fillRect(dx - 38, dy - 46, 76, 3);
        // Big puffy armrests & footrest extended
        ctx.fillStyle = '#6b300b';
        ctx.fillRect(dx - 58, dy - 38, 22, 30); // Extended footrest
        ctx.fillRect(dx - 46, dy - 56, 88, 16); // Plush arm

        // WILLIAM (DAD) — Gray hair & beard, black & white striped polo, khaki shorts, white socks & sneakers
        // Legs/Khaki Shorts on footrest
        ctx.fillStyle = '#78716c'; // Khaki shorts
        ctx.fillRect(dx - 44, dy - 46, 26, 14);
        // White socks & gray/white sneakers
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(dx - 58, dy - 42, 14, 8);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(dx - 64, dy - 44, 9, 13);

        // Torso: Black & White Horizontal Striped Polo Shirt (from photo!)
        ctx.fillStyle = '#18181b';
        ctx.fillRect(dx - 22, dy - 82, 38, 36);
        ctx.fillStyle = '#e2e8f0';
        for (let sy = dy - 78; sy < dy - 48; sy += 6) {
            ctx.fillRect(dx - 22, sy, 38, 2);
        }
        // Black polo collar
        ctx.fillStyle = '#09090b';
        ctx.fillRect(dx - 12, dy - 84, 18, 5);

        // Head (tilted back snoozing peacefully)
        ctx.fillStyle = '#f1c29b';
        ctx.fillRect(dx - 14, dy - 104, 24, 22);
        // Gray hair & full gray/white beard
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(dx - 15, dy - 108, 26, 7); // Hair
        ctx.fillStyle = '#d1d5db';
        ctx.fillRect(dx - 14, dy - 90, 22, 9);  // Beard
        // Closed sleeping eyes
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(dx - 10, dy - 96, 6, 2);
        ctx.fillRect(dx - 1, dy - 96, 6, 2);

        // THOUGHT BUBBLE ABOVE DAD WITH Z's!
        const bx = dx - 6;
        const by = dy - 142;
        // Thought bubble trail circles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.beginPath();
        ctx.arc(dx - 4, dy - 115, 3, 0, Math.PI * 2);
        ctx.arc(dx - 5, dy - 124, 5, 0, Math.PI * 2);
        ctx.fill();

        // Main cloud thought bubble
        ctx.beginPath();
        ctx.arc(bx - 14, by, 14, 0, Math.PI * 2);
        ctx.arc(bx + 2, by - 4, 16, 0, Math.PI * 2);
        ctx.arc(bx + 18, by, 13, 0, Math.PI * 2);
        ctx.fill();

        // Animated Z's inside & floating from thought bubble
        ctx.fillStyle = '#1d4ed8';
        ctx.font = 'bold 12px monospace';
        const zAnim = Math.floor(westernTick * 2.5) % 3;
        const zStr = zAnim === 0 ? 'Z z .' : zAnim === 1 ? 'z Z z' : 'Z Z Z';
        ctx.fillText(zStr, bx - 16, by + 4);

        // Dad's label
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(dx - 38, dy - 18, 78, 15);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('Dad (William)', dx - 34, dy - 8);

        if (dad.mumbleText) {
            drawSpeechBubble(dx, dy - 162, dad.mumbleText, '#e0f2fe');
        }
    }

    function drawFoodBowls() {
        FOOD_BOWLS.forEach((b) => {
            // Placemat
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(b.x - 28, b.y - 4, 56, 5);
            // Food bowl
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(b.x - 22, b.y - 12, 22, 10);
            // Water bowl
            ctx.fillStyle = '#60a5fa';
            ctx.fillRect(b.x + 4, b.y - 12, 20, 10);
            ctx.fillStyle = '#bae6fd';
            ctx.fillRect(b.x + 6, b.y - 11, 16, 4);

            // Kibble mound proportional to b.food
            if (b.food > 5) {
                const kh = Math.ceil((b.food / b.maxFood) * 8);
                ctx.fillStyle = '#92400e';
                ctx.fillRect(b.x - 19, b.y - 11 - kh, 16, kh);
            }

            // Prompt if Mom is nearby
            if (Math.abs(mom.x - b.x) < 85) {
                ctx.fillStyle = '#fef08a';
                ctx.font = 'bold 10px monospace';
                ctx.fillText(`[Space/1] Fill (${Math.round(b.food)}%)`, b.x - 48, b.y - 24);
            }
        });
    }

    function drawLitterBoxes() {
        LITTER_BOXES.forEach((box) => {
            // Litter box tray
            ctx.fillStyle = '#475569';
            ctx.fillRect(box.x - 24, box.y - 15, 48, 15);
            // Clean sandy litter inside
            ctx.fillStyle = '#d6d3d1';
            ctx.fillRect(box.x - 20, box.y - 15, 40, 5);

            // Clumps & stink lines if dirty
            if (box.dirtiness > 0) {
                ctx.fillStyle = '#78350f';
                for (let c = 0; c < box.dirtiness; c++) {
                    ctx.fillRect(box.x - 14 + c * 11, box.y - 18, 7, 4);
                }
                // Wavy stink lines
                ctx.strokeStyle = '#84cc16';
                ctx.lineWidth = 1.5;
                for (let s = 0; s < box.dirtiness; s++) {
                    const sx = box.x - 10 + s * 10;
                    const wave = Math.sin(westernTick * 5 + s) * 3;
                    ctx.beginPath();
                    ctx.moveTo(sx, box.y - 22);
                    ctx.lineTo(sx + wave, box.y - 34);
                    ctx.stroke();
                }
            }

            if (Math.abs(mom.x - box.x) < 85) {
                ctx.fillStyle = box.dirtiness > 0 ? '#fde047' : '#67e8f9';
                ctx.font = 'bold 10px monospace';
                ctx.fillText(
                    box.dirtiness > 0 ? '[Space/2] Scoop Litter!' : 'Litter Clean ✨',
                    box.x - 45,
                    box.y - 38
                );
            }
        });
    }

    // =========================================================================
    // DRAW TERESA (MOM) — PLAYABLE CHARACTER
    // Based on reference photo: Fluffy white/silver short hair, glasses,
    // blue-to-lime-green tie-dye blouse, navy capri pants, white sneakers!
    // =========================================================================
    function drawMom() {
        const mx = Math.round(mom.x);
        const my = Math.round(mom.y);
        const f = mom.facing;
        const isWalking = Math.abs(mom.vx) > 5 && !mom.isHopping;
        const legSwing = isWalking ? Math.sin(mom.walkFrame) * 6 : 0;
        const bob = isWalking ? Math.abs(Math.cos(mom.walkFrame)) * 2 : 0;

        ctx.save();
        ctx.translate(mx, my - bob);

        // Shadow on floor
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(-16, bob - 3, 32, 5);

        // Legs & Navy Capri Pants + White Sneakers
        // Back leg
        ctx.fillStyle = '#172554'; // Dark navy capris
        ctx.fillRect(-7 - legSwing * 0.5, -34, 8, 20);
        ctx.fillStyle = '#f1c29b'; // Lower calf/ankle
        ctx.fillRect(-6 - legSwing * 0.5, -14, 6, 6);
        ctx.fillStyle = '#f8fafc'; // White sneaker
        ctx.fillRect(-8 - legSwing * 0.5, -8, 12, 8);

        // Front leg
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(1 + legSwing * 0.5, -34, 8, 20);
        ctx.fillStyle = '#f1c29b';
        ctx.fillRect(2 + legSwing * 0.5, -14, 6, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0 + legSwing * 0.5, -8, 12, 8);

        // Torso: Signature Blue-top to Lime-Green-bottom Tie-Dye Blouse!
        // Upper sky-blue tie-dye section
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-14, -70, 28, 18);
        ctx.fillStyle = '#bae6fd'; // Tie-dye swirl highlights
        ctx.fillRect(-9, -66, 6, 8);
        ctx.fillRect(3, -64, 6, 8);
        // Lower lime-green gradient section of top
        ctx.fillStyle = '#84cc16';
        ctx.fillRect(-15, -52, 30, 19);
        ctx.fillStyle = '#bef264'; // Crochet lace hem detail
        ctx.fillRect(-15, -36, 30, 3);

        // Head & Neck
        ctx.fillStyle = '#f5cba7';
        ctx.fillRect(-10, -92, 20, 22);

        // Fluffy White/Silver Hair (feathered short bob with bangs)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-13, -98, 26, 9);          // Top volume
        ctx.fillRect(f > 0 ? -14 : 4, -92, 10, 18); // Back hair feathers
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-11, -94, 22, 4);

        // Glasses & Warm Smile
        const eyeX = f > 0 ? 3 : -7;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(eyeX - 2, -85, 7, 5); // Eyeglass frame
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(eyeX + 1, -83, 2, 2);   // Eye
        // Warm smile
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(f > 0 ? 3 : -6, -76, 4, 2);

        // Arm & Active Care Tool (Food Bowl, Litter Scoop, or Feather Wand)
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-4, -68, 9, 11);
        ctx.fillStyle = '#f5cba7';
        const armAngleOffset = mom.actionState ? Math.sin(mom.wandAngle) * 5 : 0;
        ctx.fillRect(f * 6, -58 + armAngleOffset, 8, 7);

        if (mom.actionState === 'wand') {
            // Feather Wand Toy!
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(f * 12, -55);
            ctx.lineTo(f * 36, -78 + armAngleOffset * 2);
            ctx.stroke();
            // Colorful feathers on string
            ctx.fillStyle = '#ec4899';
            ctx.fillRect(f * 42, -52 - armAngleOffset * 2, 8, 6);
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(f * 46, -47 - armAngleOffset * 2, 7, 5);
        } else if (mom.actionState === 'scoop') {
            // Teal Litter Scoop
            ctx.fillStyle = '#2dd4bf';
            ctx.fillRect(f * 14, -54 + armAngleOffset, 12, 8);
        } else if (mom.actionState === 'feed') {
            // Pouring Cat Food Box
            ctx.fillStyle = '#f97316';
            ctx.fillRect(f * 14, -60 + armAngleOffset, 12, 14);
        }

        ctx.restore();

        // Player Name Badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
        ctx.fillRect(mx - 36, my - 114, 72, 15);
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('Mom (Teresa)', mx - 32, my - 104);

        if (mom.speechTimer > 0 && mom.speech) {
            drawSpeechBubble(mx, my - 126, mom.speech, '#fef9c3');
        }
    }

    // =========================================================================
    // DRAW THE 6 CATS (Mini, Stella, Otis, Jack, Jill, Cozette)
    // =========================================================================
    function drawCat(cat) {
        const cx = Math.round(cat.x);
        const cy = Math.round(cat.y);
        const s = cat.size;
        const f = cat.facing;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(s, s);

        // Coat colors
        let primary = '#18181b'; // Tuxedo black
        let secondary = '#f8fafc'; // White chest/paws
        let patchColor = null;

        if (cat.coat === 'orange') {
            primary = cat.id === 'jack' ? '#ea580c' : '#f97316';
            secondary = '#ffedd5';
            patchColor = '#9a3412'; // Tabby stripes
        } else if (cat.coat === 'calico') {
            primary = '#f8fafc'; // White base
            secondary = '#ea580c'; // Orange patches
            patchColor = '#18181b'; // Black patches
        }

        if (cat.state === 'nap') {
            // Curled up sleeping cat ball
            ctx.fillStyle = primary;
            ctx.fillRect(-15, -14, 30, 14);
            if (cat.coat === 'calico') {
                ctx.fillStyle = secondary;
                ctx.fillRect(-10, -14, 11, 9);
                ctx.fillStyle = patchColor;
                ctx.fillRect(2, -13, 10, 8);
            } else if (cat.coat === 'tuxedo') {
                ctx.fillStyle = secondary;
                ctx.fillRect(-6, -6, 12, 6);
            }
            // Cute ears
            ctx.fillStyle = primary;
            ctx.fillRect(f * 6, -19, 5, 5);
            ctx.fillRect(f * 12, -19, 5, 5);
            // Floating Zzz
            ctx.fillStyle = '#93c5fd';
            ctx.font = 'bold 10px monospace';
            const zOff = Math.sin(westernTick * 3 + cx) * 3;
            ctx.fillText('zZz', -8, -24 + zOff);
        } else {
            // Standing / Walking / Zooming / Startled Cat
            const isMoving = cat.state === 'walk' || cat.state === 'zoomies' || cat.state === 'play' || cat.state === 'startled';
            const stride = isMoving ? Math.sin(cat.animFrame) * 4 : 0;
            const archBack = cat.state === 'startled' ? -6 : 0;

            // Tail sticking out behind (Important: Mom can accidentally step on it if on floor!)
            const tailWag = Math.sin(cat.animFrame * 0.8) * 3;
            ctx.strokeStyle = cat.coat === 'calico' ? '#18181b' : primary;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-f * 13, -12);
            if (cat.state === 'startled') {
                // Straight puffed-up vertical tail when startled!
                ctx.lineTo(-f * 18, -34);
            } else {
                // Tail extending behind cat along floor level
                ctx.lineTo(-f * 28, -8 + tailWag);
            }
            ctx.stroke();

            // Legs & White Socks
            ctx.fillStyle = primary;
            ctx.fillRect(-11 + stride, -10, 5, 10);
            ctx.fillRect(6 - stride, -10, 5, 10);
            ctx.fillStyle = secondary; // Cute white paws
            ctx.fillRect(-11 + stride, -3, 5, 3);
            ctx.fillRect(6 - stride, -3, 5, 3);

            // Cat Body
            ctx.fillStyle = primary;
            ctx.fillRect(-14, -22 + archBack, 28, 13 - archBack * 0.5);

            // Coat Markings
            if (cat.coat === 'tuxedo') {
                // White tuxedo bib/chest
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(f > 0 ? 5 : -13, -20, 8, 10);
            } else if (cat.coat === 'orange') {
                // Tabby stripes
                ctx.fillStyle = patchColor;
                ctx.fillRect(-8, -22, 3, 9);
                ctx.fillRect(-1, -22, 3, 9);
                ctx.fillRect(6, -22, 3, 9);
            } else if (cat.coat === 'calico') {
                // Calico orange and black patches
                ctx.fillStyle = secondary;
                ctx.fillRect(-11, -22, 10, 8);
                ctx.fillStyle = patchColor;
                ctx.fillRect(1, -21, 9, 9);
            }

            // Head & Pointy Ears
            const hx = f * 12;
            const hy = -28 + archBack;
            ctx.fillStyle = primary;
            ctx.fillRect(hx - 8, hy, 16, 13);
            if (cat.coat === 'calico') {
                ctx.fillStyle = secondary;
                ctx.fillRect(hx - 8, hy, 8, 7);
                ctx.fillStyle = patchColor;
                ctx.fillRect(hx + 1, hy, 7, 6);
            }

            // Pointy Ears
            ctx.fillStyle = cat.coat === 'calico' ? patchColor : primary;
            ctx.fillRect(hx - 7, hy - 5, 5, 5);
            ctx.fillRect(hx + 2, hy - 5, 5, 5);
            ctx.fillStyle = '#fda4af'; // Pink inner ear
            ctx.fillRect(hx - 5, hy - 3, 2, 3);
            ctx.fillRect(hx + 3, hy - 3, 2, 3);

            // Eyes & Pink Nose
            ctx.fillStyle = cat.coat === 'tuxedo' ? '#4ade80' : '#facc15';
            ctx.fillRect(hx + f * 2, hy + 4, 3, 3);
            ctx.fillStyle = '#fb7185';
            ctx.fillRect(hx + f * 5, hy + 7, 2, 2);
        }

        ctx.restore();

        // Cat Name & Mini Happiness Bar above cat
        ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
        ctx.fillRect(cx - 24, cy - 48, 48, 16);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(cat.name, cx, cy - 37);
        ctx.textAlign = 'left';

        // Tiny happiness bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx - 18, cy - 34, 36, 3);
        ctx.fillStyle = cat.happiness >= 75 ? '#10b981' : '#f59e0b';
        ctx.fillRect(cx - 18, cy - 34, Math.round((cat.happiness / 100) * 36), 3);

        if (cat.speechTimer > 0 && cat.speech) {
            const bubbleColor = cat.state === 'startled' ? '#fecaca' : '#ffffff';
            drawSpeechBubble(cx, cy - 58, cat.speech, bubbleColor);
        }
    }

    function drawSpeechBubble(x, y, text, bgColor = '#ffffff') {
        ctx.save();
        ctx.font = 'bold 11px monospace';
        const metrics = ctx.measureText(text);
        const padX = 8;
        const bw = metrics.width + padX * 2;
        const bh = 22;
        const bx = Math.max(cameraX + 8, Math.min(cameraX + VIEW_W - bw - 8, x - bw / 2));
        const by = Math.max(12, y - bh);

        ctx.fillStyle = bgColor;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = '#0f172a';
        ctx.fillText(text, bx + padX, by + 15);
        ctx.restore();
    }

    function drawMinimap() {
        const mw = 210;
        const mh = 22;
        const mx = VIEW_W - mw - 14;
        const my = 12;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
        ctx.fillRect(mx, my, mw, mh);
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx, my, mw, mh);

        // Camera viewport box
        const vx = mx + (cameraX / WORLD_WIDTH) * mw;
        const vw = (VIEW_W / WORLD_WIDTH) * mw;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(vx, my + 1, vw, mh - 2);

        // Litter boxes on minimap
        LITTER_BOXES.forEach((b) => {
            const lx = mx + (b.x / WORLD_WIDTH) * mw;
            ctx.fillStyle = b.dirtiness > 0 ? '#f59e0b' : '#38bdf8';
            ctx.fillRect(lx - 2, my + mh - 5, 4, 4);
        });

        // Cats dots
        CATS.forEach((cat) => {
            const cx = mx + (cat.x / WORLD_WIDTH) * mw;
            ctx.fillStyle = cat.coat === 'orange' ? '#fb923c' : cat.coat === 'calico' ? '#fde047' : '#e2e8f0';
            ctx.fillRect(cx - 2, my + 8, 4, 4);
        });

        // Mom (Teresa) dot
        const px = mx + (mom.x / WORLD_WIDTH) * mw;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(px - 3, my + 4, 6, 12);
    }

    function render() {
        ctx.clearRect(0, 0, VIEW_W, VIEW_H);
        const daylight = getDaylightFactor();

        ctx.save();
        ctx.translate(-Math.round(cameraX), 0);

        // 1. House Interior, Furniture, Dad & B&W Western TV
        drawHouseEnvironment(daylight);

        // 2. Cats on Perches (behind Mom)
        CATS.filter((c) => c.y < FLOOR_Y - 5).forEach(drawCat);

        // 3. Mom (Teresa)
        drawMom();

        // 4. Cats on Floor (so you can clearly see their tails!)
        CATS.filter((c) => c.y >= FLOOR_Y - 5).forEach(drawCat);

        // 5. Floating Particles
        particles.forEach((p) => {
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.font = 'bold 12px monospace';
            ctx.fillText(p.text, p.x - 20, p.y);
        });
        ctx.globalAlpha = 1;

        ctx.restore();

        // 6. Screen-space Minimap in Top-Right of Canvas
        drawMinimap();
    }

    // =========================================================================
    // INPUT LISTENERS & CONTROLS
    // =========================================================================
    window.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
        if (e.code === 'ArrowUp' || e.code === 'KeyW') performHop();
        if (e.code === 'Space' || e.code === 'KeyE') performSmartAction();
        if (e.code === 'Digit1') performFeedAction();
        if (e.code === 'Digit2') performScoopAction();
        if (e.code === 'Digit3') performPlayAction();
        if (e.code === 'Digit4') performPetAction();
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    });

    // Click directly on canvas to walk Teresa there or interact with a cat/station!
    canvas.addEventListener('pointerdown', (e) => {
        if (window.scatAudio) window.scatAudio.init();
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const clickWorldX = (e.clientX - rect.left) * scaleX + cameraX;

        if (Math.abs(clickWorldX - mom.x) < 75) {
            performSmartAction();
        } else {
            mom.AutoWalkTarget = Math.max(45, Math.min(WORLD_WIDTH - 45, clickWorldX));
        }
    });

    // On-screen Button Listeners
    function bindHoldButton(btnId, keyName) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const start = (e) => {
            e.preventDefault();
            keys[keyName] = true;
            btn.classList.add('active-press');
        };
        const end = () => {
            keys[keyName] = false;
            btn.classList.remove('active-press');
        };
        btn.addEventListener('pointerdown', start);
        btn.addEventListener('pointerup', end);
        btn.addEventListener('pointerleave', end);
        btn.addEventListener('pointercancel', end);
    }

    bindHoldButton('btn-left', 'left');
    bindHoldButton('btn-right', 'right');

    document.getElementById('btn-hop').addEventListener('click', performHop);
    document.getElementById('btn-smart').addEventListener('click', performSmartAction);
    document.getElementById('btn-feed').addEventListener('click', performFeedAction);
    document.getElementById('btn-scoop').addEventListener('click', performScoopAction);
    document.getElementById('btn-play').addEventListener('click', performPlayAction);
    document.getElementById('btn-pet').addEventListener('click', performPetAction);

    // Day / Night cycle toggle button
    toggleTimeBtn.addEventListener('click', () => {
        if (gameTimeHours >= 7 && gameTimeHours < 17.5) {
            gameTimeHours = 18.2; // Jump to Sunset
            addLog('Switched to Golden Sunset hours.');
        } else if (gameTimeHours >= 17.5 && gameTimeHours < 20.5) {
            gameTimeHours = 22.0; // Jump to Nighttime (Cat Zoomies!)
            addLog('Switched to Nighttime — the cats are ready to play and zoom!');
            CATS.forEach((c) => chooseNextCatState(c, true));
        } else {
            gameTimeHours = 11.0; // Jump to Sunny Daytime (Cat Naps!)
            addLog('Switched to Sunny Daytime — cozy cat-nap hours.');
            CATS.forEach((c) => chooseNextCatState(c, false));
        }
        updateHud();
    });

    // Audio toggles
    let musicOn = true;
    let sfxOn = true;
    musicBtn.addEventListener('click', () => {
        musicOn = !musicOn;
        if (window.scatAudio) window.scatAudio.toggleMusic(musicOn);
        musicBtn.classList.toggle('btn-outline-success', musicOn);
        musicBtn.classList.toggle('btn-outline-secondary', !musicOn);
    });

    sfxBtn.addEventListener('click', () => {
        sfxOn = !sfxOn;
        if (window.scatAudio) window.scatAudio.toggleSfx(sfxOn);
        sfxBtn.classList.toggle('btn-outline-success', sfxOn);
        sfxBtn.classList.toggle('btn-outline-secondary', !sfxOn);
        sfxBtn.innerHTML = sfxOn ? '<i class="bi bi-volume-up-fill"></i>' : '<i class="bi bi-volume-mute-fill"></i>';
    });

    startGameBtn.addEventListener('click', () => {
        titleOverlay.classList.add('hidden');
        if (window.scatAudio) {
            window.scatAudio.init();
            if (musicOn) window.scatAudio.startMusic();
            window.scatAudio.playHappyMeow(1.0);
        }
    });

    // Main Loop
    initCatsHud();
    let lastTime = performance.now();
    let hudTimer = 0;

    function loop(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        update(dt);
        render();

        hudTimer += dt;
        if (hudTimer >= 0.25) {
            hudTimer = 0;
            updateHud();
        }

        requestAnimationFrame(loop);
    }

    updateHud();
    requestAnimationFrame(loop);
})();
