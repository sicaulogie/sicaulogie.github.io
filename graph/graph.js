const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");

const marginLeft = 80;
const marginBottom = 60;
const marginTop = 50;

let time = 0;
// We now use scrollOffset to track the total elapsed time/distance
let scrollOffset = 0; 

let green = { y: 200 };
let shadow = { y: 400 };
let red = { y: 230 };
let draggingGreen = false;

// Set to 0.05 for a slow but visible approach (5% of remaining distance per frame)
let redSlowFactor = 0.005; 

// Define how many pixels the graph advances per time step (0.1s)
const SCROLL_SPEED = 1;

function mapRange(v, a1, a2, b1, b2) {
    return b1 + (v - a1) * (b2 - b1) / (a2 - a1);
}

function quantize01(pixelY) {
    let logical = mapRange(pixelY, canvas.height - marginBottom, marginTop, -7, 7);
    logical = Math.round(logical * 10) / 10;
    return mapRange(logical, -7, 7, canvas.height - marginBottom, marginTop);
}

// TRAILS (scrolling)
const trailCanvas = document.createElement("canvas");
// Make trail canvas much wider than the viewport to avoid frequent resets
trailCanvas.width = canvas.width * 5; 
trailCanvas.height = canvas.height;
const trailCtx = trailCanvas.getContext("2d");

// Draw a point onto scrolling trail
function drawTrail(x, y, color) {
    trailCtx.fillStyle = color;
    // We draw a small rectangle for the trail point
    trailCtx.fillRect(x, y, 2, 2);
}

// Fixed dot X position on screen
function dotX() {
    return marginLeft + 200;
}

// Draw scrolling axes
function drawAxes() {
    const midY = canvas.height / 2;

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;

    // Y axis (fixed)
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop);
    ctx.lineTo(marginLeft, canvas.height - marginBottom);
    ctx.stroke();

    // X axis (scrolling left) - The line itself stays within the canvas bounds
    ctx.beginPath();
    ctx.moveTo(marginLeft, midY); 
    ctx.lineTo(canvas.width, midY);
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "15px Arial";

    ctx.fillText("Screen Time", marginLeft - 70, marginTop - 10);
    ctx.fillText("Threshold", marginLeft - 70, canvas.height - marginBottom + 40);
    ctx.fillText("Time", canvas.width - 120, midY + 25);

    // Y-axis ticks 0 → 7
    for (let i = 0; i <= 7; i++) {
        let y = mapRange(i, 0, 7, midY, marginTop);
        ctx.beginPath();
        ctx.moveTo(marginLeft - 5, y);
        ctx.lineTo(marginLeft + 5, y);
        ctx.stroke();
        ctx.fillText(i.toFixed(1), marginLeft - 45, y + 5);
    }

    // X-axis ticks scroll left
    for (let t = 0; t <= time + 20; t += 10) {
        // Apply -scrollOffset to move ticks left with time
        // The 50 is the scale factor (50 pixels per 10 seconds)
        let x = marginLeft + (t / 10) * 500 - scrollOffset; 
        
        // Only draw ticks that are visible past the Y-axis
        if (x < marginLeft) continue; 

        ctx.beginPath();
        ctx.moveTo(x, midY - 5);
        ctx.lineTo(x, midY + 5);
        ctx.stroke();

        ctx.fillText(t + "s", x - 10, midY + 25);
    }
}

// Main update loop
function update() {
    time += 0.1;
    // Advance the scroll offset by the speed
    scrollOffset += SCROLL_SPEED;  

    // Mirror green to make shadow
    shadow.y = canvas.height - green.y;

    // Red follows shadow slowly
    red.y += (shadow.y - red.y) * redSlowFactor;

    // Draw trails: new point is drawn at the *current* scroll position
    const trailX = dotX() + scrollOffset;
    
    drawTrail(trailX, green.y,  "rgba(0,255,0,0.8)");
    drawTrail(trailX, shadow.y, "rgba(0,150,0,0.4)");
    drawTrail(trailX, red.y,    "rgba(255,60,60,0.8)");

    // Handle history scrolling and cleanup
    if (scrollOffset > trailCanvas.width - canvas.width) {
        // Shift the entire existing trail data to the left
        const imageData = trailCtx.getImageData(canvas.width, 0, trailCanvas.width - canvas.width, trailCanvas.height);
        trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
        trailCtx.putImageData(imageData, 0, 0);

        // Reset scrollOffset based on the width of the shifted data
        scrollOffset = 0; 
    }

    draw();
    requestAnimationFrame(update);
}

function drawDot(x, y, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
}

// Entire render pass
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw past trails: Shift the entire history canvas to the left by scrollOffset
    ctx.drawImage(trailCanvas, -scrollOffset, 0);

    drawAxes();

    let x = dotX(); // Dots remain fixed on the screen

    drawDot(x, shadow.y, "rgba(0,150,0,0.4)");
    drawDot(x, green.y,  "#00ff00");
    drawDot(x, red.y,    "#ff4444");
}

// --- Green dot DRAGGING ---
canvas.addEventListener("mousedown", e => {
    let r = canvas.getBoundingClientRect();
    let mx = e.clientX - r.left;
    let my = e.clientY - r.top;

    if (Math.hypot(mx - dotX(), my - green.y) < 12) {
        draggingGreen = true;
    }
});

canvas.addEventListener("mousemove", e => {
    if (!draggingGreen) return;

    let r = canvas.getBoundingClientRect();
    let my = e.clientY - r.top;

    // Restrict movement to the graph area
    if (my < marginTop) my = marginTop;
    if (my > canvas.height - marginBottom) my = canvas.height - marginBottom;
    
    green.y = quantize01(my);
});

canvas.addEventListener("mouseup", () => draggingGreen = false);
canvas.addEventListener("mouseleave", () => draggingGreen = false);

// STOP using device
document.getElementById("stopBtn").onclick = () => {
    let midY = canvas.height / 2;

    green.y = midY;        // Green jumps to center
    // Set to a very slow factor for recovery
    redSlowFactor = 0.001;  
    red.y = shadow.y;      // Red jumps outward (to mirror shadow)
};

update();