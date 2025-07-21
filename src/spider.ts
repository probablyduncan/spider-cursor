import Vec2 from "@probablyduncan/common/vec2";
import "./style.css";

const canvas = document.getElementById("ik-cursor") as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function onResize(_: UIEvent) {
    scaleCanvasToWindow();
}

function scaleCanvasToWindow() {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
}

function onMouseMove(e: MouseEvent) {
    setMousePos(e.x, e.y);
}

function setMousePos(x: number, y: number) {
    mousePos = Vec2.From(x, y);
}


let mousePos: Vec2;

let animationDir = Vec2.Zero;
let animationPos: Vec2;

// let prevTime: number;
const animate: FrameRequestCallback = (_time) => {

    // const deltaMS = time - (prevTime ?? time);
    // prevTime = time;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!mousePos) {
        requestAnimationFrame(animate);
        return;
    }

    if (!animationPos) {
        animationPos = mousePos;
    }
    else {
        const prevPos = animationPos.clone();
        animationPos = Vec2.From(0.05).lerp(animationPos, mousePos);
        animationDir = animationPos.subtract(prevPos).normalized();
    }

    // drawLineFromMouse(animationDir, 50);

    // legs!
    drawLegs(animationPos, animationDir);

    // body
    ctx.beginPath();
    ctx.arc(animationPos.x, animationPos.y, 3, 0, 2 * Math.PI);
    ctx.fill();

    const headPos = animationDir.multiply(5).add(animationPos);
    ctx.beginPath();
    ctx.arc(headPos.x, headPos.y, 3, 0, 2 * Math.PI);
    ctx.fill();

    const thorax = animationDir.multiply(-6).add(animationPos);
    ctx.beginPath();
    ctx.arc(thorax.x, thorax.y, 6, 0, 2 * Math.PI);
    ctx.fill();

    // eyes
    const leftEyePos = rotate(animationDir, -25).multiply(5).add(animationPos);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(leftEyePos.x, leftEyePos.y, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "black";

    const leftPupilPos = rotate(animationDir, -25).multiply(5).add(animationPos);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(leftPupilPos.x, leftPupilPos.y, 1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "black";

    const rightEyePos = rotate(animationDir, 25).multiply(5).add(animationPos);
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(rightEyePos.x, rightEyePos.y, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "black";

    const rightPupilPos = rotate(animationDir, 25).multiply(5).add(animationPos);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(rightPupilPos.x, rightPupilPos.y, 1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "black";

    requestAnimationFrame(animate);
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

            if (!currentPos || currentPos.subtract(idealPos).magnitude() > legStretch) {
                feetPositions[legIndex][sideIndex] = currentPos = idealPos;
            }

            ctx.beginPath();
            ctx.moveTo(centerPos.x, centerPos.y);
            ctx.lineTo(currentPos.x, currentPos.y);
            ctx.stroke();
        }
    }
}

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



window.addEventListener("mousemove", onMouseMove)
window.addEventListener("resize", onResize);
scaleCanvasToWindow();
requestAnimationFrame(animate);

const noMouseMessageTimeout = setTimeout(() => {
    alert("i hear spiders like mouse cursors...\n(this website only works with a mouse)");
}, 5000);
window.addEventListener("mousemove", () => {
    clearTimeout(noMouseMessageTimeout);
}, { once: true });




