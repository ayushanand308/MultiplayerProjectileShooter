const express = require('express');
const app = express();
const port = 3000;
const http=require('http');
const server=http.createServer(app);
const {Server}=require('socket.io');
const io=new Server(server);
const cors = require('cors');
const path = require('path');

app.use(cors());




app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const players = {};

const projectiles = {};

const enemies = [];

const speed=2.5;

let projectileId=0;

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


io.on('connection', (socket) => {
    console.log('A USER HAS CONNECTED');
    //to add players to players object

    addPlayer(socket.id);

    socket.on('restartGame',()=>{
        addPlayer(socket.id);
    })

    function addPlayer(playerId) {
        players[playerId] = {
            x: 300 * Math.random(),
            y: 300 * Math.random(),
            playerId: playerId,
            color: `hsl(${Math.random() * 360}, 50%, 50%)`, // Random color in hsl format
            size: 10,
            speed: 10,
            direction: 'right'
        };
        io.emit('updatePlayers', players);
    }


    console.log(players);

    //on disconnect remove player from players object
    socket.on('disconnect', () => {
        console.log(`user id ${socket.id} disconnected`);
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });

    //on player movement update players object
    // on player movement update players object
    socket.on('playerMovement', (movementData) => {
        // Check if the player exists in the players object
        if (players.hasOwnProperty(socket.id)) {
            const player = players[socket.id];
            player.x = movementData.x;
            player.y = movementData.y;
            player.direction = movementData.direction;
            io.emit('updatePlayers', players);
        }
    });


    socket.on('shoot', ({x,y,angle})=>{

        const velocity={
            x:Math.cos(angle)*speed,
            y:Math.sin(angle)*speed
        };

        const projectile = {
            x: x,
            y: y,
            velocity: velocity,
            size: 5,
            playerId: socket.id,
            color: 'white'
        };
        projectiles[projectileId++] = projectile;
        io.emit('updateProjectiles', projectiles);
    });


    socket.on('playerDestroyed', (data) => {
        const { playerId } = data;
        delete players[playerId];
        io.emit('updatePlayers', players);
    });


    socket.on('canvasSize', (canvasData) => {
        console.log('Received canvas dimensions from client:', canvasData);

        // Pass canvas dimensions to the spawnEnemies function
        spawnEnemies(canvasData.width, canvasData.height);
    });

    function spawnEnemies(canvasWidth, canvasHeight) {
        spawnEnemiesId = setInterval(() => {
            // Check if players object is not empty
            if (Object.keys(players).length > 0) {
                const radius = Math.random() * (30 - 4) + 4;
                let x;
                let y;
        
                if (Math.random() < 0.5) {
                    x = Math.random() < 0.5 ? 0 - radius : canvasWidth + radius;
                    y = Math.random() * canvasHeight;
                } else {
                    x = Math.random() * canvasWidth;
                    y = Math.random() < 0.5 ? 0 - radius : canvasHeight + radius;
                }
        
                const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
        
                const isHomingEnemy = Math.random() < 0.2;
        
                // Use the player positions as the target for homing enemies
                const targetPlayer = getRandomPlayer(); // Implement a function to get a random player
    
                const angle = Math.atan2(targetPlayer.y - y, targetPlayer.x - x);
                const velocity = {
                    x: Math.cos(angle),
                    y: Math.sin(angle)
                };
        
                const enemy = isHomingEnemy
                    ? new HomingEnemy(x, y, radius, color, velocity, targetPlayer)
                    : new Enemy(x, y, radius, color, velocity);
        
                enemies.push(enemy);
                io.emit('spawnEnemy', {
                    x: enemy.x,
                    y: enemy.y,
                    radius: enemy.radius,
                    color: enemy.color,
                    velocity: enemy.velocity,
                    isHomingEnemy: isHomingEnemy
                });
            }
        }, 10000);
    }
    

    function getRandomPlayer() {
        const playerIds = Object.keys(players);
        const randomPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
        return players[randomPlayerId];
    }
    



    setInterval(() => {
        for(const id in projectiles){
            const projectile=projectiles[id];
            projectile.x+=projectile.velocity.x;
            projectile.y+=projectile.velocity.y;
        }

        io.emit('updateProjectiles', projectiles);

        io.emit('updatePlayers', players);
    }, 1000/60); 
});



// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Process restart on uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Restart the server
    server.close(() => {
        server.listen(port, () => {
            console.log(`Server restarted on port ${port}`);
        });
    });
});


server.listen(port, () => {
    console.log(`Example app listening at${port}`);
    }
);