// ------------------------------
// Canvas setup
// ------------------------------
const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");

// Create a trail canvas much wider than the viewport
const trailCanvas = document.createElement("canvas");
const trailCtx = trailCanvas.getContext("2d");

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // On resize, we must resize and CLEAR the trail canvas to prevent artifacts
    const oldTrailData = trailCtx.getImageData(0, 0, trailCanvas.width, trailCanvas.height);
    
    trailCanvas.width = canvas.width * 3;
    trailCanvas.height = canvas.height;
    
    // Clear the new canvas space
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    
    // Optional: Re-plot a portion of the old data (if needed), but often better to start fresh
    // For simplicity with this scrolling type, we'll let it be cleared.
}
window.addEventListener("resize", resize);
resize();


// ------------------------------
// State variables
// ------------------------------
let time = 0;
let scrollOffset = 0;

const marginLeft = 80;
const marginTop = 50;
const marginBottom = 80;
const SCROLL_SPEED = 1; // 1 pixel per frame (0.1s time step)

let centerY = () => canvas.height / 2;     // ZERO LINE

// Initial dot positions
let green = { y: centerY() - 80 };
let shadow = { y: centerY() + 80 };
let red = { y: centerY() - 60 };

let draggingGreen = false;
let draggingTouch = false;

// User values
let redSlowFactor = 0.005;       // Normal slow approach (5% of distance per frame)
let redSlowAfterStop = 0.001;    // Even slower after stop


// ------------------------------
// Trails
// ------------------------------
function drawTrail(x, y, color) {
    trailCtx.fillStyle = color;
    // We draw a small rectangle for the trail point
    trailCtx.fillRect(x, y, 2, 2);
}

function dotX() {
    return marginLeft + 200;
}


// ------------------------------
// Helpers
// ------------------------------
function mapRange(v, a1, a2, b1, b2) {
    return b1 + (v - a1) * (b2 - b1) / (a2 - a1);
}

function quantize01(pixelY) {
    let logical = mapRange(pixelY, canvas.height - marginBottom, marginTop, -7, 7);
    logical = Math.round(logical * 10) / 10;
    return mapRange(logical, -7, 7, canvas.height - marginBottom, marginTop);
}


// ------------------------------
// Drawing axes
// ------------------------------
function drawAxes() {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;

    // Y axis (fixed)
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop);
    ctx.lineTo(marginLeft, canvas.height - marginBottom);
    ctx.stroke();

    // FIXED X axis (0 line)
    ctx.beginPath();
    ctx.moveTo(marginLeft, centerY()); // Corrected to start at fixed marginLeft
    ctx.lineTo(canvas.width, centerY());
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#fff";
    ctx.font = "15px Arial";
    ctx.fillText("Screen Time", marginLeft - 70, marginTop - 10);
    ctx.fillText("Threshold", marginLeft - 70, canvas.height - marginBottom + 40);
    ctx.fillText("Time", canvas.width - 100, centerY() + 30);

    // Y ticks
    for (let i = 0; i <= 7; i++) {
        const y = mapRange(i, 0, 7, centerY(), marginTop);
        ctx.beginPath();
        ctx.moveTo(marginLeft - 6, y);
        ctx.lineTo(marginLeft + 6, y);
        ctx.stroke();
        ctx.fillText(i.toFixed(1), marginLeft - 45, y + 5);
    }

    // X ticks (scrolling)
    for (let t = 0; t <= time + 20; t += 10) {
        // t * 50 is the scale factor (50 pixels per 10 seconds)
        const x = marginLeft + (t / 10) * 500 - scrollOffset; 
        if (x < marginLeft) continue;

        ctx.beginPath();
        ctx.moveTo(x, centerY() - 5);
        ctx.lineTo(x, centerY() + 5);
        ctx.stroke();
        ctx.fillText(t + "s", x - 12, centerY() + 25);
    }
}


// ------------------------------
// Drawing dots
// ------------------------------
function drawDot(x, y, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
}


// ------------------------------
// Main loop
// ------------------------------
function update() {
    time += 0.1;
    scrollOffset += SCROLL_SPEED; // Use SCROLL_SPEED constant

    // Mirror shadow across the center line
    shadow.y = centerY() * 2 - green.y;

    // Red follows shadow slowly
    red.y += (shadow.y - red.y) * redSlowFactor;

    // Corrected Trail Draw: Draw new point at dotX() + scrollOffset on the wide trailCanvas
    const trailX = dotX() + scrollOffset;
    drawTrail(trailX, green.y, "rgba(0,255,0,0.8)");
    drawTrail(trailX, shadow.y, "rgba(0,150,0,0.5)");
    drawTrail(trailX, red.y, "rgba(255,60,60,0.9)");

    // History wrapping and reset
    // When the scroll offset is close to the total width of the trailCanvas
    if (scrollOffset + canvas.width > trailCanvas.width) {
        
        // 1. Calculate the visible history data (from dotX() onward)
        const dataWidthToKeep = canvas.width - dotX(); 
        const visibleData = trailCtx.getImageData(trailX - dataWidthToKeep, 0, dataWidthToKeep, trailCanvas.height);
        
        // 2. Clear the entire trail canvas
        trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
        
        // 3. Re-plot the visible history at the beginning of the canvas (marginLeft)
        trailCtx.putImageData(visibleData, marginLeft, 0); 
        
        // 4. Reset scrollOffset to the position of the old history
        scrollOffset = marginLeft + dataWidthToKeep - dotX();
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Trails first: Shift the entire trailCanvas left by the offset
    ctx.drawImage(trailCanvas, -scrollOffset, 0);

    drawAxes();

    const x = dotX();
    drawDot(x, shadow.y, "rgba(0,150,0,0.5)");
    drawDot(x, green.y, "#00ff00");
    drawDot(x, red.y, "#ff4444");
}


// ------------------------------
// MOUSE events
// ------------------------------
canvas.addEventListener("mousedown", e => {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;

    if (Math.hypot(mx - dotX(), my - green.y) < 12)
        draggingGreen = true;
});

canvas.addEventListener("mousemove", e => {
    if (!draggingGreen) return;
    const r = canvas.getBoundingClientRect();
    let my = e.clientY - r.top;
    
    // Restrict movement to the graph area before quantizing
    if (my < marginTop) my = marginTop;
    if (my > canvas.height - marginBottom) my = canvas.height - marginBottom;
    
    green.y = quantize01(my);
});

canvas.addEventListener("mouseup", () => draggingGreen = false);
canvas.addEventListener("mouseleave", () => draggingGreen = false);


// ------------------------------
// TOUCH events
// ------------------------------
canvas.addEventListener("touchstart", e => {
    const r = canvas.getBoundingClientRect();
    const t = e.touches[0];
    const mx = t.clientX - r.left;
    const my = t.clientY - r.top;

    if (Math.hypot(mx - dotX(), my - green.y) < 30) {
        draggingGreen = true;
        draggingTouch = true;
        e.preventDefault();
    }
});

canvas.addEventListener("touchmove", e => {
    if (!draggingTouch) return;

    const r = canvas.getBoundingClientRect();
    const t = e.touches[0];
    let my = t.clientY - r.top;
    
    // Restrict movement to the graph area before quantizing
    if (my < marginTop) my = marginTop;
    if (my > canvas.height - marginBottom) my = canvas.height - marginBottom;

    green.y = quantize01(my);
    e.preventDefault();
});

canvas.addEventListener("touchend", () => {
    draggingTouch = false;
    draggingGreen = false;
});


// ------------------------------
// STOP button
// ------------------------------
document.getElementById("stopBtn").onclick = () => {
    // Switch to the slower recovery rate
    redSlowFactor = redSlowAfterStop;

    // Green drops to zero line
    green.y = centerY();

    // Red jumps to opposite side first
    red.y = shadow.y;
};


// ------------------------------
update();