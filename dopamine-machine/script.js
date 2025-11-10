let maxTime = 3600;
let elapsed = 0;
let charging = false;
let discharging = false;
let paused = false;
let dischargeTotal = 0;
let dischargeElapsed = 0;
let showTotal = false;
let timer;

const progressBar = document.getElementById("progress-bar");
const statusText = document.getElementById("status");

function updateProgress(percent) {
  progressBar.style.width = `${percent}%`;
}

function setStatus(text) {
  statusText.textContent = `Status: ${text}`;
}

function charge() {
  if (discharging) return;
  charging = true;
  paused = false;
  setStatus("Charging...");
  const start = Date.now() - elapsed * 1000;
  clearInterval(timer);
  timer = setInterval(() => {
    if (!charging || paused) return clearInterval(timer);
    elapsed = (Date.now() - start) / 1000;
    const progress = Math.min((elapsed / maxTime) * 100, 100);
    updateProgress(progress);
    if (progress >= 100) {
      charging = false;
      setStatus("Fully charged");
      clearInterval(timer);
    }
  }, 100);
}

function discharge() {
  if (elapsed <= 0) return;
  discharging = true;
  charging = false;
  paused = false;
  dischargeTotal = elapsed;
  const start = Date.now() - dischargeElapsed * 1000;
  setStatus("Discharging...");
  clearInterval(timer);
  timer = setInterval(() => {
    if (!discharging || paused) return clearInterval(timer);
    dischargeElapsed = (Date.now() - start) / 1000;
    const remaining = Math.max(dischargeTotal - dischargeElapsed, 0);
    const progress = (remaining / dischargeTotal) * 100;
    updateProgress(progress);
    if (progress <= 0) {
      discharging = false;
      elapsed = 0;
      dischargeElapsed = 0;
      setStatus("Idle");
      clearInterval(timer);
    }
  }, 100);
}

document.getElementById("charge").onclick = charge;
document.getElementById("discharge").onclick = discharge;
document.getElementById("pause").onclick = () => {
  paused = !paused;
  if (paused) setStatus("Paused");
  else if (charging) charge();
  else if (discharging) discharge();
};
document.getElementById("reset").onclick = () => {
  elapsed = 0;
  dischargeElapsed = 0;
  charging = false;
  discharging = false;
  paused = false;
  updateProgress(0);
  setStatus("Reset to empty");
};
document.getElementById("show").onclick = () => {
  showTotal = !showTotal;
  if (showTotal) setStatus(`Total charged time: ${elapsed.toFixed(1)} s`);
  else setStatus("Idle");
};

document.querySelectorAll(".presets button").forEach((btn) => {
  btn.onclick = () => {
    if (charging || discharging || elapsed > 0) {
      setStatus("You must empty the bar first.");
      return;
    }
    elapsed = parseInt(btn.dataset.seconds);
    updateProgress(100);
    setStatus(`Discharging from ${elapsed}-second charge...`);
    discharge();
  };
});
