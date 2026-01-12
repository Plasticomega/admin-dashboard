const neko = document.getElementById("neko");

const TILE = 32;
const T = (col, row) => [col - 1, row - 1];

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


const logo = document.querySelector(".logo");

function computeHome() {
	const r = logo.getBoundingClientRect();
	return {
		x: r.left + 10,                 // left side inside logo
		y: r.top + r.height / 2 - 16    // vertically centered (16 = half tile)
	};
}

let home = computeHome();


let x = home.x, y = home.y;
let mx = x, my = y;

let mode = "idle"; // idle | follow | return

// ✅ slower movement
const speedFollow = 1.35;
const speedReturn = 2.2;

// ✅ stop distance to prevent flicker
const STOP_DIST = 24;

let walkFrame = 0;
let lastWalkFrameTime = 0;

let alertUntil = 0;

// ===== idle actions =====
let idleUntil = 0;
let nextIdleActionAt = performance.now() + 5000;
let idleAction = "none"; // "none" | "yawn" | "scratch" | "scratchSelf"
let idleFrame = 0;
let lastIdleFrameTime = 0;

// prevent rapid sit/walk switching
let lastMoveTime = 0;
const SIT_DELAY = 250; // ms after movement stops before sitting

function rand(a, b) {
	return a + Math.random() * (b - a);
}

function setSprite([col, row]) {
	neko.style.backgroundPosition = `-${col * TILE}px -${row * TILE}px`;
}

function setPos(nx, ny) {
	x = nx; y = ny;
	neko.style.left = x + "px";
	neko.style.top = y + "px";
}

function animateWalk(dir, ts) {
	if (ts - lastWalkFrameTime > 160) { // ✅ slower animation = less jittery
		walkFrame = (walkFrame + 1) % 2;
		lastWalkFrameTime = ts;
	}
	setSprite(SPRITES[dir][walkFrame]);
}

function animateIdle(key, ts, speed = 220) {
	if (ts - lastIdleFrameTime > speed) {
		idleFrame = (idleFrame + 1) % 2;
		lastIdleFrameTime = ts;
	}
	setSprite(SPRITES[key][idleFrame]);
}


setPos(home.x, home.y);
setSprite(SPRITES.sit);

document.addEventListener("mousemove", (e) => {
	mx = e.clientX;
	my = e.clientY;
});

neko.addEventListener("click", () => {
	const now = performance.now();

	if (mode === "follow") {
		mode = "return";
	} else {
		mode = "follow";
		alertUntil = now + 450;
	}
});

function tick(ts) {
	// ALERT overrides everything briefly
	if (ts < alertUntil) {
		setSprite(SPRITES.alert);
		requestAnimationFrame(tick);
		return;
	}

	// ✅ Yawn only when idle
	if (mode === "idle") {
		// every 5 seconds, pick an idle action if not currently doing one
		if (ts >= nextIdleActionAt && ts >= idleUntil) {
			const r = Math.random();

			// choose action
			if (r < 0.34) {
				idleAction = "yawn";
				idleUntil = ts + 2000; // 3 sec
			} else if (r < 0.67) {
				idleAction = "scratch";
				idleUntil = ts + 2000; // 3 sec
			} else {
				idleAction = "scratchSelf";
				idleUntil = ts + 3000; // 2 sec
			}

			// schedule next decision
			nextIdleActionAt = ts + 5000;

			// reset animation frame so it starts nicely
			idleFrame = 0;
			lastIdleFrameTime = 0;
		}

		// if action time is over
		if (ts >= idleUntil) {
			idleAction = "none";
		}

		// render idle
		if (idleAction === "yawn") {
			setSprite(SPRITES.yawn);
		} else if (idleAction === "scratch") {
			animateIdle("scratch", ts);
		} else if (idleAction === "scratchSelf") {
			animateIdle("scratchSelf", ts);
		} else {
			setSprite(SPRITES.sit);
		}

		requestAnimationFrame(tick);
		return;
	}

	// moving modes
	let tx, ty, spd;
	if (mode === "follow") {
		tx = mx; ty = my; spd = speedFollow;
	} else {
		tx = home.x; ty = home.y; spd = speedReturn;
	}

	const dx = tx - x;
	const dy = ty - y;
	const dist = Math.hypot(dx, dy);

	// arrived at target
	if (dist < STOP_DIST) {
		// ✅ do not instantly sit: wait a tiny moment (prevents flicker)
		if (ts - lastMoveTime > SIT_DELAY) {
			if (mode === "return") mode = "idle";
			setSprite(SPRITES.sit);
		}
		requestAnimationFrame(tick);
		return;
	}

	lastMoveTime = ts;

	// move
	const vx = (dx / dist) * spd;
	const vy = (dy / dist) * spd;
	setPos(x + vx, y + vy);

	// 4-way direction
	if (Math.abs(dx) > Math.abs(dy)) {
		if (dx > 0) animateWalk("walkR", ts);
		else animateWalk("walkL", ts);
	} else {
		if (dy > 0) animateWalk("walkD", ts);
		else animateWalk("walkU", ts);
	}

	requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

