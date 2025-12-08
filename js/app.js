// Initialize theme
if (
  localStorage.theme === "dark" ||
  (!("theme" in localStorage) &&
    window.matchMedia("(prefers-color-scheme: dark)").matches)
) {
  document.documentElement.classList.add("dark");
  document.getElementById("themeBtn").innerHTML =
    '<i data-lucide="sun" class="w-4 h-4"></i>';
} else {
  document.documentElement.classList.remove("dark");
  document.getElementById("themeBtn").innerHTML =
    '<i data-lucide="moon" class="w-4 h-4"></i>';
}
lucide.createIcons();

function toggleTheme() {
  if (document.documentElement.classList.contains("dark")) {
    document.documentElement.classList.remove("dark");
    localStorage.theme = "light";
    document.getElementById("themeBtn").innerHTML =
      '<i data-lucide="moon" class="w-4 h-4"></i>';
  } else {
    document.documentElement.classList.add("dark");
    localStorage.theme = "dark";
    document.getElementById("themeBtn").innerHTML =
      '<i data-lucide="sun" class="w-4 h-4"></i>';
  }
  lucide.createIcons();
}

let currentLang = "pl";
let currentGuardMode = "healthy"; // Przechowuje stan ochroniarza
function toggleLang() {
  currentLang = currentLang === "pl" ? "en" : "pl";
  document.documentElement.lang = currentLang;
  document.getElementById("langBtn").innerText = currentLang.toUpperCase();

  // 1. Update statycznych tekstów (data-i18n)
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[currentLang][key]) {
      el.innerHTML = translations[currentLang][key];
    }
  });

  // 2. Update placeholderów
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[currentLang][key]) {
      el.placeholder = translations[currentLang][key];
    }
  });

  // 3. Update opisów w symulacji kręgosłupa
  updatePoseDescriptions();

  // 4. Update pasków w monitorze
  updateUI(currentTension >= 60);

  // 5. NAPRAWA: Wymuś odświeżenie tekstów w sekcji Ochroniarza
  setGuardMode(currentGuardMode);

  setSeverity(currentSeverity);
}

// --- ANIMACJA MCAS (GÓRA) ---
const mastCell = document.getElementById("mastCell");
const shockwave = document.getElementById("shockwave");
const reactionLabel = document.getElementById("reactionLabel");
const scene = document.getElementById("scene");
let isExploded = false;

function initGranules() {
  mastCell.querySelectorAll(".granule").forEach((el) => el.remove());
  scene.querySelectorAll(".mist-particle").forEach((el) => el.remove());
  for (let i = 0; i < 40; i++) {
    const g = document.createElement("div");
    g.classList.add("granule");
    const angle = Math.random() * Math.PI * 2;
    const dist = 45 + Math.random() * 40;
    g.style.left = `calc(50% + ${Math.cos(angle) * dist}px)`;
    g.style.top = `calc(50% + ${Math.sin(angle) * dist}px)`;
    g.style.transform = `translate(-50%, -50%) scale(1)`;
    mastCell.appendChild(g);
  }
}
function explodeCell() {
  if (isExploded) return;
  isExploded = true;
  scene.classList.add("anim-shake");
  setTimeout(() => {
    scene.classList.remove("anim-shake");
    scene.classList.add("anim-explode");
    reactionLabel.style.opacity = "1";
    reactionLabel.style.transform = "translateY(0)";

    // ZMIANA: Stopniowa degranulacja (Gradual Degranulation)
    mastCell.querySelectorAll(".granule").forEach((g, i) => {
      const angle = Math.random() * Math.PI * 2;
      const force = 160 + Math.random() * 200;

      // Każda granulka "wystrzeliwuje" w innym momencie (od 0 do 2500ms)
      // Symuluje to kaskadowe uwalnianie mediatorów, a nie jednorazowy wybuch.
      const delay = Math.random() * 2500;

      setTimeout(() => {
        g.style.transition = `all ${
          0.8 + Math.random() * 0.6
        }s cubic-bezier(0.12, 0.96, 0.58, 1.05)`;
        g.style.left = `calc(50% + ${Math.cos(angle) * force}px)`;
        g.style.top = `calc(50% + ${Math.sin(angle) * force}px)`;
        g.style.opacity = "0";
        g.style.transform = "translate(-50%, -50%) scale(2.0)"; // Nieco mniejsza skala końcowa
      }, delay);
    });

    setTimeout(() => {
      // ZMIANA: Tło po wybuchu (jasny fiolet)
      scene.style.background =
        "radial-gradient(circle at center, #faf5ff 0%, #f3e8ff 100%)";
      // W dark mode background jest nadpisywany przez klasę .dark, ale inline style ma pierwszeństwo
      // Musimy to obsłużyć, aby nie psuło dark mode.
      // Rozwiązanie: zamiast nadpisywać background inline, dodajmy klasę 'exploded' i sterujmy CSSem
      if (document.documentElement.classList.contains("dark")) {
        scene.style.background =
          "radial-gradient(circle at center, #2e1065 0%, #0f172a 100%)";
      }
    }, 100);
  }, 600);
}
function resetCell() {
  isExploded = false;
  scene.classList.remove("anim-explode");
  scene.style.background = ""; // Clear inline style so CSS takes over
  reactionLabel.style.opacity = "0";
  reactionLabel.style.transform = "translateY(16px)";
  mastCell.style.transform = "";
  mastCell.style.filter = "";
  mastCell.style.borderColor = "";
  mastCell.style.boxShadow = "";
  initGranules();
}

// --- STICKMAN SYMULATOR (LINIOWY) ---
const simCanvas = document.getElementById("simCanvas");
const ctx = simCanvas.getContext("2d");
const tensionBar = document.getElementById("tensionBar");
const tensionValue = document.getElementById("tensionValue");
const painStatus = document.getElementById("painStatus");
const poseDesc = document.getElementById("poseDesc");

let mediatorParticles = [];

// Definicje pozycji (Sticky Model)
// Punkty: head, neck, thoracic (kifoza), lumbar (lordoza), hip, knee, foot

const stickPoses = {
  tiptoes: {
    head: { x: 275, y: 80 }, // Głowa wyżej bo stoimy na palcach
    neck: { x: 275, y: 110 },
    thoracic: { x: 260, y: 170 },
    lumbar: { x: 280, y: 230 },
    hip: { x: 275, y: 280 },
    knee: { x: 295, y: 380 }, // Kolano lekko do przodu/zgięte (naturalna kompensacja)
    foot: { x: 275, y: 480 }, // Stopa
    // Kluczowe: Napięcie bardzo niskie (20%), niższe niż stanie (40%)
    tension: 20,
    desc: {
      pl: "Na palcach: Uniesienie pięty skraca drogę nerwu kulszowego od dołu. Rdzeń zyskuje luz, mimo pozycji pionowej.",
      en: "On Tiptoes: Lifting the heel shortens the sciatic nerve path from below. The cord gains slack despite the upright position.",
    },
  },
  standing: {
    head: { x: 275, y: 100 },
    neck: { x: 275, y: 130 },
    thoracic: { x: 260, y: 190 }, // Lekkie wygięcie w tył (Kifoza)
    lumbar: { x: 280, y: 250 }, // Lekkie wygięcie w przód (Lordoza)
    hip: { x: 275, y: 300 },
    knee: { x: 285, y: 400 },
    foot: { x: 275, y: 500 },
    tension: 40,
    desc: {
      pl: "Stojąca: Zachowane krzywizny (S-kształt) dają pewną amortyzację, ale grawitacja działa.",
      en: "Standing: Preserved curves (S-shape) provide some cushioning, but gravity acts.",
    },
  },
  straight: {
    // Wyprost w siadzie (Sitting Extension)
    head: { x: 275, y: 100 },
    neck: { x: 275, y: 130 },
    thoracic: { x: 275, y: 200 }, // Plecy idealnie proste (pion)
    lumbar: { x: 275, y: 260 }, // Zniesiona lordoza
    hip: { x: 275, y: 330 }, // Siedzi
    knee: { x: 375, y: 330 }, // Nogi jak na krześle
    foot: { x: 375, y: 430 },
    tension: 75,
    desc: {
      pl: "Test Wyprostu (Siedząc): 'Wyciągnięcie' kręgosłupa w górę na krześle znosi krzywizny i maksymalnie wydłuża kanał kręgowy.",
      en: "Extension Test (Sitting): 'Pulling' the spine up while sitting removes curves and maximally elongates the spinal canal.",
    },
  },
  chair: {
    head: { x: 275, y: 130 },
    neck: { x: 275, y: 160 },
    thoracic: { x: 260, y: 220 },
    lumbar: { x: 270, y: 280 },
    hip: { x: 275, y: 330 },
    knee: { x: 375, y: 330 },
    foot: { x: 375, y: 430 },
    tension: 55,
    desc: {
      pl: "Krzesło: Napięcie rośnie. Ważne, by nie garbić się nadmiernie.",
      en: "Chair: Tension increases. Important not to slouch excessively.",
    },
  },
  long_sit: {
    head: { x: 200, y: 150 },
    neck: { x: 200, y: 180 },
    thoracic: { x: 185, y: 240 },
    lumbar: { x: 195, y: 300 },
    hip: { x: 200, y: 350 },
    knee: { x: 300, y: 350 },
    foot: { x: 400, y: 350 },
    tension: 90,
    desc: {
      pl: "Siad prosty: Tułów pionowo, nogi proste. Nerwy kulszowe pociągają rdzeń w dół. Wysokie napięcie!",
      en: "Long Sitting: Torso upright, legs straight. Sciatic nerves pull the spinal cord down. High tension!",
    },
  },
  lying_flat: {
    head: { x: 100, y: 400 },
    neck: { x: 130, y: 400 },
    thoracic: { x: 190, y: 400 }, // Płasko
    lumbar: { x: 250, y: 400 }, // Płasko (zniesiona lordoza)
    hip: { x: 300, y: 400 },
    knee: { x: 400, y: 400 },
    foot: { x: 500, y: 400 },
    tension: 85,
    desc: {
      pl: "Leżenie płasko: Wyprostowane nogi napinają rdzeń (efekt naciągania od dołu). Ból i napięcie.",
      en: "Lying Flat: Straight legs stretch the cord (pulling effect from below). Pain and tension.",
    },
  },
  lying_bent: {
    head: { x: 100, y: 400 },
    neck: { x: 130, y: 400 },
    thoracic: { x: 190, y: 400 },
    lumbar: { x: 250, y: 395 }, // Lekki łuk (podparcie)
    hip: { x: 300, y: 400 },
    knee: { x: 350, y: 280 }, // Knees Up
    foot: { x: 400, y: 400 },
    tension: 20,
    desc: {
      pl: "Leżenie z ugiętymi nogami: Pozycja ulgowa. Napięcie spada do poziomu bazowego (30%), ale objawy nie znikają całkowicie.",
      en: "Lying Bent: Relief position. Tension drops to baseline (30%), but symptoms do not disappear completely.",
    },
  },
};

let currentPoseKey = "chair"; // Default to chair
let currentPose = JSON.parse(JSON.stringify(stickPoses.chair));
let targetPose = JSON.parse(JSON.stringify(stickPoses.chair));
let currentTension = 55;
let targetTension = 55;

function updatePoseDescriptions() {
  if (stickPoses[currentPoseKey]) {
    poseDesc.innerText = stickPoses[currentPoseKey].desc[currentLang];
  }
}

window.setPose = function (poseName) {
  currentPoseKey = poseName;
  const p = stickPoses[poseName];
  targetPose = JSON.parse(JSON.stringify(p));
  targetTension = p.tension;
  poseDesc.innerText = p.desc[currentLang];

  document.querySelectorAll(".pose-btn").forEach((btn) => {
    // Clear old color classes
    btn.className = "pose-btn";

    if (btn.id === `btn-${poseName}`) {
      let colorClass = "";
      let bgClass = "";
      if (p.tension <= 35) {
        colorClass =
          "border-blue-500 text-blue-700 dark:border-blue-400 dark:text-blue-300";
        bgClass = "bg-blue-50 dark:bg-blue-900/30";
      } else if (p.tension >= 70) {
        colorClass =
          "border-red-500 text-red-700 dark:border-red-400 dark:text-red-300";
        bgClass = "bg-red-50 dark:bg-red-900/30";
      } else if (p.tension >= 60) {
        colorClass =
          "border-orange-500 text-orange-700 dark:border-orange-400 dark:text-orange-300";
        bgClass = "bg-orange-50 dark:bg-orange-900/30";
      } else {
        colorClass =
          "border-indigo-500 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300";
        bgClass = "bg-indigo-50 dark:bg-indigo-900/30";
      }
      btn.classList.add(...colorClass.split(" "), ...bgClass.split(" "));
    }
  });
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

async function checkDiet() {
  const foodItem = document.getElementById("food-input").value;
  const resultDiv = document.getElementById("diet-result");
  const scoreDiv = document.getElementById("score-display"); // Pobieramy nowy kontener
  const loadingDiv = document.getElementById("dietLoading");

  if (!foodItem) {
    resultDiv.innerHTML = `<p class="text-red-500">${
      currentLang === "pl"
        ? "Proszę wpisać nazwę potrawy."
        : "Please enter a food item."
    }</p>`;
    return;
  }

  // UI Reset
  resultDiv.innerHTML = "";
  scoreDiv.classList.add("hidden");
  scoreDiv.innerHTML = "";
  loadingDiv.classList.remove("hidden"); // Pokaż kręciołek

  // Wybór promptu (Twój oryginalny kod)
  const prompt =
    currentLang === "pl"
      ? `Jesteś analitycznym dietetykiem klinicznym spec. od MCAS i histaminy. Twoim zadaniem jest ocena potrawy: "${foodItem}".

ZASADY OCENY (Algorytm Decyzyjny):
1. BAZA WIEDZY: Lista SIGHI jest priorytetem.
2. INTERPRETACJA DANIA (Kluczowe!):
- PRZYPADEK A: MAKARONY I PIZZA (np. "Spaghetti", "Penne"). MUSISZ ZAŁOŻYĆ klasyczną wersję z sosem pomidorowym (SIGHI 2-3), chyba że podano bezpieczny sos. NIE oceniaj samego makaronu.
- PRZYPADEK B: DANIA MĄCZNE/NADZIEWANE (np. "Pierogi", "Naleśniki"). Oceniaj Bazę (Ciasto + Farsz). IGNORUJ posypki (skwarki, boczek), chyba że są w środku.
- OGÓLNIE: Zakładaj wersję domową.
3. KALIBRACJA OCENY:
- Składniki SIGHI 0 (bezpieczne) = 10 pkt.
- SIGHI 1 (pszenica, gotowana cebula) = Mały minus (ok. 8/10).
- SIGHI 2/3 (Pomidory, Ocet, Sery twarde) = Duży minus (< 4/10).

FORMAT ODPOWIEDZI:
1. Czy jest bezpieczna? (Tak/Nie/Zależy - jedno zdanie).
2. Analiza Składników (Kluczowe): Wymień główne składniki, które wziąłeś pod uwagę w tym wariancie, i przypisz każdemu kategorię SIGHI (np. "Makaron pszenny: 1", "Sos pomidorowy: 3").
3. Główne wyzwalacze (Tylko te z wysokim SIGHI).
4. Ocena bezpieczeństwa (1-10).
5. Sugestia poprawy (krótko).

Bądź konkretny.`
      : `You are an analytical clinical dietitian specializing in MCAS and histamine. Your task is to evaluate the dish: "${foodItem}".

ASSESSMENT RULES (Decision Algorithm):
1. KNOWLEDGE BASE: The SIGHI list is the priority.
2. DISH INTERPRETATION (Crucial!):
- CASE A: PASTA & PIZZA (e.g., "Spaghetti", "Penne"). YOU MUST ASSUME the classic version with tomato sauce (SIGHI 2-3), unless a safe sauce is explicitly stated. DO NOT evaluate the pasta alone.
- CASE B: FLOUR/STUFFED DISHES (e.g., "Pierogi", "Dumplings", "Pancakes"). Evaluate the Base (Dough + Filling). IGNORE toppings (cracklings, bacon), unless they are inside.
- GENERAL: Assume a homemade version.
3. SCORING CALIBRATION:
- SIGHI 0 ingredients (safe) = 10 pts.
- SIGHI 1 (wheat, cooked onion) = Minor deduction (approx. 8/10).
- SIGHI 2/3 (Tomatoes, Vinegar, Hard cheeses) = Major deduction (< 4/10).

RESPONSE FORMAT:
1. Is it safe? (Yes/No/Depends - one sentence).
2. Ingredient Analysis (Crucial): List the main ingredients considered in this variant and assign a SIGHI category to each (e.g., "Wheat pasta: 1", "Tomato sauce: 3").
3. Main triggers (Only those with high SIGHI).
4. Safety rating (1-10).
5. Improvement suggestion (briefly).

Be specific.`;

  try {
    // --- TUTAJ WKLEJ SWÓJ ADRES Z CLOUDFLARE ---
    const workerUrl = "https://bitter-block-4094.dawidl250207.workers.dev";

    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Uwaga: Cloudflare Worker oczekuje obiektu { "prompt": "tekst" }
      body: JSON.stringify({ prompt: prompt }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    loadingDiv.classList.add("hidden");

    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const text = data.candidates[0].content.parts[0].text;

    // --- POPRAWKA: PANCERNA LOGIKA EKSTRAKCJI OCENY ---

    // 1. Strategia Priorytetowa: Szukamy formatu "X/10" (np. 1/10, 8.5/10)
    // To ignoruje "4." (numer listy) i "(1-10)" (skalę), bo one nie mają ukośnika "/10"
    // Dodatkowo szukamy tego PO słowach "Ocena" lub "Safety", żeby nie złapać daty itp.
    let scoreMatch = text.match(
      /(?:Ocena|Safety|Rating)[\s\S]*?(\d+(?:[\.,]\d+)?)\s*\/\s*10/i
    );

    // 2. Strategia Zapasowa (Fallback):
    // Jeśli AI napisało samą cyfrę (np. "Ocena: 8"), szukamy cyfry, ALE...
    // ...najpierw usuwamy z tekstu zmyłkę "(1-10)", żeby skrypt jej nie złapał.
    if (!scoreMatch) {
      const cleanText = text.replace(/\(1-10\)|1-10/g, ""); // Usuń "1-10"
      scoreMatch = cleanText.match(
        /(?:Ocena|Safety|Rating)[^0-9]*?(\d+(?:[\.,]\d+)?)/i
      );
    }

    if (scoreMatch && scoreMatch[1]) {
      const score = parseInt(scoreMatch[1]);
      let colorClass = "";
      let icon = "";
      let label = "";

      // Logika kolorów dla MCAS (Wysoka ocena = Bezpiecznie)
      if (score >= 8) {
        colorClass =
          "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800";
        icon = "check-circle";
        label = currentLang === "pl" ? "BEZPIECZNE" : "SAFE";
      } else if (score >= 5) {
        colorClass =
          "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
        icon = "alert-triangle";
        label = currentLang === "pl" ? "UMIARKOWANE" : "MODERATE";
      } else {
        colorClass =
          "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
        icon = "x-octagon";
        label = currentLang === "pl" ? "RYZYKOWNE" : "RISKY";
      }

      // Generowanie HTML dla oceny
      scoreDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center p-6 rounded-xl border-2 ${colorClass} w-full shadow-sm transition-all animate-in fade-in zoom-in duration-300">
                    <div class="flex items-center gap-3 mb-2">
                        <i data-lucide="${icon}" class="w-8 h-8"></i>
                        <span class="text-3xl font-black tracking-tighter">${score}/10</span>
                    </div>
                    <span class="font-bold tracking-widest text-sm uppercase opacity-90">${label}</span>
                </div>
            `;
      scoreDiv.classList.remove("hidden");
      lucide.createIcons(); // Odśwież ikony w nowym HTML
    }

    // Formatowanie tekstu na HTML (używając biblioteki marked)
    const formattedText = marked.parse(text);

    resultDiv.innerHTML = `<div class="p-5 bg-white dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-600 leading-relaxed shadow-sm prose dark:prose-invert max-w-none prose-sm">${formattedText}</div>`;
  } catch (error) {
    loadingDiv.classList.add("hidden");
    console.error("Gemini Error:", error);
    resultDiv.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
  }
}

function animateStick() {
  const speed = 0.1;

  // Interpolate points
  ["head", "neck", "thoracic", "lumbar", "hip", "knee", "foot"].forEach(
    (key) => {
      // Init missing points if switching from old pose structure (safety check)
      if (!currentPose[key]) currentPose[key] = { ...targetPose[key] };

      currentPose[key].x = lerp(currentPose[key].x, targetPose[key].x, speed);
      currentPose[key].y = lerp(currentPose[key].y, targetPose[key].y, speed);
    }
  );

  currentTension = lerp(currentTension, targetTension, speed);
  drawStickman();
  requestAnimationFrame(animateStick);
}

// Global so it can be called from toggleTheme
window.drawStickman = function () {
  if (!ctx) return;
  ctx.clearRect(0, 0, simCanvas.width, simCanvas.height);

  const isDark = document.documentElement.classList.contains("dark");

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 14;
  // Zmiana koloru ludzika w zależności od trybu
  ctx.strokeStyle = isDark ? "#cbd5e1" : "#475569";

  const p = currentPose;

  // Rysowanie ciała (Kości z uwzględnieniem kręgosłupa)
  ctx.beginPath();
  // Głowa -> Szyja
  ctx.moveTo(p.neck.x, p.neck.y);
  // Kręgosłup (Szyja -> Piersiowy -> Lędźwiowy -> Biodro)
  ctx.lineTo(p.thoracic.x, p.thoracic.y);
  ctx.lineTo(p.lumbar.x, p.lumbar.y);
  ctx.lineTo(p.hip.x, p.hip.y);
  // Noga
  ctx.lineTo(p.knee.x, p.knee.y);
  ctx.lineTo(p.foot.x, p.foot.y);
  ctx.stroke();

  // Głowa
  ctx.beginPath();
  ctx.fillStyle = isDark ? "#cbd5e1" : "#475569";
  ctx.arc(p.head.x, p.head.y, 35, 0, Math.PI * 2);
  ctx.fill();

  // --- RDZEŃ KRĘGOWY (PULSUJĄCA LINIA) ---
  let r, g, b;
  if (currentTension < 50) {
    // Niebieski -> Żółty
    r = Math.floor(lerp(59, 234, currentTension / 50));
    g = Math.floor(lerp(130, 179, currentTension / 50));
    b = Math.floor(lerp(246, 8, currentTension / 50));
  } else {
    // Żółty -> Czerwony
    r = Math.floor(lerp(234, 220, (currentTension - 50) / 50));
    g = Math.floor(lerp(179, 38, (currentTension - 50) / 50));
    b = Math.floor(lerp(8, 38, (currentTension - 50) / 50));
  }

  // Pulsowanie (cała linia)
  let pulseIntensity = 0;
  if (currentTension > 30) {
    const speed = currentTension / 5;
    pulseIntensity = (Math.sin(Date.now() / (10000 / speed)) + 1) / 2; // 0 to 1
  }

  ctx.strokeStyle = `rgb(${r},${g},${b})`;

  // Grubość i Glow zależne od pulsowania
  ctx.lineWidth = 6 + (currentTension > 50 ? pulseIntensity * 3 : 0);

  if (currentTension > 60) {
    ctx.shadowBlur = 15 + pulseIntensity * 10;
    ctx.shadowColor = `rgba(220, 38, 38, ${0.5 + pulseIntensity * 0.5})`;
  } else {
    ctx.shadowBlur = 0;
  }

  // Offset dla linii rdzenia
  const dx = p.hip.x - p.neck.x;
  const dy = p.hip.y - p.neck.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / (len || 1);
  const ny = dx / (len || 1);
  const offsetDist = 12;
  const offX = nx * offsetDist;
  const offY = ny * offsetDist;

  ctx.beginPath();
  ctx.moveTo(p.head.x + offX, p.head.y + offY);
  ctx.lineTo(p.thoracic.x + offX, p.thoracic.y + offY);
  ctx.lineTo(p.lumbar.x + offX, p.lumbar.y + offY);
  ctx.lineTo(p.hip.x + offX, p.hip.y + offY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // --- NERW KULSZOWY (DODANE) ---

  ctx.save(); // Zapisz stan kontekstu, aby zmiany stylu (przerywana linia) nie wpłynęły na resztę

  ctx.beginPath();

  ctx.setLineDash([6, 8]); // Przerywana linia

  ctx.lineWidth = 4;

  ctx.shadowBlur = 0;

  // Kolor i styl nerwu

  if (currentTension > 50) {
    // Czerwony, napięty

    ctx.strokeStyle = `rgba(239, 68, 68, 0.8)`;

    if (currentTension > 60) {
      // Dodatkowy glow przy silnym napięciu

      ctx.shadowBlur = 10;

      ctx.shadowColor = `rgba(239, 68, 68, ${pulseIntensity})`;
    }

    // Prosta linia (napięta)

    ctx.moveTo(p.hip.x + offX, p.hip.y + offY);

    ctx.lineTo(p.knee.x + offX * 0.5, p.knee.y + offY * 0.5); // Lekki offset w kolanie

    ctx.lineTo(p.foot.x, p.foot.y);
  } else {
    // Zielony/Niebieski, luźny

    ctx.strokeStyle = `rgba(59, 130, 246, 0.6)`;

    // Krzywa Beziera (luźna linka)

    ctx.moveTo(p.hip.x + offX, p.hip.y + offY);

    // Oblicz punkt kontrolny dla krzywej (lekko na zewnątrz od kości)

    // Prosta symulacja "zwisu"

    const midX = (p.hip.x + p.knee.x) / 2;

    const midY = (p.hip.y + p.knee.y) / 2;

    const slackAmount = 30; // Siła zwisu

    // Rysuj luźną linię do kolana

    ctx.quadraticCurveTo(
      midX - 15,
      midY + 15,
      p.knee.x + offX * 0.5,
      p.knee.y + offY * 0.5
    );

    // Rysuj luźną linię do stopy

    const midX2 = (p.knee.x + p.foot.x) / 2;

    const midY2 = (p.knee.y + p.foot.y) / 2;

    ctx.quadraticCurveTo(midX2 - 10, midY2 + 10, p.foot.x, p.foot.y);
  }

  ctx.stroke();

  ctx.restore(); // Przywróć normalne rysowanie (ciągłe linie)

  // Zakotwiczenie
  ctx.fillStyle = isDark ? "#f8fafc" : "#0f172a"; // White or Dark anchor
  ctx.beginPath();
  ctx.arc(p.hip.x + offX, p.hip.y + offY, 6, 0, Math.PI * 2);
  ctx.fill();

  // Stawy
  ctx.fillStyle = isDark ? "#64748b" : "#cbd5e1";
  [p.neck, p.thoracic, p.lumbar, p.hip, p.knee].forEach((j) => {
    ctx.beginPath();
    ctx.arc(j.x, j.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Emit particles (Mediatory)
  if (currentTension > 40 && Math.random() < (currentTension - 40) / 400) {
    // Losowy punkt na krzywej rdzenia
    const t = Math.random();
    // Prosta interpolacja między odcinkami (uproszczona dla stickmana)
    const segments = [
      { p1: p.neck, p2: p.thoracic },
      { p1: p.thoracic, p2: p.lumbar },
      { p1: p.lumbar, p2: p.hip },
    ];
    const seg = segments[Math.floor(Math.random() * segments.length)];

    const px = lerp(seg.p1.x, seg.p2.x, t) + offX;
    const py = lerp(seg.p1.y, seg.p2.y, t) + offY;

    mediatorParticles.push({
      x: px,
      y: py,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      life: 1.0,
    });
  }

  updateAndDrawMediators();
  updateUI(currentTension >= 60);
};

function updateAndDrawMediators() {
  for (let i = mediatorParticles.length - 1; i >= 0; i--) {
    let p = mediatorParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;

    if (p.life <= 0) {
      mediatorParticles.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = p.life;
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

function updateUI(isDanger) {
  // Aktualizacja paska postępu i tekstu
  tensionBar.style.width = `${currentTension}%`;
  tensionValue.innerText = `${Math.round(currentTension)}%`;

  const trans = translations[currentLang];

  // --- POPRAWKA TUTAJ ---
  // Najpierw usuwamy WSZYSTKIE możliwe kolory, żeby mieć czystą kartę.
  // Dzięki temu przejście z Niebieskiego na Żółty usunie ten Niebieski.
  tensionBar.classList.remove(
    "bg-blue-500",
    "bg-yellow-500",
    "bg-red-600",
    "bg-green-500"
  );

  if (isDanger) {
    // Stan: ZAGROŻENIE (Czerwony) -> Powyżej 60%
    tensionBar.classList.add("bg-red-600");
    painStatus.innerHTML = `<div class="w-2 h-2 rounded-full bg-red-600 animate-ping"></div><span class="text-red-700 dark:text-red-400 font-bold">${trans.status_danger}</span>`;
  } else {
    if (currentTension <= 35) {
      // Stan: LUZ (Niebieski) -> Np. Tiptoes, Lying Bent
      tensionBar.classList.add("bg-blue-500");
      painStatus.innerHTML = `<div class="w-2 h-2 rounded-full bg-blue-500"></div><span class="text-blue-700 dark:text-blue-400 font-bold">${trans.status_baseline}</span>`;
    } else {
      // Stan: UMIARKOWANY (Żółty/Pomarańczowy) -> Np. Chair, Standing
      tensionBar.classList.add("bg-yellow-500");
      painStatus.innerHTML = `<div class="w-2 h-2 rounded-full bg-yellow-500"></div><span class="text-yellow-700 dark:text-yellow-400 font-bold">${trans.status_moderate}</span>`;
    }
  }
}

/* --- LOGIKA OCHRONIARZA (ANALOGIA) --- */
function setGuardMode(mode) {
  currentGuardMode = mode;
  const btnHealthy = document.getElementById("btn-healthy");
  const btnMcas = document.getElementById("btn-mcas");

  const guardContainer = document.getElementById("guard-icon-container");
  const guardIcon = document.getElementById("guard-icon");
  const guardSpeech = document.getElementById("guard-speech");
  const guardTitle = document.getElementById("guard-status-title");
  const guardDesc = document.getElementById("guard-status-desc");

  const rows = document.querySelectorAll(".visitor-row");
  const trans = translations[currentLang];

  // Reset stylów przycisków
  if (mode === "healthy") {
    btnHealthy.className =
      "px-6 py-2 rounded-lg text-sm font-bold transition-all bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shadow-sm";
    btnMcas.className =
      "px-6 py-2 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700 dark:text-slate-400";

    // Wygląd Ochroniarza: Zielony/Spokojny
    guardContainer.className =
      "w-32 h-32 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center border-4 border-green-200 dark:border-green-800 transition-all duration-500 relative z-0";
    guardIcon.innerHTML =
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="m9 12 2 2 4-4"></path>'; // Shield Check (ręcznie, bo lucide może nie odświeżyć wewnątrz innerHTML)
    guardIcon.className =
      "w-16 h-16 text-green-600 dark:text-green-400 transition-all duration-500";

    // Teksty
    guardSpeech.innerText = trans.guard_speech_healthy;
    guardTitle.innerText = trans.guard_title_healthy;
    guardTitle.className =
      "font-bold text-lg text-green-700 dark:text-green-400 transition-colors";
    guardDesc.innerText = trans.guard_desc_healthy;

    // Goście (Wchodzą spokojnie)
    rows.forEach((row) => {
      row.className =
        "visitor-row flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-all duration-300";
      const badge = row.querySelector(".status-badge");
      badge.className =
        "status-badge text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      badge.innerText = trans.status_pass;
    });
  } else {
    // MCAS MODE
    btnMcas.className =
      "px-6 py-2 rounded-lg text-sm font-bold transition-all bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shadow-sm";
    btnHealthy.className =
      "px-6 py-2 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700 dark:text-slate-400";

    // Wygląd Ochroniarza: Czerwony/Wściekły
    guardContainer.className =
      "w-32 h-32 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center border-4 border-red-500 dark:border-red-600 transition-all duration-500 relative z-0 shadow-lg shadow-red-500/20";
    // Ikonka Sirena/Alarm
    guardIcon.innerHTML =
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path>'; // Shield Alert
    guardIcon.className =
      "w-16 h-16 text-red-600 dark:text-red-500 transition-all duration-500 animate-pulse";

    // Teksty
    guardSpeech.innerText = trans.guard_speech_mcas;
    guardTitle.innerText = trans.guard_title_mcas;
    guardTitle.className =
      "font-bold text-lg text-red-600 dark:text-red-500 transition-colors";
    guardDesc.innerText = trans.guard_desc_mcas;

    // Goście (Są atakowani)
    rows.forEach((row, index) => {
      setTimeout(() => {
        row.className =
          "visitor-row flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-700 transition-all duration-300 transform scale-105";
        const badge = row.querySelector(".status-badge");
        badge.className =
          "status-badge text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
        badge.innerText = trans.status_attack;
      }, index * 100); // Kaskadowy efekt
    });
  }
  lucide.createIcons();
}

/* --- LOGIKA BATERII ME/CFS (Z SEVERITY) --- */

// Konfiguracja poziomów
const severityConfig = {
  mild: {
    startLevel: 70, // Startuje z 70%
    drainShower: 15, // Prysznic zabiera 15%
    drainShop: 40, // Zakupy zabierają 40%
    recoveryTime: { pl: "24h - 48h", en: "24h - 48h" },
  },
  moderate: {
    startLevel: 40,
    drainShower: 30,
    drainShop: 80, // Zakupy to crash
    recoveryTime: { pl: "Dni / Tygodnie", en: "Days / Weeks" },
  },
  severe: {
    startLevel: 15, // Startuje prawie pusty
    drainShower: 80, // Prysznic to natychmiastowy crash
    drainShop: 100, // Zakupy niemożliwe
    recoveryTime: { pl: "Tygodnie / Miesiące", en: "Weeks / Months" },
  },
};

let currentSeverity = "moderate"; // Domyślny
let batLevelHealthy = 95;
let batLevelMecfs = 40;
let isCrashed = false;

// Funkcja zmiany trybu (podpięta pod przyciski)
function setSeverity(level) {
  if (isCrashed) return; // Nie zmieniaj jak jest crash

  currentSeverity = level;
  const config = severityConfig[level];

  // Aktualizuj stan wewnętrzny
  batLevelMecfs = config.startLevel;

  // Aktualizuj UI Baterii
  const elMecfs = document.getElementById("bat-mecfs");
  elMecfs.style.height = `${batLevelMecfs}%`;

  // Aktualizuj tekst czasu regeneracji
  const recTimeEl = document.getElementById("mecfs-recovery-time");
  recTimeEl.innerText = config.recoveryTime[currentLang];

  // Aktualizuj style przycisków (aktywny/nieaktywny)
  ["mild", "moderate", "severe"].forEach((sev) => {
    const btn = document.getElementById(`btn-sev-${sev}`);
    if (sev === level) {
      btn.className =
        "flex-1 py-2 px-1 rounded text-[10px] sm:text-xs font-bold transition-all bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 shadow-sm ring-1 ring-purple-200 dark:ring-purple-700";
    } else {
      btn.className =
        "flex-1 py-2 px-1 rounded text-[10px] sm:text-xs font-bold transition-all text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800";
    }
  });

  // Reset komunikatu
  document.getElementById("battery-msg").innerHTML =
    translations[currentLang].lbl_select_act;
}

function drainBattery(actionType) {
  if (isCrashed) return;

  const elHealthy = document.getElementById("bat-healthy");
  const elMecfs = document.getElementById("bat-mecfs");
  const msg = document.getElementById("battery-msg");
  const trans = translations[currentLang];
  const config = severityConfig[currentSeverity];

  // Ustal koszt na podstawie aktywności i severity
  let drainMecfsVal = 0;
  let drainHealthyVal = 0;

  if (actionType === "shower") {
    drainHealthyVal = 5;
    drainMecfsVal = config.drainShower;
  } else if (actionType === "shop") {
    drainHealthyVal = 10;
    drainMecfsVal = config.drainShop;
  }

  // Odejmij energię
  batLevelHealthy -= drainHealthyVal;
  batLevelMecfs -= drainMecfsVal;

  if (batLevelHealthy < 0) batLevelHealthy = 0;
  if (batLevelMecfs < 0) batLevelMecfs = 0;

  // Animacja
  elHealthy.style.height = `${batLevelHealthy}%`;
  elMecfs.style.height = `${batLevelMecfs}%`;

  // Sprawdzenie stanu krytycznego (PEM)
  if (batLevelMecfs <= 5) {
    isCrashed = true;
    elMecfs.classList.remove("bg-red-500");
    elMecfs.classList.add("bg-slate-800", "animate-pulse");

    msg.innerHTML = `<span class="text-red-600 font-bold">${trans.msg_crash}</span>`;

    // RESET po 4 sek
    setTimeout(() => {
      batLevelHealthy = 95;
      batLevelMecfs = config.startLevel; // Wracamy do poziomu danego severity

      elHealthy.style.height = `${batLevelHealthy}%`;
      elMecfs.style.height = `${batLevelMecfs}%`;

      elMecfs.classList.remove("bg-slate-800", "animate-pulse");
      elMecfs.classList.add("bg-red-500");

      msg.innerHTML = trans.lbl_select_act;
      isCrashed = false;
    }, 4000);
  } else {
    msg.innerHTML = `<span class="text-slate-500">${trans.msg_ok}</span>`;
  }
}

// Inicjalizacja przy starcie
setSeverity("moderate");

animateStick();
initGranules();
setPose("chair");
