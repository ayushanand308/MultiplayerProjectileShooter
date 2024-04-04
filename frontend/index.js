const canvas = document.querySelector('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const c = canvas.getContext("2d");

const midX = canvas.width / 2;
const midY = canvas.height / 2;

let gameStarted = false;


const socket=io();


socket.on('connect', () => {
    const canvasData = {
        width: canvas.width,
        height: canvas.height
    };
    socket.emit('canvasSize', canvasData);
});


class Player {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.isDestroyed=false;
    }

    draw() {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        c.fillStyle = this.color;
        c.fill();
    }

    clone() {
        return new Clone(this.x, this.y, this.radius, 'blue');
    }
}

class Clone extends Player {
    constructor(x, y, radius, color) {
        super(x, y, radius, color);
        this.lifespan = 5000; // Lifespan of the clone in milliseconds
    }

    update() {
        this.draw();

        // Shoot in random directions
        const angle = Math.random() * Math.PI * 2;
        const velocity = {
            x: Math.cos(angle) * 5,
            y: Math.sin(angle) * 5
        };

        const projectile = new Projectile(this.x, this.y, 5, this.color, velocity);
        projectiles.push(projectile);

        // Update clone position
        this.x += Math.random() * 2 - 1;
        this.y += Math.random() * 2 - 1;

        // Decrease lifespan
        this.lifespan -= 16; // Assuming a frame rate of 60 frames per second (1000ms / 60fps ≈ 16ms per frame)

        // Check if clone lifespan is over
        if (this.lifespan <= 0) {
            clones.splice(clones.indexOf(this), 1);
        }
    }
}

let player = new Player(midX, midY, 10, 'white');

const players = {};

socket.on('updatePlayers', (backendPlayers) => {
    // Create a set to keep track of existing player IDs
    const existingPlayerIds = new Set(Object.keys(players));

    for (const id in backendPlayers) {
        const backendPlayer = backendPlayers[id];

        if (!players[id]) {
            // Create a new player only if it doesn't exist
            players[id] = new Player(backendPlayer.x, backendPlayer.y, backendPlayer.size, backendPlayer.color);
        } else {
            // Update the existing player's position directly
            players[id].x = backendPlayer.x;
            players[id].y = backendPlayer.y;
            // Update other properties as needed
        }

        // Remove the player ID from the set since it exists in the backend data
        existingPlayerIds.delete(id);
    }

    // Remove players that no longer exist in the backend data
    for (const idToRemove of existingPlayerIds) {
        delete players[idToRemove];
    }
});


socket.on('updateProjectiles', (backendProjectiles) => {
    // Create a set to keep track of existing projectile IDs
    const existingProjectileIds = new Set(Object.keys(projectiles));

    for (const id in backendProjectiles) {
        const backendProjectile = backendProjectiles[id];

        if (!projectiles[id]) {
            // Create a new projectile only if it doesn't exist
            projectiles[id] = new Projectile(backendProjectile.x, backendProjectile.y, backendProjectile.size, backendProjectile.color, backendProjectile.velocity);
        } else {
            // Update the existing projectile's position directly
            projectiles[id].x = backendProjectile.x;
            projectiles[id].y = backendProjectile.y;
            // Update other properties as needed
        }

        // Remove the projectile ID from the set since it exists in the backend data
        existingProjectileIds.delete(id);
    }

    // Remove projectiles that no longer exist in the backend data
    for (const idToRemove of existingProjectileIds) {
        delete projectiles[idToRemove];
    }
    
})



/* player.draw();
 */
class Projectile {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
    }

    draw() {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        c.fillStyle = this.color;
        c.fill();
    }

    update() {
        this.draw();
        this.x = this.x + this.velocity.x;
        this.y = this.y + this.velocity.y;
    }
}

let projectiles = [];
let clones = [];

addEventListener('click', (event) => {
    const playerPosition={
        x:players[socket.id].x,
        y:players[socket.id].y
    }

    if (playerLocked) {
        const angle = Math.atan2(event.clientY - playerPosition.y, event.clientX - playerPosition.x);

        const velocity = {
            x: Math.cos(angle) * 5,
            y: Math.sin(angle) * 5
        };

        socket.emit('shoot',{
            x:playerPosition.x,
            y:playerPosition.y,
            angle:angle,
        })

        /* const projectile = new Projectile(playerPosition.x, playerPosition.y, 5, 'white', velocity);
        projectiles.push(projectile); */
    } else {
        const angle = Math.atan2(event.clientY - midY, event.clientX - midX);

        const velocity = {
            x: Math.cos(angle) * 14,
            y: Math.sin(angle) * 14
        };

        socket.emit('shoot',{
            x:playerPosition.x,
            y:playerPosition.y,
            angle:angle,
        })

        /* const projectile = new Projectile(midX, midY, 5, 'white', velocity);
        projectiles.push(projectile); */
    }
});

class Enemy {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.isFrozen = false; // New property to track if enemy is frozen
    }

    draw() {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        c.fillStyle = this.color;
        c.fill();
    }

    update() {
        this.draw();

        // If freezing is active and the enemy is not frozen, freeze it
        if (isFreezeActive && !this.isFrozen) {
            this.velocity.x = 0;
            this.velocity.y = 0;
            this.isFrozen = true;
        }

        if (!this.isFrozen) {
            const waveAmplitude = 2; // Adjust wave amplitude
            const waveFrequency = 0.05; // Adjust wave frequency
            this.x += this.velocity.x + waveAmplitude * Math.sin(this.y * waveFrequency);
            this.y += this.velocity.y + waveAmplitude * Math.cos(this.x * waveFrequency);
        }
    }
}

class HomingEnemy extends Enemy {
    constructor(x, y, radius, color, velocity, targetPlayer) {
        super(x, y, radius, color, velocity);
        this.targetPlayer = targetPlayer;
    }

    update() {
        this.draw();
        const angleToPlayer = Math.atan2(this.targetPlayer.y - this.y, this.targetPlayer.x - this.x);
        const speed = 2; // Adjust the speed of homing
        this.velocity.x = Math.cos(angleToPlayer) * speed;
        this.velocity.y = Math.sin(angleToPlayer) * speed;

        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }
}

class Particle {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
    }

    draw() {
        c.save();
        c.globalAlpha = this.alpha;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        c.fillStyle = this.color;
        c.fill();
        c.restore();
    }

    update() {
        this.draw();
        this.velocity.x *= 0.98;
        this.velocity.y *= 0.98;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.01;
    }
}


class BackgroundBalls{
    constructor(x,y,radius,color){
        this.x=x;
        this.y=y;
        this.radius=radius;
        this.color=color;
        this.alpha=1;
    }
    draw(){

        c.save();
        c.globalAlpha=this.alpha;
        c.beginPath();
        c.arc(this.x,this.y,this.radius,0,2*Math.PI);
        c.fillStyle=this.color;
        c.fill();
        c.restore();
    }
    update(){
        this.draw();
        this.x+=this.velocity.x;
        this.y+=this.velocity.y;
    }
}

let enemies = [];
let particles = [];
let backgroundBalls=[];

/* function createExplosion(x, y, color) {
    for( let i = 0; i < 500; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = {
            x: Math.cos(angle) * (Math.random() * 5),
            y: Math.sin(angle) * (Math.random() * 5)
        };
        const particle = new Particle(x, y, 3, color, velocity);
        particles.push(particle);
    }
} */

let spawnEnemiesId;
let shieldActive = false;
let freezeDuration = 10000; // 10 seconds
let freezeEndTime = 0;
let isFreezeActive = false;

function spawnEnemies() {
    socket.on('spawnEnemy', (enemyData) => {
        const { x, y, radius, color, velocity, isHomingEnemy } = enemyData;
        const enemy = isHomingEnemy
            ? new HomingEnemy(x, y, radius, color, velocity, getRandomPlayer())
            : new Enemy(x, y, radius, color, velocity);
    
        enemies.push(enemy);
    });
}



socket.on('spawnEnemy', (enemyData) => {
    const { x, y, radius, color, velocity, isHomingEnemy } = enemyData;
    const enemy = isHomingEnemy
        ? new HomingEnemy(x, y, radius, color, velocity, getRandomPlayer())
        : new Enemy(x, y, radius, color, velocity);

    enemies.push(enemy);
});




// Function to get a random player
function getRandomPlayer() {
    const playerIds = Object.keys(players);
    const randomPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
    return players[randomPlayerId];
}




const distanceBetween=30;;

function populateBackground(){
    for(let i=0;i<canvas.width+distanceBetween;i+=distanceBetween){
        for(let j=0;j<canvas.height+distanceBetween;j+=distanceBetween){
            const backgroundBall=new BackgroundBalls(i,j,3,'blue');
            backgroundBalls.push(backgroundBall);
        }
    }
}

let score = 0;
let totalScore = 0;
let highScore = 0;

function animate() {
    if (!gameStarted) {
        return;
    }
    const animationID = requestAnimationFrame(animate);
    c.fillStyle = 'rgba(0, 0, 0, 0.1)';
    c.fillRect(0, 0, canvas.width, canvas.height);

    for (const id in players) {
        const player = players[id];
        if (player.isDestroyed) {
            gsap.killTweensOf(player);
            delete players[id];
        } else {
            player.draw();
        }
    }

    backgroundBalls.forEach(backgroundBall => {
        backgroundBall.draw();

        const dist = Math.hypot(player.x - backgroundBall.x, player.y - backgroundBall.y);

        if (dist < 100) {
            backgroundBall.alpha = 0;
            if (dist > 80) {
                backgroundBall.alpha = 0.5;
            }
        } else if (dist > 100 && backgroundBall.alpha < 0.1) {
            backgroundBall.alpha += 0.1;
        } else if (dist > 100 && backgroundBall.alpha > 0.1) {
            backgroundBall.alpha -= 0.1;
        }

    });

    for (const id in projectiles) {
        const projectile = projectiles[id];
        projectile.update();

        if (projectile.x - projectile.radius < 0 || projectile.x + projectile.radius > canvas.width || projectile.y - projectile.radius < 0 || projectile.y + projectile.radius > canvas.height) {
            setTimeout(() => {
                delete projectiles[id];
            }, 0);
        }
    }

    enemies.forEach((enemy, index) => {
        enemy.update();

        for (const playerId in players) {
            const player = players[playerId];

            const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
            if (dist - enemy.radius - player.radius < 1) {
                if (shieldActive) {
                    enemies.splice(index, 1);
                    updateScore(score += 10);
                } else {
                    // Mark the destroyed player as destroyed and remove it from the game loop
                    players[playerId].isDestroyed = true;
                    console.log("Destroyed player is " + players[playerId]); 
                    socket.emit('playerDestroyed', { playerId });

                }
            }
        }

        // Check if all players are destroyed, if so, end the game
        if (Object.keys(players).length === 0) {
            gameEnded = true;
            highScore = Math.max(highScore, score);
            showScoreBox();
            cancelAnimationFrame(animationID);

            console.log("All players are destroyed");
        }

        projectiles.forEach(projectile => {
            const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

            if (dist - enemy.radius - projectile.radius < 1) {
                createExplosion(enemy.x, enemy.y, enemy.color);
                if (enemy.radius - 10 > 10) {
                    gsap.to(enemy, { radius: enemy.radius - 10, duration: 0.5 });
                    updateScore(score += 5);
                } else {
                    enemies.splice(enemies.indexOf(enemy), 1);
                    updateScore(score += 10);
                }
                backgroundBalls.forEach(backgroundBall => {
                    gsap.set(backgroundBall, { alpha: 0.5, color: 'white' })
                    gsap.to(backgroundBall, { alpha: 0.1, color: enemy.color })


                    backgroundBall.color = enemy.color;
                });
                projectiles.splice(projectiles.indexOf(projectile), 1);
            }
            if (
                projectile.x - projectile.radius > canvas.width ||
                projectile.x + projectile.radius < 0 ||
                projectile.y - projectile.radius > canvas.height ||
                projectile.y + projectile.radius < 0
            ) {
                projectiles.splice(projectiles.indexOf(projectile), 1);
            }


        });
    });

    particles.forEach((particle, index) => {
        if (particle.alpha > 0) {
            particle.update();
        } else {
            particles.splice(index, 1);
        }
    });

    clones.forEach(clone => {
        clone.update();
    });
}


function createClone() {
    const clone = player.clone();
    // Find a safe location for the clone
    let cloneSafe = false;
    let cloneX, cloneY;

    while (!cloneSafe) {
        cloneX = Math.random() * canvas.width;
        cloneY = Math.random() * canvas.height;

        // Check if the clone location is safe (no enemies nearby)
        cloneSafe = enemies.every(enemy => {
            const distance = Math.hypot(cloneX - enemy.x, cloneY - enemy.y);
            return distance > enemy.radius + clone.radius + 20; // Add some padding for safety
        });
    }

    clone.x = cloneX;
    clone.y = cloneY;
    clones.push(clone);
}

const scoreBox = document.createElement('div');
scoreBox.style.position = 'absolute';
scoreBox.style.top = '50%';
scoreBox.style.left = '50%';
scoreBox.style.transform = 'translate(-50%, -50%)';
scoreBox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
scoreBox.style.color = 'white';
scoreBox.style.padding = '20px';
scoreBox.style.fontSize = '24px';
scoreBox.style.borderRadius = '15px';
scoreBox.style.width = '200px';
scoreBox.style.textAlign = 'center';
scoreBox.style.display = 'none';
document.body.appendChild(scoreBox);

const restartButton = document.createElement('button');
restartButton.innerText = 'Restart';
restartButton.style.fontSize = '20px';
restartButton.style.marginTop = '10px';
restartButton.addEventListener('click', restartGame);
scoreBox.appendChild(restartButton);

function updateScore(score) {
    scoreBox.innerText = `Score: ${score}`;
}

function showScoreBox() {
    scoreBox.style.display = 'block';
}

function hideScoreBox() {
    scoreBox.style.display = 'none';
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = {
            x: Math.cos(angle) * (Math.random() * 5),
            y: Math.sin(angle) * (Math.random() * 5)
        };
        const particle = new Particle(x, y, 1.5, color, velocity);
        particles.push(particle);
    }
}

function restartGame() {
    clearInterval(spawnEnemiesId);
    enemies = [];
    projectiles = [];
    particles = [];
    clones = [];
    gameEnded = false;
    totalScore += score;
    coinsEarned.innerText = `High Score ${highScore}`
    updateScore(score = 0);
    hideScoreBox();

    // Clear the backgroundBalls array and repopulate it
    backgroundBalls = [];
    populateBackground();

    // Clear the canvas
    c.clearRect(0, 0, canvas.width, canvas.height);

    // Clear the interval and restart spawning enemies
    spawnEnemies();
    animate();

    socket.emit('restartGame');
}


addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        if(specialAttackAmount>0){
            specialAttack();
            specialAttackAmount--;
        }
    } else if (event.code === 'KeyR' && gameEnded) {
        restartGame();
    } else if (event.code === 'KeyS') {
        if(shieldAmount>0){
            setTimeout(() => {
                shieldActive = false;
            }, 8000);
            shieldActiveAnimation();
            shieldActive = true;
            shieldAmount--;
        }

        // Activate shield only for 5 seconds
        
    }else if(event.code==='KeyF'){
        freezes();
    }else if(event.code==='KeyC'){
        if(clonesAmount>0){
            createClone();
            clonesAmount--;
        }
    }
});

function shieldActiveAnimation() {
    c.beginPath();
    c.arc(midX, midY, 20, 0, 2 * Math.PI);
    c.strokeStyle = 'white';
    c.stroke();
}

function specialAttack() {
    

    for (let i = 0; i < 90; i++) {
        setTimeout(() => {
            const angle = i;
            const randomColor = `hsl(${Math.random() * 360}, 50%, 50%)`;
            const velocity = {
                x: Math.cos(angle) * 7,
                y: Math.sin(angle) * 7
            };
            const projectile = new Projectile(player.x, player.y, 5, randomColor, velocity);
            projectiles.push(projectile);
        }, i * 10);
    }
}


function freezes(){
    if (!isFreezeActive) {
        isFreezeActive = true;
        setTimeout(() => {
            isFreezeActive = false;
            enemies.forEach(enemy => {
                enemy.isFrozen = false; // Normalize all enemies after freezing effect ends
            });
        }, freezeDuration);
    }
}

let playerLocked = {}; // Use an object to store locked players
let movementSpeed = 7; // Adjust the movement speed

addEventListener('mousemove', (event) => {
    if (!players[socket.id]) return;

    if (!playerLocked[socket.id]) { // Check if the player is not locked
        const angle = Math.atan2(event.clientY - players[socket.id].y, event.clientX - players[socket.id].x);
        const distance = Math.hypot(event.clientY - players[socket.id].y, event.clientX - players[socket.id].x);

        // Restrict movement to four directions (left, right, up, down)
        if (distance > movementSpeed) {
            players[socket.id].x += Math.cos(angle) * movementSpeed;
            players[socket.id].y += Math.sin(angle) * movementSpeed;
        } else {
            // Snap to the mouse position if the distance is small
            players[socket.id].x = event.clientX;
            players[socket.id].y = event.clientY;
        }

        // Emit the updated player position to the server
        socket.emit('playerMovement', { x: players[socket.id].x, y: players[socket.id].y });
    }
});

addEventListener('keydown', (event) => {
    if (event.code === 'KeyX') {
        playerLocked[socket.id] = !playerLocked[socket.id]; // Toggle lock for the player
    }
});

/* addEventListener('keydown', (event) => {
    if (event.code === 'KeyX') {
        playerLocked = !playerLocked;
    }
});
 */


populateBackground();
spawnEnemies();
animate();


// ...
// Create menu elements
const menuBox = document.createElement('div');
menuBox.style.position = 'absolute';
menuBox.style.top = '50%';
menuBox.style.left = '50%';
menuBox.style.transform = 'translate(-50%, -50%)';
menuBox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
menuBox.style.color = 'white';
menuBox.style.padding = '20px';
menuBox.style.fontSize = '24px';
menuBox.style.borderRadius = '15px';
menuBox.style.width = '200px';
menuBox.style.textAlign = 'center';
document.body.appendChild(menuBox);

// Add menu content
const startButton = document.createElement('button');
startButton.innerText = 'Start Game';
startButton.style.fontSize = '16px';
startButton.style.marginBottom = '10px';
startButton.style.fontFamily = "'Press Start 2P', cursive"; // Add this line for consistent font
menuBox.appendChild(startButton);

const coinsEarned = document.createElement('div');
coinsEarned.innerText = `High Score ${highScore}`; // Replace 0 with the actual coins earned by the player
coinsEarned.style.marginBottom = '10px';
menuBox.appendChild(coinsEarned);

const shopSection = document.createElement('div');
shopSection.innerText = 'Shop Section';
shopSection.style.marginBottom = '10px';
menuBox.appendChild(shopSection);



/* const specialAttackButton = document.createElement('button');
specialAttackButton.innerText = 'Special Attack';
specialAttackButton.style.fontSize = '16px';
specialAttackButton.style.marginBottom = '5px';
shopSection.appendChild(specialAttackButton);

const clonesButton = document.createElement('button');
clonesButton.innerText = 'Clones';
clonesButton.style.fontSize = '16px';
clonesButton.style.marginBottom = '5px';
shopSection.appendChild(clonesButton);

const shieldButton = document.createElement('button');
shieldButton.innerText = 'Shield';
shieldButton.style.fontSize = '16px';
shopSection.appendChild(shieldButton); */

// ...

// Function to show the menu
function showMenu() {
    menuBox.style.display = 'block';
}

// Call the showMenu function when the page loads
window.addEventListener('load', showMenu);
let activePlayers = [];


// Function to start the game
function startGame() {
    // Hide the menu
    gameStarted = true;
    menuBox.style.display = 'none';

    // Call the necessary game initialization functions here
    populateBackground();
    spawnEnemies();
    animate();

    // Check if there are active players
    if (activePlayers.length === 0) {
        // Start the game for the initiating player alone
        // Implement logic to start game for a single player
        console.log("Starting game for single player...");
    } else {
        // Initiate the 15-second timer
        setTimeout(() => {
            // Select a random player
            let randomIndex = Math.floor(Math.random() * activePlayers.length);
            let selectedPlayer = activePlayers[randomIndex];

            // Check if a player was selected
            if (selectedPlayer) {
                // Send a request to the selected player
                selectedPlayer.socket.emit('gameRequest', { from: 'server' });

                // Listen for response from the selected player
                selectedPlayer.socket.on('gameResponse', (response) => {
                    if (response.accepted) {
                        // Start the game for both players
                        // Implement logic to start the game for both players
                        console.log("Starting game for both players...");
                    } else {
                        // Start the game for the initiating player alone
                        // Implement logic to start the game for a single player
                        console.log("Starting game for single player...");
                    }
                });
            } else {
                // Start the game for the initiating player alone
                // Implement logic to start the game for a single player
                console.log("Starting game for single player...");
            }
        }, 15000); // 15 seconds
    }
}


// Event listener for shop section button
shopSection.addEventListener('click', openShopModal);
let specialAttackAmount = 0;
let clonesAmount = 0;
let shieldAmount = 0;

// Function to open the shop modal
function openShopModal() {
    // Create a modal backdrop to cover the main menu
    const modalBackdrop = document.createElement('div');
    modalBackdrop.classList.add('modal-backdrop');
    document.body.appendChild(modalBackdrop);

    const shopModal = document.createElement('div');
    shopModal.style.position = 'absolute';
    shopModal.style.top = '50%';
    shopModal.style.left = '50%';
    shopModal.style.transform = 'translate(-50%, -50%)';
    shopModal.classList.add('menu-box', 'shop-section');
    document.body.appendChild(shopModal);

    const backImage = document.createElement('img');
    backImage.src = 'right.png'; // Replace with the actual path to your image
    backImage.alt = 'Back';
    backImage.style.position = 'absolute';
    backImage.style.top = '10px';
    backImage.style.left = '10px';
    backImage.style.width = '30px'; // Set the width of the image
    backImage.style.height = '30px'; // Set the height of the image
    backImage.style.cursor = 'pointer';
    backImage.style.transform = 'scaleX(-1)'; // Mirror flip the image
    backImage.addEventListener('click', () => {
        document.body.removeChild(modalBackdrop);
        document.body.removeChild(shopModal);
    });
    shopModal.appendChild(backImage);

    const coinsLabel = document.createElement('div');
    coinsLabel.innerText = `Coins ${Math.round(totalScore/10)}`; // Replace 100 with the actual number of coins the player has
    coinsLabel.style.marginBottom = '20px';
    coinsLabel.style.fontSize = '18px';
    coinsLabel.style.color = 'white';
    shopModal.appendChild(coinsLabel);

    const powerUps = [
        { name: 'Special Attack', price: 50, amount: specialAttackAmount },
        { name: 'Clones', price: 100, amount: clonesAmount },
        { name: 'Shield', price: 80, amount: shieldAmount }
    ];

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.textAlign = 'center';
    table.style.borderCollapse = 'collapse';

    // Table header
    const headerRow = table.insertRow();
    const headerName = document.createElement('th');
    headerName.textContent = 'Power Up';
    headerRow.appendChild(headerName);

    const headerAmount = document.createElement('th');
    headerAmount.textContent = 'Amount';
    headerRow.appendChild(headerAmount);

    const headerPrice = document.createElement('th');
    headerPrice.textContent = 'Price';
    headerRow.appendChild(headerPrice);

    const headerButton = document.createElement('th');
    headerButton.textContent = 'Purchase';
    headerRow.appendChild(headerButton);

    powerUps.forEach(powerUp => {
        
        const row = table.insertRow();

        const nameCell = row.insertCell();
        nameCell.textContent = powerUp.name;

        const amountCell = row.insertCell();
        amountCell.textContent = powerUp.amount;

        const priceCell = row.insertCell();
        priceCell.textContent = powerUp.price;

        const purchaseCell = row.insertCell();
        const purchaseButton = document.createElement('button');
        purchaseButton.classList.add('purchase-button');
        purchaseButton.textContent = 'Purchase';
        purchaseButton.addEventListener('click', () => {
            const playerCoins = Math.round(totalScore / 10); // Get the player's coins
            if (playerCoins >= powerUp.price) {
              powerUp.amount++;

              //update the respective power up amount
                if(powerUp.name==='Special Attack'){
                    specialAttackAmount++;
                }else if(powerUp.name==='Clones'){
                    clonesAmount++;
                }else if(powerUp.name==='Shield'){
                    shieldAmount++;
                }
                

              // Update coins and display
              coinsLabel.innerText = `Coins: ${playerCoins - powerUp.price}`;
              amountCell.textContent = powerUp.amount;
              totalScore -= powerUp.price * 10; // Deduct from total score (assuming 1 coin = 10 points)
            } else {
              // Notify the player that they don't have enough coins
              alert('Not enough coins to purchase this power-up!');
            }
          });
        
        purchaseCell.appendChild(purchaseButton);
    });

    shopModal.appendChild(table);
}




// ... your existing JavaScript code

// Add CSS styles directly within the JavaScript code
const style = document.createElement('style');
style.textContent = `
@import url('https://fonts.googleapis.com/css?family=Press+Start+2P');

body {
  font-family: 'Press Start 2P', cursive;
  background: black;
}

.menu-box {
  background: black; /* Match body background */
  border: solid 4px white; /* Thick white border */
  color: white;
  padding: 30px;
  text-align: center;
  border-radius: 5px; /* Rounded corners */
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2); /* Soft drop shadow */
}

button {
  background: black; /* Match body background */
  color: white;
  border: none;
  border-radius: 5px; /* Rounded corners */
  padding: 10px 20px;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.15); /* Subtle button shadow */
  font-size: 18px;
  cursor: pointer;
  transition: border-bottom-color 0.2s ease-in-out; /* Smooth hover effect */
}

button:hover {
  border-bottom: solid 2px white; /* Highlight on hover */
}

.shop-section {
  background: black; /* Match body background */
  padding: 15px;
}

.modal-backdrop {
  background: rgba(0, 0, 0, 0.6); /* Semi-transparent backdrop */
}

/* Additional styling for list elements */
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

li {
  margin: 10px 0;
}

a {
  color: white;
  text-decoration: none;
  display: inline-block;
  padding-bottom: 1px;
  border-bottom: solid 2px transparent;
}
a {
    color: white;
    text-decoration: none;
    display: inline-block;
    padding-bottom: 1px;
    border-bottom: solid 2px transparent;
  }
  
  /* Hover effect for specific elements */
  .menu-box span#coinsEarned,
  .menu-box span#shopSection {
    color: white;
    transition: color 0.2s ease-in-out; /* Ensure transition is present */
  }
  
  .menu-box span#coinsEarned:hover,
  .menu-box span#shopSection:hover {
    color: yellow;
  }


  /* Additional styling for shop modal */
.shop-section table {
  margin-top: 20px;
}

.shop-section th, .shop-section td {
  padding: 10px;
  border-bottom: 1px solid white;
}

.shop-section th:last-child, .shop-section td:last-child {
  border-bottom: none;
}
  

/* Additional styling for shop modal */
.shop-section table {
  margin-top: 20px;
  border-collapse: collapse;
  width: 100%;
  color: white;
}

.shop-section th, .shop-section td {
  padding: 10px;
  border: 1px solid white;
}

.shop-section th:last-child, .shop-section td:last-child {
  border-right: none;
}

.shop-section th:first-child, .shop-section td:first-child {
  border-left: none;
}


`;
document.head.appendChild(style);






// ... your remaining JavaScript code


// Add event listener to start button
startButton.addEventListener('click', startGame);


// ...


//press m to open menu
addEventListener('keydown',(event)=>{
    if(event.code==='KeyM'){
        showMenu();
    }
});


