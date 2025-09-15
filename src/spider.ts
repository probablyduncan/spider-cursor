import Vec2 from "@probablyduncan/common/vec2";
import "./style.css";
import { clamp, unlerp } from "@probablyduncan/common";

const canvas = document.getElementById("spider-cursor") as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let targetPos: Vec2 = getRandPosOffScreen();

function onMouseMove(e: MouseEvent) {
    go(e.x, e.y);
}

function onTouch(e: TouchEvent) {
    go(e.touches[0].pageX, e.touches[0].pageY);
}

function go(x: number, y: number) {
    if (noMoveTimeoutId) {
        clearTimeout(noMoveTimeoutId);
        noMoveTimeoutId = undefined;
    }

    if (idleTimeoutId) {
        clearTimeout(idleTimeoutId);
        idleTimeoutId = undefined;
    }

    targetPos = Vec2.From(x, y);
}

let animationDir = Vec2.Zero;
let animationPos: Vec2;

/**
 * distance to keep spider away from cursor
 */
const CURSOR_PADDING = 20;

// let prevTime: number;
const animate: FrameRequestCallback = (_time) => {

    // const deltaMS = time - (prevTime ?? time);
    // prevTime = time;

    if (!animationPos) {
        animationPos = targetPos;
    }
    else {
        const prevPos = animationPos.clone();

        // used to compute direction and keep spider off of cursor
        const deltaDistance = targetPos.subtract(prevPos);

        // push target back a bit to keep the spider off of cursor
        const newTarget = targetPos.subtract(deltaDistance.normalized().multiply(CURSOR_PADDING));

        // interpolate the pos of the spider towards the target
        animationPos = Vec2.From(idleTimeoutId ? 0.01 : 0.05).lerp(prevPos, newTarget);

        animationDir = deltaDistance.normalized();

        if (!idleTimeoutId && Math.abs(deltaDistance.x) < CURSOR_PADDING && Math.abs(deltaDistance.y) < CURSOR_PADDING) {
            // if we get here, we can assume the mouse hasn't been moving in a while?
            // so we can set a timeout, and if the mouse moves before the timeout is up, we can cancel it no problem
            setIdleTimeout();
        }

    }

    clearCanvas();
    drawLegs(animationPos, animationDir);
    drawBody(animationPos, animationDir);

    requestAnimationFrame(animate);
}

//#region canvas/drawing

function scaleCanvasToWindow() {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawBody(centerPos: Vec2, centerRotation: Vec2) {
    ctx.beginPath();
    ctx.arc(centerPos.x, centerPos.y, 3, 0, 2 * Math.PI);
    ctx.fill();

    const headPos = centerRotation.multiply(5).add(centerPos);
    ctx.beginPath();
    ctx.arc(headPos.x, headPos.y, 3, 0, 2 * Math.PI);
    ctx.fill();

    const thorax = centerRotation.multiply(-6).add(centerPos);
    ctx.beginPath();
    ctx.arc(thorax.x, thorax.y, 6, 0, 2 * Math.PI);
    ctx.fill();

    // eyes
    const leftEyePos = rotate(centerRotation, -25).multiply(5).add(centerPos);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(leftEyePos.x, leftEyePos.y, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "black";

    const leftPupilPos = rotate(centerRotation, -25).multiply(5).add(centerPos);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(leftPupilPos.x, leftPupilPos.y, 1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "black";

    const rightEyePos = rotate(centerRotation, 25).multiply(5).add(centerPos);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(rightEyePos.x, rightEyePos.y, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "black";

    const rightPupilPos = rotate(centerRotation, 25).multiply(5).add(centerPos);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(rightPupilPos.x, rightPupilPos.y, 1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "black";
}

const LEG_DATA = [
    { angle: 30, length: 20, stretch: 20 },
    { angle: 60, length: 16, stretch: 28 },
    { angle: 80, length: 16, stretch: 16 },
    { angle: 120, length: 14, stretch: 10 },
] as const;

const feetPositions: [[Vec2 | undefined, Vec2 | undefined], [Vec2 | undefined, Vec2 | undefined], [Vec2 | undefined, Vec2 | undefined], [Vec2 | undefined, Vec2 | undefined]] = [[undefined, undefined], [undefined, undefined], [undefined, undefined], [undefined, undefined]];

function drawLegs(centerPos: Vec2, centerRotation: Vec2) {

    for (let legIndex = 0; legIndex < LEG_DATA.length; legIndex++) {

        const { angle: rightAngle, length: legLength, stretch: legStretch } = LEG_DATA[legIndex];
        const angles = [-rightAngle, rightAngle];

        for (let sideIndex = 0; sideIndex < 2; sideIndex++) {

            const idealRotation = rotate(centerRotation, angles[sideIndex]);
            const idealPos = idealRotation.multiply(legLength).add(centerPos);

            let currentPos = feetPositions[legIndex][sideIndex];

            // reset foot if not already set, if too far from ideal, or randomly if idle
            if (!currentPos || currentPos.subtract(idealPos).magnitude() > legStretch || (noMoveTimeoutId && Math.random() > 0.99)) {
                feetPositions[legIndex][sideIndex] = currentPos = idealPos;

                const now = new Date().valueOf();
                if (audioState === "on" && lastPlay < now - 50) {
                    lastPlay = now;

                    const cursorToSpiderDistance = targetPos
                        .subtract(animationPos)
                        .abs()
                        .magnitude();
                    
                    const cursorToSpiderLerp = unlerp(
                        0,
                        Math.max(window.innerWidth, window.innerHeight) / 2,
                        cursorToSpiderDistance,
                        true);

                    playNoteFromLerp(cursorToSpiderLerp)

                }
            }

            ctx.beginPath();
            ctx.moveTo(centerPos.x, centerPos.y);
            ctx.lineTo(currentPos.x, currentPos.y);
            ctx.stroke();
        }
    }
}

//#endregion
//#region vec2 helpers

const trigMapLol = new Map<number, [number, number]>();
function getSinCos(deg: number): [number, number] {
    const cached = trigMapLol.get(deg)!;
    if (cached) {
        return cached;
    }

    const computed: [number, number] = [Math.sin(Math.PI * deg / 180), Math.cos(Math.PI * deg / 180)];
    trigMapLol.set(deg, computed);
    return computed;
}

function rotate(dir: Vec2, deg: number) {
    const [sin, cos] = getSinCos(deg)!;
    return Vec2.From(dir.x * cos - dir.y * sin, dir.x * sin + dir.y * cos);
}

//#endregion
//#region idle

let noMoveTimeoutId: number | undefined;
function setIdleTimeout() {
    if (!noMoveTimeoutId && !idleTimeoutId) {
        noMoveTimeoutId = setTimeout(() => {
            noMoveTimeoutId = undefined;
            idle();
        }, 2000);
    }
}

let idleTimeoutId: number | undefined;
function idle() {
    idleTimeoutId = setTimeout(() => {
        targetPos = Math.random() > 0.75 ? getRandPosOnScreen() : Math.random() > 0.75 ? getRandPosNear() : getRandPosAhead();
        idle();
    }, Math.floor(Math.random() * 3950 + 50));
}

function getRandPosOnScreen() {
    const x = Math.floor(Math.random() * window.innerWidth);
    const y = Math.floor(Math.random() * window.innerHeight);
    return Vec2.From(x, y);
}

function getRandPosOffScreen() {
    const horiz: boolean = Math.random() > 0.5;
    const offScreenPos = Math.random() > 0.5 ? -50 : 50 + (horiz ? window.innerWidth : window.innerHeight);
    const onScreenPos = Math.floor(Math.random() * (horiz ? window.innerHeight : window.innerWidth));
    return horiz ? Vec2.From(offScreenPos, onScreenPos) : Vec2.From(onScreenPos, offScreenPos);
}

function getRandPosNear() {
    return targetPos.add(Vec2.From(Math.floor(Math.random() * 100 - 50), Math.floor(Math.random() * 100 - 50)));
}

function getRandPosAhead() {
    const dir = rotate(animationDir, Math.random() * 20 - 10);
    const result = dir.multiply(Math.random() * 50 + 50).add(animationPos);
    return result;
}

//#endregion

window.addEventListener("mousemove", onMouseMove);
window.addEventListener("resize", scaleCanvasToWindow);
window.addEventListener("touchmove", onTouch);
window.addEventListener("touchstart", onTouch);

scaleCanvasToWindow();
setIdleTimeout();
requestAnimationFrame(animate);


//#region audio
// https://css-tricks.com/introduction-web-audio-api/

let audioContext: AudioContext | undefined;
let audioState: "blocked" | "off" | "on" = "blocked";
let lastPlay = 0;

const button = document.querySelector("button[data-sound-toggle]") as HTMLButtonElement;
button?.addEventListener("click", () => {

    const onContent = button.dataset.soundToggle ?? "";
    button.dataset.soundToggle = button.innerHTML;
    button.innerHTML = onContent;

    switch (audioState) {
        case 'blocked':
            audioContext = new AudioContext();
            unblockAudio();
            button.classList.add("used");
            audioState = "on";
            break;
        case "on":
            audioState = "off";
            break;
        case "off":
            audioState = "on";
            break;
    }

});

const frequencies = [
    195.9977, 207.6523, 220.0000, 233.0819, 246.9417, 261.6256, 277.1826, 293.6648, 311.1270, 329.6276, 349.2282, 369.9944, 391.9954, 415.3047, 440.0000, 466.1638, 493.8833, 523.2511, 554.3653, 587.3295, 622.2540, 659.2551, 698.4565, 739.9888, 783.9909, 830.6094, 880.0000, 932.3275, 987.7666, 1046.502, 1108.731, 1174.659, 1244.508, 1318.510, 1396.913, 1479.978, 1567.982, 1661.219, //1760.000,
]

function playNoteFromLerp(lerp: number) {
    const clampedLerp = clamp(lerp, 0, 0.9999999999);
    playNote(frequencies[Math.floor(frequencies.length * clampedLerp)]);
}

function playNote(frequency: number) {

    if (!audioContext) {
        return;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const time = audioContext.currentTime;

    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;

    // volume
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.exponentialRampToValueAtTime(0.02, time + 0.01);

    oscillator.start(time);

    // stop
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1);
    oscillator.stop(time + 1);
}


function unblockAudio() {

    // https://www.audjust.com/blog/unmute-web-audio-on-ios
    // on ios, audio api doesn't get unblocked on interaction when your phone is on silent?
    // but when you play a regular html audio element, that unblocks it

    const audio = document.createElement("audio");
    audio.setAttribute("x-webkit-airplay", "deny");
    audio.preload = "auto";
    audio.loop = true;
    audio.src = "silence.mp3";
    audio.play();
    audio.remove();

    playNote(0);
}

//#endregion