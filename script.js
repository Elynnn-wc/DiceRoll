import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";

// --- CONFIGURATION ---
const PROBABILITIES = {
  weights: [0.2, 0.2, 0.44, 0.1, 0.05, 0.01],
  values: [1, 2, 3, 4, 5, 6]
};

const firebaseConfig = {
  apiKey: "AIzaSyDlKAT8l9kp_X1RXdSV6fOfwGZrt2o6pZA",
  authDomain: "roll-result.firebaseapp.com",
  databaseURL: "https://roll-result-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "roll-result",
  storageBucket: "roll-result.appspot.com",
  messagingSenderId: "363988214142",
  appId: "1:363988214142:web:235c0b9dca54f5d9ffd32f",
  measurementId: "G-DSLWS2RMBW"
};

// --- INITIALIZATION ---
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let hasRolled = false;
let userName = '';
let userPhone = '';
let devForcedResult = 0;

const diceCube = document.getElementById('diceCube');
const rollButton = document.getElementById('rollButton');

window.onload = () => {
  // Check local storage to prevent duplicate rolls
  if (localStorage.getItem('hasRolled')) {
    document.body.innerHTML = `
      <div style="display:flex; height:100vh; align-items:center; justify-content:center; flex-direction:column; background:#0b0c10; color:#fff; text-align:center;">
        <h2 style="color: #fcc200;">You have already participated.</h2>
        <p>Only one attempt is allowed per user.</p>
      </div>`;
    return;
  }
  document.getElementById('modal').style.display = 'flex';
};

// Handle Modals
document.getElementById('submitBtn').addEventListener('click', () => {
  userName = document.getElementById('name').value.trim();
  userPhone = document.getElementById('phone').value.trim();
  if (userName && userPhone) {
    document.getElementById('modal').style.display = 'none';
    rollButton.disabled = false;
  } else {
    alert('Please fill in both fields!');
  }
});

rollButton.addEventListener('click', () => {
  if (hasRolled) return;
  hasRolled = true;
  rollButton.disabled = true;
  rollButton.querySelector('span').innerText = 'ROLLING...';

  // 1. Calculate the final predetermined outcome
  const result = weightedRoll();

  // 2. Animate the 3D roll
  animateDice(result);
});

// Calculate Weighted Roll
function weightedRoll() {
  if (devForcedResult >= 1 && devForcedResult <= 6) {
    return devForcedResult;
  }

  const { values, weights } = PROBABILITIES;
  let sum = 0, cumulative = [];

  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    cumulative.push(sum);
  }

  const rand = Math.random();
  for (let i = 0; i < cumulative.length; i++) {
    if (rand < cumulative[i]) return values[i];
  }
  return values[values.length - 1];
}

// 3D Animation Logic
function animateDice(finalResult) {
  // We apply a random huge rotation to simulate spinning rapidly
  const spinX = Math.floor(Math.random() * 4 + 4) * 360; // 4 to 8 full spins
  const spinY = Math.floor(Math.random() * 4 + 4) * 360; 
  const spinZ = Math.floor(Math.random() * 4 + 4) * 360;

  // Add random spins to create the "rolling blur" feeling
  diceCube.style.transition = 'transform 3s cubic-bezier(0.2, 1, 0.3, 1)';
  diceCube.style.transform = `translateZ(-75px) rotateX(${spinX}deg) rotateY(${spinY}deg) rotateZ(${spinZ}deg)`;

  // After spinning starts to settle, force it to the target rotation
  setTimeout(() => {
    // Map final result to the correct CSS rotation
    // Note: TranslateZ keeps the center point consistent
    let finalTransform = 'translateZ(-75px) ';
    switch(finalResult) {
      case 1: finalTransform += 'rotateY(0deg) rotateX(0deg)'; break;
      case 2: finalTransform += 'rotateY(-90deg) rotateX(0deg)'; break;
      case 3: finalTransform += 'rotateY(0deg) rotateX(-90deg)'; break;
      case 4: finalTransform += 'rotateY(0deg) rotateX(90deg)'; break;
      case 5: finalTransform += 'rotateY(90deg) rotateX(0deg)'; break;
      case 6: finalTransform += 'rotateY(180deg) rotateX(0deg)'; break;
    }
    
    // We add the spin offsets to the final transform so it doesn't snap backwards
    // For a cleaner look, we let it finish its random spin, disable transition, reset orientation instantly,
    // then apply the final spin ... but that might look jittery. 
    // Best approach: Add the final rotation directly onto a multiple of 360deg spins.
    
    let xTarget = spinX, yTarget = spinY;
    switch(finalResult) {
      case 1: xTarget += 0; yTarget += 0; break;
      case 2: xTarget += 0; yTarget += -90; break;
      case 3: xTarget += -90; yTarget += 0; break;
      case 4: xTarget += 90; yTarget += 0; break;
      case 5: xTarget += 0; yTarget += 90; break;
      case 6: xTarget += 0; yTarget += 180; break;
    }

    diceCube.style.transform = `translateZ(-75px) rotateX(${xTarget}deg) rotateY(${yTarget}deg) rotateZ(${spinZ}deg)`;

    // Wait for animation to fully finish before showing popup
    setTimeout(() => {
      triggerFireworks();
      saveToFirebase(userName, userPhone, finalResult).then((rollKey) => {
        const popupResult = document.getElementById('popupResult');
        popupResult.innerHTML = `You rolled a <b>${finalResult}</b>! <br><br> Your Verification Code: <br><b style="font-size:1.4rem;">${rollKey}</b>`;
        document.getElementById('popup').style.display = 'flex';
        
        // Mark as completed
        localStorage.setItem('hasRolled', 'true');
        rollButton.querySelector('span').innerText = 'COMPLETED';
      });
    }, 1200); // the remaining time after adjusting target (total 4.2s roughly)
  }, 2000); 
}

// Copy Code logic
document.getElementById('copyText').addEventListener('click', () => {
  const resultText = document.getElementById("popupResult").innerText;
  navigator.clipboard.writeText(resultText).then(() => {
    alert("Code copied successfully!");
    document.getElementById("closePopup").disabled = false;
  }).catch(() => {
    alert("Failed to copy code. Please copy it manually.");
  });
});

document.getElementById("closePopup").addEventListener("click", () => {
  document.getElementById("popup").style.display = "none";
});

// Firebase and Visuals
function saveToFirebase(name, phone, roll) {
  const newRef = push(ref(database, 'rolls'));
  const time = new Date().toLocaleString();
  return set(newRef, { name, phone, roll, time }).then(() => newRef.key);
}

function triggerFireworks() {
  const fireworksContainer = document.getElementById('fireworks');
  for (let i = 0; i < 40; i++) {
    const fw = document.createElement('div');
    fw.className = 'firework';
    fw.style.left = Math.random() * 100 + '%';
    fw.style.top = Math.random() * 100 + '%';
    // Random sizes and colors
    const colors = ['#ffcc00', '#ff3366', '#33ccff', '#ffffff'];
    fw.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    fw.style.boxShadow = `0 0 10px ${fw.style.backgroundColor}`;
    fw.style.animationDuration = (0.8 + Math.random() * 0.7) + 's';
    fireworksContainer.appendChild(fw);
  }
  setTimeout(() => {
    fireworksContainer.innerHTML = '';
  }, 2500);
}

// Secret reset hotkey
document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key.toLowerCase() === 'r') {
    localStorage.removeItem('hasRolled');
    alert("✅ Developer Reloading: LocalStorage Cleared");
    location.reload();
  }
});

// Secret Developer Button (5 rapid clicks on logo)
let secretClicks = 0;
let secretTimer = null;
document.getElementById('secretButton').addEventListener('click', () => {
  secretClicks++;
  if (secretClicks === 1) {
    secretTimer = setTimeout(() => { secretClicks = 0; }, 2000);
  }
  if (secretClicks >= 5) {
    secretClicks = 0;
    clearTimeout(secretTimer);
    const pwd = prompt("Enter Developer Password:");
    if (pwd === "231879") {
      document.getElementById("devModal").style.display = "flex";
    } else {
      alert("Incorrect password.");
    }
  }
});

document.getElementById('devCloseBtn').addEventListener('click', () => {
  document.getElementById("devModal").style.display = "none";
});

document.getElementById('devResetBtn').addEventListener('click', () => {
  localStorage.removeItem('hasRolled');
  alert("Roll history cleared. Reloading...");
  location.reload();
});

document.getElementById('devForceResult').addEventListener('input', (e) => {
  devForcedResult = parseInt(e.target.value) || 0;
});
