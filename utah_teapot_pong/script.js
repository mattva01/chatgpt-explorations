// Import statements
import * as THREE from 'three';
import { TeapotGeometry } from 'three/addons/geometries/TeapotGeometry.js';

// Set up the scene, camera, and renderer
let scene, camera, renderer;
let cameraGroup;
let cameraMode = 'third-person'; // Default camera mode
let showCollisionBounds = false;

// Game objects
let playerPaddle, aiPaddle, teapot;
let leftWall, rightWall;
let powerUps = [];
let powerUpTypes = ['enlarge', 'slow', 'multiball'];
let additionalTeapots = [];

// Game variables
let ballSpeed;
const initialBallSpeed = new THREE.Vector3(0.3, 0.2, 0.15);
const paddleSpeed = 0.6;
let playerScore = 0;
let aiScore = 0;
let isPaused = false;
let powerUpMessageTimeout; // Variable for power-up message timeout

// Audio variables
let audioContext;
let bgmGain, sfxGain;
let bgmPlaying = false;

// Control variables
let moveForward = false;
let moveBackward = false;
let moveUp = false;
let moveDown = false;

// UI Elements
const playerScoreElement = document.getElementById('player-score');
const aiScoreElement = document.getElementById('ai-score');
const mainMenu = document.getElementById('main-menu');
const startButton = document.getElementById('start-button');
const optionsButton = document.getElementById('options-button');
const instructionsButton = document.getElementById('instructions-button');
const optionsMenu = document.getElementById('options-menu');
const cameraSelect = document.getElementById('camera-select');
const instructions = document.getElementById('instructions');
const backButtons = document.querySelectorAll('#back-button');
const scoreboard = document.getElementById('scoreboard');
const pauseMenu = document.getElementById('pause-menu');
const resumeButton = document.getElementById('resume-button');
const optionsButtonPause = document.getElementById('options-button-pause');
const quitButton = document.getElementById('quit-button');
const bgmVolumeSlider = document.getElementById('bgm-volume');
const sfxVolumeSlider = document.getElementById('sfx-volume');
const showCollisionCheckbox = document.getElementById('show-collision');

// Power-up message element
const powerUpMessage = document.createElement('div');
powerUpMessage.id = 'power-up-message';
document.body.appendChild(powerUpMessage);

// Event Listeners for Menu
startButton.addEventListener('click', startGame);
optionsButton.addEventListener('click', () => {
    mainMenu.style.display = 'none';
    optionsMenu.style.display = 'flex';
});
instructionsButton.addEventListener('click', () => {
    mainMenu.style.display = 'none';
    instructions.style.display = 'flex';
});
backButtons.forEach(button => {
    button.addEventListener('click', () => {
        optionsMenu.style.display = 'none';
        instructions.style.display = 'none';
        pauseMenu.style.display = 'none';
        mainMenu.style.display = isPaused ? 'none' : 'flex';
    });
});
cameraSelect.addEventListener('change', (e) => {
    cameraMode = e.target.value;
});
bgmVolumeSlider.addEventListener('input', (e) => {
    if (bgmGain) {
        bgmGain.gain.value = parseFloat(e.target.value);
        localStorage.setItem('bgmVolume', e.target.value);
    }
});
sfxVolumeSlider.addEventListener('input', (e) => {
    if (sfxGain) {
        sfxGain.gain.value = parseFloat(e.target.value);
        localStorage.setItem('sfxVolume', e.target.value);
    }
});
showCollisionCheckbox.addEventListener('change', (e) => {
    showCollisionBounds = e.target.checked;
    localStorage.setItem('showCollisionBounds', showCollisionBounds);
    updateCollisionBoundsVisibility();
});

// Pause Menu Event Listeners
resumeButton.addEventListener('click', resumeGame);
optionsButtonPause.addEventListener('click', () => {
    pauseMenu.style.display = 'none';
    optionsMenu.style.display = 'flex';
});
quitButton.addEventListener('click', () => {
    pauseMenu.style.display = 'none';
    mainMenu.style.display = 'flex';
    cleanupGame();
});

// Event Listeners for Game Controls
function onKeyDown(event) {
    if (event.key === 'ArrowUp') moveUp = true;
    if (event.key === 'ArrowDown') moveDown = true;
    if (event.key === 'ArrowLeft') moveBackward = true;
    if (event.key === 'ArrowRight') moveForward = true;
    if (event.key.toLowerCase() === 'p') {
        if (isPaused) {
            resumeGame();
        } else {
            pauseGame();
        }
    }
}

function onKeyUp(event) {
    if (event.key === 'ArrowUp') moveUp = false;
    if (event.key === 'ArrowDown') moveDown = false;
    if (event.key === 'ArrowLeft') moveBackward = false;
    if (event.key === 'ArrowRight') moveForward = false;
}

function startGame() {
    mainMenu.style.display = 'none';
    optionsMenu.style.display = 'none';
    instructions.style.display = 'none';
    scoreboard.style.display = 'flex';
    init();
    animate();
    // Start background music after user interaction
    playBackgroundMusic();
}

function init() {
    // Initialize scene and camera
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x20252f);

    cameraGroup = new THREE.Group();
    scene.add(cameraGroup);

    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    // Initial camera position
    camera.position.set(-35, 5, 0);
    cameraGroup.add(camera);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    camera.add(pointLight);

    // Initialize Audio
    initAudio();

    // Load volume settings from localStorage
    loadVolumeSettings();

    // Create paddles, walls, and teapot
    createGameObjects();

    // Add event listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize, false);

    // Reset game variables
    ballSpeed = initialBallSpeed.clone();
    playerScore = 0;
    aiScore = 0;
    isPaused = false;
    playerScoreElement.textContent = `Player: ${playerScore}`;
    aiScoreElement.textContent = `AI: ${aiScore}`;
}

function loadVolumeSettings() {
    const savedBgmVolume = localStorage.getItem('bgmVolume');
    const savedSfxVolume = localStorage.getItem('sfxVolume');
    const savedShowCollision = localStorage.getItem('showCollisionBounds');

    if (savedBgmVolume !== null) {
        bgmVolumeSlider.value = savedBgmVolume;
    }
    if (savedSfxVolume !== null) {
        sfxVolumeSlider.value = savedSfxVolume;
    }
    if (savedShowCollision !== null) {
        showCollisionBounds = savedShowCollision === 'true';
        showCollisionCheckbox.checked = showCollisionBounds;
    }
}

function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create gain nodes for background music and sound effects
    bgmGain = audioContext.createGain();
    bgmGain.gain.value = parseFloat(bgmVolumeSlider.value);
    bgmGain.connect(audioContext.destination);

    sfxGain = audioContext.createGain();
    sfxGain.gain.value = parseFloat(sfxVolumeSlider.value);
    sfxGain.connect(audioContext.destination);
}

// Create game objects
function createGameObjects() {
    // Create the player's paddle with ShaderMaterial
    const paddleGeometry = new THREE.BoxGeometry(0.5, 6, 6);
    const playerPaddleMaterial = createPaddleShaderMaterial(new THREE.Color(0x00ff00)); // Green
    playerPaddle = new THREE.Mesh(paddleGeometry, playerPaddleMaterial);
    playerPaddle.position.set(-25, 0, 0);
    scene.add(playerPaddle);

    // Create the AI's paddle with ShaderMaterial
    const aiPaddleMaterial = createPaddleShaderMaterial(new THREE.Color(0x0000ff)); // Blue
    aiPaddle = new THREE.Mesh(paddleGeometry, aiPaddleMaterial);
    aiPaddle.position.set(25, 0, 0);
    scene.add(aiPaddle);

    // Create the walls with ShaderMaterial
    const wallGeometry = new THREE.PlaneGeometry(30, 20);
    const leftWallMaterial = createWallShaderMaterial();
    leftWall = new THREE.Mesh(wallGeometry, leftWallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-25, 0, 0);
    scene.add(leftWall);

    const rightWallMaterial = createWallShaderMaterial();
    rightWall = new THREE.Mesh(wallGeometry, rightWallMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(25, 0, 0);
    scene.add(rightWall);

    // Create the teapot
    const teapotSize = 1.5;
    const teapotGeometry = new TeapotGeometry(teapotSize);
    const teapotMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    teapot = new THREE.Mesh(teapotGeometry, teapotMaterial);
    scene.add(teapot);

    // Create collision bounds if enabled
    if (showCollisionBounds) {
        addCollisionBounds(teapot);
    }

    // Create the bounding box
    createBoundingBox();
}

function createBoundingBox() {
    const boundaryWidth = 50;
    const boundaryHeight = 30;
    const boundaryDepth = 20;

    const boundaryGeometry = new THREE.BoxGeometry(boundaryWidth, boundaryHeight, boundaryDepth);
    const wireframe = new THREE.EdgesGeometry(boundaryGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const boundingBox = new THREE.LineSegments(wireframe, lineMaterial);
    boundingBox.position.set(0, 0, 0);
    scene.add(boundingBox);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ShaderMaterial for Paddle with Impact Effect
function createPaddleShaderMaterial(baseColor) {
    const vertexShader = `
        varying vec2 vUv;
        
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform vec3 baseColor;
        uniform vec2 impactPoint; // Normalized (0 to 1)
        uniform float impactTime; // Time elapsed since impact
        uniform bool impactActive;
        
        varying vec2 vUv;
        
        void main() {
            vec3 color = baseColor;
            
            if (impactActive) {
                // Calculate distance from impact point
                float dist = distance(vUv, impactPoint);
                
                // Define number of circles and their speed
                int numCircles = 4;
                float speed = 1.0; // Increased speed for wider bands
                
                for(int i = 1; i <= 4; i++) {
                    float radius = impactTime * speed * float(i);
                    float thickness = 0.03; // Increased thickness for wider bands
                    float alpha = smoothstep(radius - thickness, radius, dist) - smoothstep(radius, radius + thickness, dist);
                    color += vec3(1.0) * alpha * 0.7; // White circles with higher opacity
                }
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const uniforms = {
        baseColor: { value: baseColor },
        impactPoint: { value: new THREE.Vector2(0.5, 0.5) },
        impactTime: { value: 0.0 },
        impactActive: { value: false },
    };

    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: false,
    });

    return shaderMaterial;
}

// ShaderMaterial for Walls with Impact Effect
function createWallShaderMaterial() {
    const vertexShader = `
        varying vec2 vUv;
        
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform vec3 baseColor;
        uniform vec2 impactPoint; // Normalized (0 to 1)
        uniform float impactTime; // Time elapsed since impact
        uniform bool impactActive;
        
        varying vec2 vUv;
        
        void main() {
            vec3 color = baseColor;
            float alpha = 0.0;
            
            if (impactActive) {
                // Calculate distance from impact point
                float dist = distance(vUv, impactPoint);
                
                // Define number of circles and their speed
                int numCircles = 4;
                float speed = 1.0; // Increased speed for wider bands
                
                for(int i = 1; i <= 4; i++) {
                    float radius = impactTime * speed * float(i);
                    float thickness = 0.03; // Increased thickness for wider bands
                    float circleAlpha = smoothstep(radius - thickness, radius, dist) - smoothstep(radius, radius + thickness, dist);
                    alpha += circleAlpha * 0.7; // White circles with higher opacity
                }
            }
            
            gl_FragColor = vec4(color, alpha);
        }
    `;

    const uniforms = {
        baseColor: { value: new THREE.Color(0x000000) }, // Transparent base color
        impactPoint: { value: new THREE.Vector2(0.5, 0.5) },
        impactTime: { value: 0.0 },
        impactActive: { value: false },
    };

    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
    });

    return shaderMaterial;
}

// Game loop
function animate() {
    requestAnimationFrame(animate);

    if (!isPaused) {
        // Update game objects
        updateTeapot(teapot);
        additionalTeapots.forEach(t => updateTeapot(t));
        updatePlayerPaddle();
        updateAIPaddle();
        updateCamera();
        handlePowerUps();
    }

    // Update collision bounds if enabled
    if (showCollisionBounds) {
        updateTeapotCollisionBounds();
    }

    // Update shader uniforms for impact effects
    updateImpactEffects();

    renderer.render(scene, camera);
}

function updateImpactEffects() {
    [playerPaddle, aiPaddle].forEach(paddle => {
        if (paddle.material.uniforms.impactActive.value) {
            const elapsedTime = (Date.now() - paddle.userData.impactStart) / 1000; // in seconds
            paddle.material.uniforms.impactTime.value = elapsedTime;

            if (elapsedTime > 1.0) { // Duration of the effect
                paddle.material.uniforms.impactActive.value = false;
            }
        }
    });

    [leftWall, rightWall].forEach(wall => {
        if (wall.material.uniforms.impactActive.value) {
            const elapsedTime = (Date.now() - wall.userData.impactStart) / 1000; // in seconds
            wall.material.uniforms.impactTime.value = elapsedTime;

            if (elapsedTime > 1.0) { // Duration of the effect
                wall.material.uniforms.impactActive.value = false;
            }
        }
    });
}

function updateTeapot(teapotObj) {
    // Use individual ballSpeed for additional teapots
    let currentBallSpeed = ballSpeed;
    if (teapotObj.userData.ballSpeed) {
        currentBallSpeed = teapotObj.userData.ballSpeed;
    }

    teapotObj.position.add(currentBallSpeed);

    // Bounce off walls
    if (teapotObj.position.y > 15 - 1.5 || teapotObj.position.y < -15 + 1.5) {
        currentBallSpeed.y = -currentBallSpeed.y;
    }
    if (teapotObj.position.z > 10 - 1.5 || teapotObj.position.z < -10 + 1.5) {
        currentBallSpeed.z = -currentBallSpeed.z;
    }

    // Check for collisions with paddles
    checkPaddleCollision(teapotObj, playerPaddle);
    checkPaddleCollision(teapotObj, aiPaddle);

    // Check for scoring
    if (teapotObj.position.x < -25) {
        aiScore++;
        aiScoreElement.textContent = `AI: ${aiScore}`;
        playScoreSound();
        triggerWallImpact(leftWall, teapotObj.position);
        resetBall(teapotObj);
        triggerScoreEffect('ai');
    }
    if (teapotObj.position.x > 25) {
        playerScore++;
        playerScoreElement.textContent = `Player: ${playerScore}`;
        playScoreSound();
        triggerWallImpact(rightWall, teapotObj.position);
        resetBall(teapotObj);
        triggerScoreEffect('player');
    }

    // Check for collision with power-ups
    powerUps.forEach((powerUp, index) => {
        if (teapotObj.position.distanceTo(powerUp.position) < 2) {
            activatePowerUp(powerUp.userData.type);
            scene.remove(powerUp);
            powerUps.splice(index, 1);
            playPowerUpSound();
        }
    });
}

function checkPaddleCollision(teapotObj, paddle) {
    const paddleSize = paddle.geometry.parameters;
    if (
        Math.abs(teapotObj.position.x - paddle.position.x) < paddleSize.width / 2 + 1.5 &&
        Math.abs(teapotObj.position.y - paddle.position.y) < paddleSize.height / 2 + 1.5 &&
        Math.abs(teapotObj.position.z - paddle.position.z) < paddleSize.depth / 2 + 1.5
    ) {
        // Reverse X direction
        ballSpeed.x = -ballSpeed.x;

        // Adjust ball speed based on paddle movement
        ballSpeed.y += (paddle === playerPaddle ? (moveUp ? 0.1 : (moveDown ? -0.1 : 0)) : 0);
        ballSpeed.z += (paddle === playerPaddle ? (moveForward ? 0.1 : (moveBackward ? -0.1 : 0)) : 0);

        // Prevent sticking
        if (paddle === playerPaddle) {
            teapotObj.position.x = paddle.position.x + paddleSize.width / 2 + 1.5;
        } else {
            teapotObj.position.x = paddle.position.x - paddleSize.width / 2 - 1.5;
        }

        // Play paddle hit sound
        playPaddleHitSound();

        // Trigger visual effect on paddle
        const impactPoint = calculateImpactPoint(teapotObj, paddle);
        triggerPaddleHitEffect(paddle, impactPoint);
    }
}

function calculateImpactPoint(teapotObj, paddle) {
    // Calculate intersection point based on teapot's position relative to paddle
    const impactPosition = teapotObj.position.clone();
    return impactPosition;
}

function updatePlayerPaddle() {
    // Movement logic
    const paddleSize = playerPaddle.geometry.parameters;
    if (moveUp && playerPaddle.position.y < 15 - paddleSize.height / 2) {
        playerPaddle.position.y += paddleSpeed;
    }
    if (moveDown && playerPaddle.position.y > -15 + paddleSize.height / 2) {
        playerPaddle.position.y -= paddleSpeed;
    }
    if (moveForward && playerPaddle.position.z < 10 - paddleSize.depth / 2) {
        playerPaddle.position.z += paddleSpeed;
    }
    if (moveBackward && playerPaddle.position.z > -10 + paddleSize.depth / 2) {
        playerPaddle.position.z -= paddleSpeed;
    }
}

function updateAIPaddle() {
    // AI paddle follows the teapot with smoothing
    aiPaddle.position.y += (teapot.position.y - aiPaddle.position.y) * 0.05;
    aiPaddle.position.z += (teapot.position.z - aiPaddle.position.z) * 0.05;

    // Keep AI paddle within boundaries
    const paddleSize = aiPaddle.geometry.parameters;
    aiPaddle.position.y = THREE.MathUtils.clamp(aiPaddle.position.y, -15 + paddleSize.height / 2, 15 - paddleSize.height / 2);
    aiPaddle.position.z = THREE.MathUtils.clamp(aiPaddle.position.z, -10 + paddleSize.depth / 2, 10 - paddleSize.depth / 2);
}

function updateCamera() {
    switch (cameraMode) {
        case 'follow':
            camera.position.set(-35, 10, 0);
            camera.lookAt(0, 0, 0);
            break;
        case 'top':
            camera.position.set(0, 50, 0);
            camera.lookAt(0, 0, 0);
            break;
        case 'third-person':
            camera.position.lerp(
                new THREE.Vector3(playerPaddle.position.x - 15, playerPaddle.position.y + 5, playerPaddle.position.z),
                0.1
            );
            camera.lookAt(teapot.position);
            break;
    }
}

function resetBall(teapotObj) {
    teapotObj.position.set(0, 0, 0);
    ballSpeed.x = (Math.random() > 0.5 ? 1 : -1) * initialBallSpeed.x;
    ballSpeed.y = (Math.random() - 0.5) * initialBallSpeed.y * 2;
    ballSpeed.z = (Math.random() - 0.5) * initialBallSpeed.z * 2;
}

function handlePowerUps() {
    // Randomly spawn power-ups
    if (Math.random() < 0.005 && powerUps.length < 3) {
        spawnPowerUp();
    }

    // Rotate power-ups for effect
    powerUps.forEach(powerUp => {
        powerUp.rotation.y += 0.02;
    });
}

function spawnPowerUp() {
    const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial();
    // Set color based on power-up type
    switch (type) {
        case 'enlarge':
            material.color.set(0x00ff00); // Green
            break;
        case 'slow':
            material.color.set(0x0000ff); // Blue
            break;
        case 'multiball':
            material.color.set(0xff0000); // Red
            break;
    }
    const powerUp = new THREE.Mesh(geometry, material);
    powerUp.position.set(
        0,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 15
    );
    powerUp.userData.type = type;

    if (showCollisionBounds) {
        addCollisionBounds(powerUp);
    }

    scene.add(powerUp);
    powerUps.push(powerUp);
}

function activatePowerUp(type) {
    // Display power-up message
    displayPowerUpMessage(type);
    switch (type) {
        case 'enlarge':
            enlargePaddle();
            break;
        case 'slow':
            slowTeapot();
            break;
        case 'multiball':
            spawnAdditionalTeapots();
            break;
    }
}

function displayPowerUpMessage(type) {
    let message = '';
    switch (type) {
        case 'enlarge':
            message = 'Paddle Enlarged!';
            break;
        case 'slow':
            message = 'Teapot Slowed Down!';
            break;
        case 'multiball':
            message = 'Multiball Activated!';
            break;
    }
    powerUpMessage.textContent = message;
    powerUpMessage.style.display = 'block';
    clearTimeout(powerUpMessageTimeout);
    powerUpMessageTimeout = setTimeout(() => {
        powerUpMessage.style.display = 'none';
    }, 2000);
}

function enlargePaddle() {
    // Example: Change base color to indicate enlargement
    // Optionally, implement size changes or other effects
}

function slowTeapot() {
    ballSpeed.multiplyScalar(0.5);
    setTimeout(() => {
        ballSpeed.multiplyScalar(2);
    }, 5000);
}

function spawnAdditionalTeapots() {
    for (let i = 0; i < 2; i++) {
        const teapotSize = 1.5;
        const teapotGeometry = new TeapotGeometry(teapotSize);
        const teapotMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const newTeapot = new THREE.Mesh(teapotGeometry, teapotMaterial);
        newTeapot.position.copy(teapot.position);

        // Assign a unique speed vector with more noticeable spread
        const spreadAngle = (Math.PI / 4) * (i === 0 ? -1 : 1); // Spread left and right by 45 degrees
        const speedMagnitude = 0.4;
        const angle = Math.atan2(ballSpeed.y, ballSpeed.z) + spreadAngle;
        const newBallSpeed = new THREE.Vector3(
            ballSpeed.x * 1, // Keep x speed same
            speedMagnitude * Math.sin(angle),
            speedMagnitude * Math.cos(angle)
        );
        newTeapot.userData.ballSpeed = newBallSpeed;

        scene.add(newTeapot);
        additionalTeapots.push(newTeapot);

        if (showCollisionBounds) {
            addCollisionBounds(newTeapot);
        }
    }
    setTimeout(() => {
        additionalTeapots.forEach(t => scene.remove(t));
        additionalTeapots = [];
    }, 7000);
}

function pauseGame() {
    isPaused = true;
    pauseMenu.style.display = 'flex';
    if (bgmPlaying) {
        audioContext.suspend();
    }
}

function resumeGame() {
    isPaused = false;
    pauseMenu.style.display = 'none';
    if (bgmPlaying) {
        audioContext.resume();
    }
}

function cleanupGame() {
    // Remove all objects from the scene
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
    // Reset variables
    isPaused = false;
    moveForward = moveBackward = moveUp = moveDown = false;
    powerUps = [];
    additionalTeapots = [];
    document.body.removeChild(renderer.domElement);
    if (bgmPlaying) {
        audioContext.close();
        bgmPlaying = false;
    }
}

// Collision Bounds Handling
function updateCollisionBoundsVisibility() {
    // Remove existing collision bounds
    scene.traverse(function (object) {
        if (object.userData.isCollisionBounds) {
            scene.remove(object);
        }
    });
    // Add collision bounds if enabled
    if (showCollisionBounds) {
        addCollisionBounds(teapot);
        powerUps.forEach(powerUp => {
            addCollisionBounds(powerUp);
        });
        additionalTeapots.forEach(teapot => {
            addCollisionBounds(teapot);
        });
    }
}

function updateTeapotCollisionBounds() {
    // Remove existing teapot collision bounds
    scene.traverse(function (object) {
        if (object.userData.isTeapotCollisionBounds) {
            scene.remove(object);
        }
    });
    // Add updated collision bounds
    addCollisionBounds(teapot, true);
}

function addCollisionBounds(object, isTeapot = false) {
    const box = new THREE.BoxHelper(object, 0x00ff00);
    box.userData.isCollisionBounds = true;
    if (isTeapot) {
        box.userData.isTeapotCollisionBounds = true;
    }
    // Ensure the collision box updates with the object
    object.add(box);
    // Do not add to scene, as it's now a child of the object
}

// Sound Generation Functions Using Web Audio API

function playBackgroundMusic() {
    if (bgmPlaying) return; // Prevent multiple background music instances
    bgmPlaying = true;

    // Create a simple, looping melody using OscillatorNodes
    const melody = [
        { freq: 261.63, duration: 0.5 }, // C4
        { freq: 293.66, duration: 0.5 }, // D4
        { freq: 329.63, duration: 0.5 }, // E4
        { freq: 349.23, duration: 0.5 }, // F4
        { freq: 392.00, duration: 0.5 }, // G4
        { freq: 440.00, duration: 0.5 }, // A4
        { freq: 493.88, duration: 0.5 }, // B4
        { freq: 523.25, duration: 0.5 }, // C5
    ];

    let currentTime = audioContext.currentTime;

    melody.forEach(note => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(note.freq, currentTime);
        oscillator.connect(bgmGain);
        oscillator.start(currentTime);
        oscillator.stop(currentTime + note.duration);
        currentTime += note.duration;
    });

    // Schedule looping
    const totalDuration = melody.reduce((sum, note) => sum + note.duration, 0);
    setInterval(() => {
        let loopTime = audioContext.currentTime;
        melody.forEach(note => {
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(note.freq, loopTime);
            oscillator.connect(bgmGain);
            oscillator.start(loopTime);
            oscillator.stop(loopTime + note.duration);
            loopTime += note.duration;
        });
    }, totalDuration * 1000);
}

function playPaddleHitSound() {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.connect(sfxGain);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playScoreSound() {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
    oscillator.connect(sfxGain);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
}

function playPowerUpSound() {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.connect(sfxGain);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
}

// Visual Effects on Paddle Hit

function triggerPaddleHitEffect(paddle, impactPosition) {
    // Convert world position to local position relative to paddle
    const localImpact = new THREE.Vector3();
    paddle.worldToLocal(localImpact.copy(impactPosition));

    // Normalize the local impact position based on paddle size
    const normalizedImpact = new THREE.Vector2(
        (localImpact.y / (paddle.geometry.parameters.height / 2) + 1.0) / 2.0, // Normalize y to 0-1
        (localImpact.z / (paddle.geometry.parameters.depth / 2) + 1.0) / 2.0  // Normalize z to 0-1
    );

    // Update shader uniforms
    paddle.material.uniforms.impactPoint.value = normalizedImpact;
    paddle.material.uniforms.impactTime.value = 0.0;
    paddle.material.uniforms.impactActive.value = true;

    // Record the start time
    paddle.userData.impactStart = Date.now();

    // Flag the material as needing update (optional)
    paddle.material.needsUpdate = true;
}

// Visual Effects on Walls

function triggerWallImpact(wall, impactPosition) {
    // Convert world position to local position relative to wall
    const localImpact = new THREE.Vector3();
    wall.worldToLocal(localImpact.copy(impactPosition));

    // Normalize the local impact position based on wall size
    const normalizedImpact = new THREE.Vector2(
        (localImpact.y / (wall.geometry.parameters.height / 2) + 1.0) / 2.0, // Normalize y to 0-1
        (localImpact.z / (wall.geometry.parameters.width / 2) + 1.0) / 2.0  // Normalize z to 0-1
    );

    // Update shader uniforms
    wall.material.uniforms.impactPoint.value = normalizedImpact;
    wall.material.uniforms.impactTime.value = 0.0;
    wall.material.uniforms.impactActive.value = true;

    // Record the start time
    wall.userData.impactStart = Date.now();

    // Flag the material as needing update (optional)
    wall.material.needsUpdate = true;
}

// Visual Effects on Scoring

function triggerScoreEffect(player) {
    // Flash the score
    const scoreElement = player === 'player' ? playerScoreElement : aiScoreElement;
    scoreElement.style.color = 'yellow';
    setTimeout(() => {
        scoreElement.style.color = 'white';
    }, 300);

    // Optional: Add more visual effects here
}

