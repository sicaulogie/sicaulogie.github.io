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
    // For simplicity with this scrolling type, we'll let it be cleared.
    trailCanvas.width = canvas.width * 3;
    trailCanvas.height = canvas.height;
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
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

// FIX: New function to calculate the vertical center, accounting for top and bottom margins.
let graphMidY = () => {
    return marginTop + (canvas.height - marginBottom - marginTop) / 2;
};

// Initial dot positions
// FIX: Initial positions now calculated relative to the centered X-axis (graphMidY)
let green = { y: graphMidY() - 80 };
let shadow = { y: graphMidY() + 80 };
let red = { y: graphMidY() - 60 };

let draggingGreen = false;
let draggingTouch = false;

// User values
let redSlowFactor = 0.05;       // Normal slow approach (5% of distance per frame)
let redSlowAfterStop = 0.005;    // Even slower after stop


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
    // This function maps the pixel Y back to the -7 to 7 logical scale
    let logical = mapRange(pixelY, canvas.height - marginBottom, marginTop, -7, 7);
    logical = Math.round(logical * 10) / 10;
    // And then maps it back to the quantized pixel Y value
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
    ctx.moveTo(marginLeft, graphMidY()); // FIX: Use graphMidY()
    ctx.lineTo(canvas.width, graphMidY());
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#fff";
    ctx.font = "15px Arial";
    ctx.fillText("Screen Time", marginLeft - 70, marginTop - 10);
    ctx.fillText("Threshold", marginLeft - 70, canvas.height - marginBottom + 40);
    ctx.fillText("Time", canvas.width - 100, graphMidY() + 30); // FIX: Use graphMidY()

    // Y ticks
    for (let i = 0; i <= 7; i++) {
        // FIX: Map the logical scale relative to graphMidY()
        const y = mapRange(i, 0, 7, graphMidY(), marginTop); 
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
        ctx.moveTo(x, graphMidY() - 5); // FIX: Use graphMidY()
        ctx.lineTo(x, graphMidY() + 5); // FIX: Use graphMidY()
        ctx.stroke();
        ctx.fillText(t + "s", x - 12, graphMidY() + 25); // FIX: Use graphMidY()
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
    scrollOffset += SCROLL_SPEED;

    // Mirror shadow across the new center line
    // FIX: Shadow calculation uses graphMidY() to ensure perfect symmetry around the new center
    shadow.y = 2 * graphMidY() - green.y;

    // Red follows shadow slowly
    red.y += (shadow.y - red.y) * redSlowFactor;

    // Corrected Trail Draw: Draw new point at dotX() + scrollOffset on the wide trailCanvas
    const trailX = dotX() + scrollOffset;
    drawTrail(trailX, green.y, "rgba(0,255,0,0.8)");
    drawTrail(trailX, shadow.y, "rgba(0,150,0,0.5)");
    drawTrail(trailX, red.y, "rgba(255,60,60,0.9)");

    // History wrapping and reset
    if (scrollOffset + canvas.width > trailCanvas.width) {
        
        const dataWidthToKeep = canvas.width - dotX(); 
        const visibleData = trailCtx.getImageData(trailX - dataWidthToKeep, 0, dataWidthToKeep, trailCanvas.height);
        
        trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
        trailCtx.putImageData(visibleData, marginLeft, 0); 
        
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
    green.y = graphMidY(); // FIX: Use graphMidY()

    // Red jumps to opposite side first
    red.y = shadow.y;
};


// ------------------------------
update();