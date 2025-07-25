import Vec2 from "@probablyduncan/common/vec2";
import "./style.css";

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

