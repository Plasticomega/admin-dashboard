// ===== elements =====
const logoNeko = document.getElementById("logo-neko");
const runnerNeko = document.getElementById("runner-neko");
const logo = document.querySelector(".logo");

// ===== sprite sheet settings =====
const TILE = 32;
const T = (col, row) => [col - 1, row - 1]; // 1-based to 0-based

const SPRITES = {
	sit: T(4, 4),
	yawn: T(4, 3),
	alert: T(8, 4),

	walkL: [T(5, 3), T(5, 4)],
	walkR: [T(4, 1), T(4, 2)],
	walkU: [T(2, 4), T(2, 3)],
	walkD: [T(8, 3), T(7, 4)],

	scratch: [T(3, 3), T(3, 4)],
	scratchSelf: [T(6, 1), T(7, 1)],
};

// ===== helpers =====
function setSpriteFor(el, [col, row]) {
	el.style.backgroundPosition = `-${col * TILE}px -${row * TILE}px`;
}

function logoDockPoint() {
	const r = logo.getBoundingClientRect();
	return {
		x: r.left + 10,
		y: r.top + r.height / 2 - 16,
	};
}

function randChoice(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

// =====================================================
// LOGO NEKO (idle only)
// =====================================================
let idleUntil = 0;
let nextIdleActionAt = performance.now() + 1000;
let idleAction = "none"; // none|yawn|scratch|scratchSelf
let idleFrame = 0;
let lastIdleFrameTime = 0;

function animateLogoIdle(key, ts, speed = 220) {
	if (ts - lastIdleFrameTime > speed) {
		idleFrame = (idleFrame + 1) % 2;
		lastIdleFrameTime = ts;
	}
	setSpriteFor(logoNeko, SPRITES[key][idleFrame]);
}

function tickLogo(ts) {
	// if logo neko hidden, don't animate it
	if (logoNeko.style.display === "none") {
		requestAnimationFrame(tickLogo);
		return;
	}

	// every 5s choose action (if no action running)
	if (ts >= nextIdleActionAt && ts >= idleUntil) {
		idleAction = randChoice(["yawn", "scratch", "scratchSelf"]);

		if (idleAction === "yawn") idleUntil = ts + 3000;
		if (idleAction === "scratch") idleUntil = ts + 3000;
		if (idleAction === "scratchSelf") idleUntil = ts + 2000;

		nextIdleActionAt = ts + 5000;

		idleFrame = 0;
		lastIdleFrameTime = 0;
	}

	// stop action when time ends
	if (ts >= idleUntil) idleAction = "none";

	// render idle
	if (idleAction === "yawn") {
		setSpriteFor(logoNeko, SPRITES.yawn);
	} else if (idleAction === "scratch") {
		animateLogoIdle("scratch", ts);
	} else if (idleAction === "scratchSelf") {
		animateLogoIdle("scratchSelf", ts);
	} else {
		setSpriteFor(logoNeko, SPRITES.sit);
	}

	requestAnimationFrame(tickLogo);
}

// =====================================================
// RUNNER NEKO (follow + return)
// =====================================================
let mode = "off"; // off | follow | return

let home = logoDockPoint();
let x = home.x, y = home.y;
let mx = x, my = y;

const speedFollow = 1.35;
const speedReturn = 2.2;

const STOP_DIST = 24;
const SIT_DELAY = 250;
let lastMoveTime = 0;

let walkFrame = 0;
let lastWalkFrameTime = 0;

let alertUntil = 0;

// position runner element from x/y
function setRunnerPos(nx, ny) {
	x = nx;
	y = ny;
	runnerNeko.style.left = x + "px";
	runnerNeko.style.top = y + "px";
}

function animateRunnerWalk(dir, ts) {
	if (ts - lastWalkFrameTime > 160) {
		walkFrame = (walkFrame + 1) % 2;
		lastWalkFrameTime = ts;
	}
	setSpriteFor(runnerNeko, SPRITES[dir][walkFrame]);
}

document.addEventListener("mousemove", (e) => {
	mx = e.clientX;
	my = e.clientY;
});

// click logo neko -> spawn runner
logoNeko.addEventListener("click", () => {
	const r = logoNeko.getBoundingClientRect();

	// hide logo neko
	logoNeko.style.display = "none";

	// show runner exactly at same place
	runnerNeko.style.display = "block";
	x = r.left;
	y = r.top;
	runnerNeko.style.left = x + "px";
	runnerNeko.style.top = y + "px";

	// set the "home" return location to logo dock point
	home = logoDockPoint();

	alertUntil = performance.now() + 450;
	mode = "follow";
});

// click runner -> return
runnerNeko.addEventListener("click", () => {
	if (mode === "follow") mode = "return";
});

// hide runner initially
runnerNeko.style.display = "none";
setSpriteFor(logoNeko, SPRITES.sit);

function tickRunner(ts) {
	home = logoDockPoint();
	if (mode === "off") {
		requestAnimationFrame(tickRunner);
		return;
	}

	// ALERT overrides briefly
	if (ts < alertUntil) {
		setSpriteFor(runnerNeko, SPRITES.alert);
		requestAnimationFrame(tickRunner);
		return;
	}

	// update home constantly (layout can change)

	// choose target
	let tx, ty, spd;
	if (mode === "follow") {
		tx = mx; ty = my; spd = speedFollow;
	} else {
		tx = home.x; ty = home.y; spd = speedReturn;
	}

	const dx = tx - x;
	const dy = ty - y;
	const dist = Math.hypot(dx, dy);

	// reached target
	if (dist < STOP_DIST) {
		if (ts - lastMoveTime > SIT_DELAY) {
			// finished returning -> swap back
			if (mode === "return") {
				mode = "off";
				runnerNeko.style.display = "none";
				logoNeko.style.display = "block";
			} else {
				setSpriteFor(runnerNeko, SPRITES.sit);
			}
		}
		requestAnimationFrame(tickRunner);
		return;
	}

	lastMoveTime = ts;

	// move
	const vx = (dx / dist) * spd;
	const vy = (dy / dist) * spd;
	setRunnerPos(x + vx, y + vy);

	// direction sprite
	if (Math.abs(dx) > Math.abs(dy)) {
		if (dx > 0) animateRunnerWalk("walkR", ts);
		else animateRunnerWalk("walkL", ts);
	} else {
		if (dy > 0) animateRunnerWalk("walkD", ts);
		else animateRunnerWalk("walkU", ts);
	}

	requestAnimationFrame(tickRunner);
}

// start both loops
requestAnimationFrame(tickLogo);
requestAnimationFrame(tickRunner);

