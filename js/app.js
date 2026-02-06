// Initialize theme
/**
 * Initializes the theme based on local storage or system preference.
 * Sets the correct icon for the theme button.
 */
function initTheme() {
    const isDark = localStorage.theme === "dark" || (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const icon = isDark ? '<i data-lucide="sun" class="w-4 h-4"></i>' : '<i data-lucide="moon" class="w-4 h-4"></i>';
    
    // Note: document classList is also toggled inline in HTML to prevent FOUC.
    // This function ensures the button icon is correct.
    if (isDark) {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }
    
    const btn = document.getElementById("themeBtn");
    if (btn) btn.innerHTML = icon;
    
    const btnMobile = document.getElementById("themeBtnMobile");
    if (btnMobile) btnMobile.innerHTML = icon;
}
initTheme();
lucide.createIcons();

/**
 * Toggles the theme between dark and light mode.
 * Updates local storage and refreshes icons.
 */
function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  const newTheme = isDark ? "light" : "dark";
  
  if (isDark) {
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
  }
  localStorage.theme = newTheme;
  
  const icon = newTheme === "dark" ? '<i data-lucide="sun" class="w-4 h-4"></i>' : '<i data-lucide="moon" class="w-4 h-4"></i>';
  
  const btn = document.getElementById("themeBtn");
  if (btn) btn.innerHTML = icon;
  
  const btnMobile = document.getElementById("themeBtnMobile");
  if (btnMobile) btnMobile.innerHTML = icon;
  
  lucide.createIcons();
}

var currentLang;

// Detect language from URL path structure
const currentPath = window.location.pathname;
if (currentPath.includes('/en/')) {
    // English subdirectory
    currentLang = 'en';
    localStorage.setItem("lang", 'en');
} else {
    // Polish root directory (default)
    currentLang = 'pl';
    localStorage.setItem("lang", 'pl');
}

let currentGuardMode = "healthy"; // Przechowuje stan ochroniarza

// Apply initial language settings immediately
document.documentElement.lang = currentLang;
const langBtn = document.getElementById("langBtn");
if (langBtn) {
    langBtn.innerText = currentLang.toUpperCase();
}
const langBtnMobile = document.getElementById("langBtnMobile");
if (langBtnMobile) {
    langBtnMobile.innerText = currentLang.toUpperCase();
}

// Apply translations when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    updateLanguageUI();
    
    // Mobile Menu Logic
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileBackdrop = document.getElementById('mobile-backdrop');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            if (mobileBackdrop) {
                mobileBackdrop.classList.toggle('hidden');
            }
            // Dismiss settings hint when mobile menu is opened
            if (window.dismissSettingsHint) {
                window.dismissSettingsHint();
            }
        });
    }

    if (mobileBackdrop) {
        mobileBackdrop.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            mobileBackdrop.classList.add('hidden');
        });
    }

    // Check for settings hint
    checkSettingsHint();
});

function checkSettingsHint() {
    const hint = document.getElementById('settings-hint');
    if (!hint) return;

    const hasSeenHint = localStorage.getItem('settings_hint_seen');
    if (!hasSeenHint) {
        // Show hint after a short delay
        setTimeout(() => {
            hint.classList.remove('hidden');
            // Trigger reflow
            void hint.offsetWidth;
            hint.classList.remove('opacity-0', 'translate-y-2');
            lucide.createIcons();
        }, 1500);
    }
}

window.dismissSettingsHint = function() {
    const hint = document.getElementById('settings-hint');
    if (hint) {
        hint.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => {
            hint.classList.add('hidden');
        }, 500);
    }
    localStorage.setItem('settings_hint_seen', 'true');
};

function updateLanguageUI() {
  // 1. Update statycznych tekstów (data-i18n)
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[currentLang] && translations[currentLang][key]) {
      el.innerHTML = translations[currentLang][key];
    }
  });

  // 2. Update placeholderów
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[currentLang] && translations[currentLang][key]) {
      el.placeholder = translations[currentLang][key];
    }
  });

  // 2a. Update aria-label
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria-label");
    if (translations[currentLang] && translations[currentLang][key]) {
      el.setAttribute("aria-label", translations[currentLang][key]);
    }
  });

  // 3. Internal links already use relative paths within each language directory
  // No modification needed since we use subdirectory structure

  // 4. Update opisów w symulacji kręgosłupa
  if (typeof updatePoseDescriptions === 'function' && document.getElementById("poseDesc")) {
      updatePoseDescriptions();
  }

  // 4. Update pasków w monitorze
  if (typeof updateUI === 'function' && typeof currentTension !== 'undefined' && document.getElementById("tensionBar")) {
      updateUI(currentTension >= 60);
  }

  // 5. NAPRAWA: Wymuś odświeżenie tekstów w sekcji Ochroniarza
  if (typeof setGuardMode === 'function' && document.getElementById("guard-icon-container")) {
      setGuardMode(currentGuardMode);
  }

  if (typeof setSeverity === 'function' && typeof currentSeverity !== 'undefined' && document.getElementById("bat-mecfs")) {
      setSeverity(currentSeverity);
  }

  // 6. Update SEO Meta Tags
  updateSEO();

  // 7. Load Blog Post if on article page
  if (document.getElementById("post-content")) {
      loadBlogPost();
  }
  
  // 8. Load Blog Index if on blog page
  if (document.getElementById("blog-grid")) {
      loadBlogIndex();
  }
}

/**
 * Updates SEO meta tags dynamically.
 * Note: Since we have static HTML files for languages, this might be redundant for static serving,
 * but useful if switching content dynamically or ensuring consistency.
 */
function updateSEO() {
    if (!translations[currentLang]) return;
    
    const t = translations[currentLang];
    const path = window.location.pathname;
    // Determine page prefix for translation keys
    let pagePrefix = 'seo_index'; // Default

    if (path.includes('diagnostics.html')) pagePrefix = 'seo_diagnostics';
    else if (path.includes('tools.html')) pagePrefix = 'seo_tools';
    else if (path.includes('contact.html')) pagePrefix = 'seo_contact';
    else if (path.includes('treatment.html')) pagePrefix = 'seo_treatment';
    
    // Update Title
    if (t[pagePrefix + '_title']) {
        document.title = t[pagePrefix + '_title'];
        setMeta('og:title', t[pagePrefix + '_title']);
        setMeta('twitter:title', t[pagePrefix + '_title']);
    }

    // Update Description
    if (t[pagePrefix + '_desc']) {
        setMeta('description', t[pagePrefix + '_desc'], 'name');
        setMeta('og:description', t[pagePrefix + '_desc']);
        setMeta('twitter:description', t[pagePrefix + '_desc']);
    }

    // Update Keywords
    if (t.seo_keywords) {
        setMeta('keywords', t.seo_keywords, 'name');
    }

    // Update Canonical & Hreflang
    updateRelTags();
}

/**
 * Updates canonical and hreflang tags based on current language and path.
 * Correctly handles directory-based structure (/ vs /en/).
 */
function updateRelTags() {
    const origin = window.location.origin;
    const path = window.location.pathname;
    
    // Determine the "base" path name (relative path without language prefix)
    let basePathName = path;
    if (path.includes('/en/')) {
        basePathName = path.replace('/en/', '/');
    }
    // Ensure it starts with / if it's not empty, otherwise default to /index.html logic handled nicely? 
    // Actually, browsers return pathname with leading slash.
    
    // Handle root case if needed, though usually browser gives / or /index.html
    
    // Construct URLs
    // Note: If basePathName is just "/", urlPL matches root.
    const urlPL = origin + (basePathName.startsWith('/') ? '' : '/') + basePathName;
    const urlEN = origin + '/en' + (basePathName.startsWith('/') ? '' : '/') + basePathName;
    
    // 1. Canonical
    // Should point to current page
    const currentCanonical = currentLang === 'en' ? urlEN : urlPL;
    
    let linkCanon = document.querySelector('link[rel="canonical"]');
    if (!linkCanon) {
        linkCanon = document.createElement('link');
        linkCanon.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanon);
    }
    linkCanon.setAttribute('href', currentCanonical);

    // 2. Hreflang Tags
    const langs = {
        'pl': urlPL,
        'en': urlEN,
        'x-default': urlPL // Polish is default
    };

    Object.keys(langs).forEach(langCode => {
        let linkHref = document.querySelector(`link[rel="alternate"][hreflang="${langCode}"]`);
        if (!linkHref) {
            linkHref = document.createElement('link');
            linkHref.setAttribute('rel', 'alternate');
            linkHref.setAttribute('hreflang', langCode);
            document.head.appendChild(linkHref);
        }
        linkHref.setAttribute('href', langs[langCode]);
    });
}

/**
 * Helper to update or create a meta tag.
 * @param {string} nameOrProperty - The name or property attribute value.
 * @param {string} content - The content attribute value.
 * @param {string} [attr='property'] - The attribute name to use for lookup (e.g., 'name' or 'property').
 */
function setMeta(nameOrProperty, content, attr = 'property') {
    let element = document.querySelector(`meta[${attr}="${nameOrProperty}"]`);
    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, nameOrProperty);
        document.head.appendChild(element);
    }
    element.setAttribute('content', content);
}

/**
 * Toggles language between PL and EN and redirects to the appropriate directory.
 */
function toggleLang() {
  const newLang = currentLang === "pl" ? "en" : "pl";
  localStorage.setItem("lang", newLang);
  
  // Redirect to appropriate directory structure
  const currentPath = window.location.pathname;
  let fileName = currentPath.split('/').pop() || 'index.html';
  
  // Clean filename if getting messy query params
  if (fileName.includes('?')) fileName = fileName.split('?')[0];

  let newPath;
  if (newLang === "en") {
    // Switch to English: Must be in /en/ folder
    if (currentPath.includes('/en/')) {
      newPath = currentPath; // Already correct
    } else {
      newPath = '/en/' + fileName;
    }
  } else {
    // Switch to Polish: Must be in root folder
    if (currentPath.includes('/en/')) {
      newPath = '/' + fileName;
    } else {
      newPath = currentPath; // Already correct
    }
  }
  
  // Navigate to new path
  window.location.href = newPath + window.location.search;
}

// --- ANIMACJA MCAS (GÓRA) ---
const mastCell = document.getElementById("mastCell");
const shockwave = document.getElementById("shockwave");
const reactionLabel = document.getElementById("reactionLabel");
const scene = document.getElementById("scene");
let isExploded = false;

function initGranules() {
  if (!mastCell || !scene) return;
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
  if (isExploded || !scene || !reactionLabel || !mastCell) return;
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

// --- BLOG LOGIC ---
async function loadBlogIndex() {
    const grid = document.getElementById('blog-grid');
    if (!grid) return;

    // Determine language source path
    const jsonPath = window.location.pathname.includes('/en/') ? 'posts/en/index.json' : 'posts/pl/index.json';
    const basePath = window.location.pathname.includes('/en/') ? '' : ''; // Relative paths are tricky if root vs subdir
    // Actually, if we are in /blog.html, pl json is posts/pl/index.json.
    // If we are in /en/blog.html, en json is posts/en/index.json (since we are in /en/ folder? No, js is shared?)
    // Wait, js is shared in /js/app.js.
    // So if URL is /blog.html (root), fetch 'posts/pl/index.json'.
    // If URL is /en/blog.html, fetch '../posts/en/index.json' relative to js? No, relative to page.
    // Relative to page /en/blog.html: 'posts/en/index.json' would be /en/posts/en/index.json (WRONG).
    // Correct relative path from /en/blog.html to /posts/en/index.json is: '../posts/en/index.json'
    
    let fetchPath;
    if (window.location.pathname.includes('/en/')) {
        fetchPath = '../posts/en/index.json';
    } else {
        fetchPath = 'posts/pl/index.json';
    }

    try {
        const response = await fetch(fetchPath);
        if (!response.ok) throw new Error('Failed to load posts index');
        const posts = await response.json();

        grid.innerHTML = ''; // Clear loading spinner

        posts.forEach(post => {
            const articleCard = document.createElement('article');
            articleCard.className = "bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-800 flex flex-col h-full";
            
            // Image handling (add prefix if in /en/)
            let imgPath = post.image;
            if (window.location.pathname.includes('/en/') && !imgPath.startsWith('http')) {
                imgPath = '../' + imgPath;
            }

            // Tags HTML
            const tagsHtml = post.tags.map(tag => 
                `<span class="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-md uppercase tracking-wide">${tag}</span>`
            ).join('');

            articleCard.innerHTML = `
                <a href="article.html?id=${post.id}" class="block aspect-video overflow-hidden">
                    <img src="${imgPath}" alt="${post.title}" class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500">
                </a>
                <div class="p-6 flex flex-col flex-grow">
                    <div class="flex gap-2 mb-4">
                        ${tagsHtml}
                    </div>
                    <a href="article.html?id=${post.id}" class="group">
                        <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                            ${post.title}
                        </h2>
                    </a>
                    <p class="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-3 flex-grow">
                        ${post.desc}
                    </p>
                    <div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                        <span class="text-xs text-slate-500 font-medium">${formatDateNumeric(post.date)}</span>
                        <a href="article.html?id=${post.id}" class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                            ${currentLang === 'pl' ? 'Czytaj dalej' : 'Read more'} <i data-lucide="arrow-right" class="w-4 h-4"></i>
                        </a>
                    </div>
                </div>
            `;
            grid.appendChild(articleCard);
        });

        // Initialize icons for new elements
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

    } catch (error) {
        console.error(error);
        grid.innerHTML = `<div class="col-span-full text-center text-red-500">
            <p>Nie udało się załadować listy artykułów.</p>
            <p class="text-xs mt-2 opacity-70">${error.message}</p>
        </div>`;
    }
}


// --- STICKMAN SYMULATOR (LINIOWY) ---
const simCanvas = document.getElementById("simCanvas");
const ctx = simCanvas ? simCanvas.getContext("2d") : null;
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
  if (stickPoses[currentPoseKey] && poseDesc) {
    poseDesc.innerText = stickPoses[currentPoseKey].desc[currentLang];
  }
}

window.setPose = function (poseName) {
  if (!poseDesc) return;
  
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






function animateStick() {
  if (!ctx) return;
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
  if (!tensionBar || !tensionValue || !painStatus) return;

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

  if (!btnHealthy || !btnMcas || !guardContainer || !guardIcon || !guardSpeech || !guardTitle || !guardDesc) return;

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
  very_severe: {
    startLevel: 5,
    drainShower: 100,
    drainShop: 100,
    recoveryTime: { pl: "Miesiące / Lata", en: "Months / Years" },
  },
};

let currentSeverity = "moderate"; // Domyślny
let batLevelHealthy = 95;
let batLevelMecfs = 40;
let isCrashed = false;

// Funkcja zmiany trybu (podpięta pod przyciski)
function setSeverity(level) {
  if (isCrashed) return; // Nie zmieniaj jak jest crash

  const elMecfs = document.getElementById("bat-mecfs");
  if (!elMecfs) return;

  currentSeverity = level;
  const config = severityConfig[level];

  // Aktualizuj stan wewnętrzny
  batLevelMecfs = config.startLevel;

  // Aktualizuj UI Baterii
  elMecfs.style.height = `${batLevelMecfs}%`;

  // Aktualizuj tekst czasu regeneracji
  const recTimeEl = document.getElementById("mecfs-recovery-time");
  if (recTimeEl) recTimeEl.innerText = config.recoveryTime[currentLang];

  // Aktualizuj style przycisków (aktywny/nieaktywny)
  ["mild", "moderate", "severe", "very_severe"].forEach((sev) => {
    const btn = document.getElementById(`btn-sev-${sev.replace('_', '-')}`);
    if (btn) {
      if (sev === level) {
        btn.className =
          "flex-1 py-2 px-1 rounded text-[10px] sm:text-xs font-bold transition-all bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 shadow-sm ring-1 ring-purple-200 dark:ring-purple-700";
      } else {
        btn.className =
          "flex-1 py-2 px-1 rounded text-[10px] sm:text-xs font-bold transition-all text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800";
      }
    }
  });

  // Reset komunikatu
  const msg = document.getElementById("battery-msg");
  if (msg) msg.innerHTML = translations[currentLang].lbl_select_act;
}

function drainBattery(actionType) {
  if (isCrashed) return;

  const elHealthy = document.getElementById("bat-healthy");
  const elMecfs = document.getElementById("bat-mecfs");
  const msg = document.getElementById("battery-msg");
  
  if (!elHealthy || !elMecfs || !msg) return;

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
if (document.getElementById("bat-mecfs")) {
  setSeverity("moderate");
}

if (typeof animateStick === 'function') animateStick();
if (typeof initGranules === 'function') initGranules();
if (typeof setPose === 'function') setPose("chair");

// Back to Top Button Logic
const btnBackToTop = document.getElementById("btn-back-to-top");

if (btnBackToTop) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      btnBackToTop.classList.remove("opacity-0", "translate-y-10", "pointer-events-none");
    } else {
      btnBackToTop.classList.add("opacity-0", "translate-y-10", "pointer-events-none");
    }
  });

  btnBackToTop.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

// Bottom Navigation Logic (Scroll Spy & Progress)
const navItems = document.querySelectorAll(".nav-item");
const sections = [
  "mechanizm",
  "tethered-cord-def",
  "cci-def",
  "mecfs-def",
  "connection",
  "objawy",
  "diet-assistant",
  "bibliografia",
];
const progressBar = document.getElementById("scroll-progress-bar");

function updateActiveNav() {
  let currentSection = "";

  // 1. Determine current section
  sections.forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      const rect = section.getBoundingClientRect();
      // If section top is within the upper half of the viewport
      if (rect.top <= window.innerHeight / 2) {
        currentSection = sectionId;
      }
    }
  });

  // 2. Update Nav Items & Find Active Item
  let activeItem = null;
  navItems.forEach((item) => {
    item.classList.remove("text-indigo-600", "dark:text-indigo-400");
    item.classList.add("text-slate-500");
    
    if (item.getAttribute("data-target") === currentSection) {
      item.classList.remove("text-slate-500");
      item.classList.add("text-indigo-600", "dark:text-indigo-400");
      activeItem = item;
    }
  });

  // 3. Update Progress Bar (Snap to Active Section)
  if (progressBar) {
    if (activeItem) {
      const navEl = document.getElementById("bottom-nav");
      if (navEl) {
        const navRect = navEl.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        // Calculate width to reach the center of the active item
        const width = (itemRect.left - navRect.left) + (itemRect.width / 2);
        progressBar.style.width = `${width}px`;
      }
    } else {
      progressBar.style.width = "0px";
    }
  }
}

window.addEventListener("scroll", updateActiveNav);
// Update on horizontal scroll of the nav container as well
const navContainer = document.querySelector("#bottom-nav .overflow-x-auto");
if (navContainer) {
  navContainer.addEventListener("scroll", updateActiveNav);
}
// Initial call
updateActiveNav();

// --- FADE IN ON SCROLL ---
// Add class to body to indicate JS is ready for animations
document.body.classList.add('js-loaded');

const observerOptions = {
  root: null,
  rootMargin: '0px 0px -100px 0px', // Element musi wejść 100px w głąb ekranu
  threshold: 0.05
};

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target); // Stop observing once visible
    }
  });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.fade-in-section').forEach(section => {
        observer.observe(section);
    });
});

// Simulation Modal Logic
window.openSimModal = function() {
    const modal = document.getElementById('sim-modal');
    const backdrop = document.getElementById('sim-modal-backdrop');
    const panel = document.getElementById('sim-modal-panel');
    
    if (!modal) return;
    
    modal.classList.remove('hidden');
    
    // Small delay to allow display:block to apply before transition
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
    }, 10);
    
    // Ensure canvas is sized correctly
    if (window.drawStickman) {
        window.drawStickman();
    }
};

window.closeSimModal = function() {
    const modal = document.getElementById('sim-modal');
    const backdrop = document.getElementById('sim-modal-backdrop');
    const panel = document.getElementById('sim-modal-panel');
    
    if (!modal) return;
    
    backdrop.classList.add('opacity-0');
    panel.classList.add('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300); // Match transition duration
};

// Close modal on backdrop click
document.getElementById('sim-modal-backdrop')?.addEventListener('click', window.closeSimModal);

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('sim-modal');
        if (modal && !modal.classList.contains('hidden')) {
            window.closeSimModal();
        }
    }
});

// --- Beighton Score Logic ---
function initBeightonScore() {
    const checkboxes = document.querySelectorAll('.beighton-check');
    const scoreDisplay = document.getElementById('beighton-score-display');
    const resultText = document.getElementById('beighton-result-text');

    if (!checkboxes.length || !scoreDisplay) return;

    function updateScore() {
        let score = 0;
        checkboxes.forEach(cb => {
            if (cb.checked) score += parseInt(cb.value);
        });

        scoreDisplay.textContent = `${score} / 9`;

        // Interpretation
        if (score >= 5) {
            resultText.textContent = translations[currentLang]?.beighton_result_high || "Wynik wysoki (Sugeruje hipermobilność / hEDS)";
            resultText.className = "text-lg font-bold text-red-600 dark:text-red-400 mb-2";
        } else {
            resultText.textContent = translations[currentLang]?.beighton_result_low || "Wynik niski (Prawdopodobnie brak uogólnionej hipermobilności)";
            resultText.className = "text-lg font-medium text-slate-700 dark:text-slate-300 mb-2";
        }
    }

    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateScore);
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initBeightonScore);

/**
 * Formats date string (YYYY-MM-DD) taking user's locale into account
 * but respecting the site's current language context.
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, monthIndex, day);

    // Determine locale to use
    let locale = 'en-US'; // Default fallback
    
    if (typeof currentLang !== 'undefined' && currentLang === 'pl') {
        locale = 'pl-PL';
    } else {
        // For English version, try to respect user's English preference (US vs UK)
        // If user's browser is e.g. 'en-GB', use that.
        // If user's browser is non-English (e.g. de-DE) but they view English site, default to en-US.
        if (navigator.language && navigator.language.startsWith('en')) {
            locale = navigator.language;
        }
    }

    return date.toLocaleDateString(locale, { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
}

/**
 * Formats date to numeric short format respecting locale.
 */
function formatDateNumeric(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, monthIndex, day);

    // Determine locale to use
    let locale = 'en-US'; // Default fallback (MM/DD/YYYY)
    
    if (typeof currentLang !== 'undefined' && currentLang === 'pl') {
        locale = 'pl-PL'; // DD.MM.YYYY
    } else {
        if (navigator.language && navigator.language.startsWith('en')) {
            locale = navigator.language;
        }
    }

    return date.toLocaleDateString(locale); // Default is usually numeric
}

/**
 * Loads a markdown blog post into the article page.
 */
async function loadBlogPost() {
    const postContainer = document.getElementById('post-content');
    if (!postContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
        postContainer.innerHTML = `<div class="text-center py-10 text-slate-500">
            <h3 class="text-xl font-bold mb-2">No article selected / Wybierz artykuł</h3>
        </div>`;
        return;
    }

    // Paths
    const isEn = window.location.pathname.includes('/en/');
    const basePath = isEn ? '../' : ''; 
    const mdPath = `${basePath}posts/${currentLang}/${postId}.md`;
    // JSON path logic same as loadBlogIndex but for single post lookup
    // Assuming structure: posts/pl/index.json
    const jsonPath = isEn ? '../posts/en/index.json' : 'posts/pl/index.json';

    try {
        // Fetch both MD and Metadata in parallel
        const [mdRes, jsonRes] = await Promise.all([
            fetch(mdPath),
            fetch(jsonPath)
        ]);

        if (!mdRes.ok) throw new Error(mdRes.status === 404 ? "Article not found" : `Error ${mdRes.status}`);
        let text = await mdRes.text();
        
        let metadata = null;
        if (jsonRes.ok) {
            const posts = await jsonRes.json();
            metadata = posts.find(p => p.id === postId);
        }

        // Construct Header HTML from Metadata
        let headerHtml = '';
        if (metadata) {
            // Remove title/date from markdown text if they exist heavily at the top to avoid duplication
            // Simple heuristic: if markdown starts with # Title, remove it.
            // This is optional but nice for backward compatibility if user used new_post.py before.
            const titleLine = `# ${metadata.title}`;
            if (text.startsWith(titleLine)) {
                 text = text.substring(titleLine.length).trim();
            }
            // Try to remove date if it's on the next line? 
            // It's risky to modify text content blindly.
            // Let's just trust the user or the new render.
            
            // Image handling
            let imgPath = metadata.image;
            if (isEn && !imgPath.startsWith('http') && !imgPath.startsWith('../')) {
                imgPath = '../' + imgPath;
            }

            const tagsHtml = (metadata.tags || []).map(tag => 
                `<span class="inline-block px-3 py-1 mb-4 mr-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-slate-900 rounded-full text-xs font-bold uppercase tracking-wide">${tag}</span>`
            ).join('');

            headerHtml = `
                <header class="mb-10 text-center border-b border-slate-200 dark:border-slate-800 pb-10">
                    <div class="mb-6 flex flex-wrap justify-center gap-2">
                        ${tagsHtml}
                    </div>
                    <h1 class="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
                        ${metadata.title}
                    </h1>
                    <div class="flex items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                        <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-4 h-4"></i> ${formatDate(metadata.date)}</span>
                    </div>
                </header>
                ${imgPath ? `
                <div class="mb-12 rounded-2xl overflow-hidden shadow-lg aspect-video w-full">
                    <img src="${imgPath}" alt="${metadata.title}" class="w-full h-full object-cover">
                </div>
                ` : ''}
            `;
        }

        if (typeof marked !== 'undefined') {
             // Combine Header + Markdown Content
             // Enable breaks: true to interpret single newlines as <br>
             postContainer.innerHTML = headerHtml + marked.parse(text, { breaks: true });
             if (typeof lucide !== 'undefined') lucide.createIcons();
        } else {
             postContainer.innerHTML = "<div class='text-red-500'>Error: marked.js not loaded</div>";
        }

    } catch (error) {
        console.error("Error loading post:", error);
        postContainer.innerHTML = `<div class="p-4 text-red-500">Error loading post: ${error.message}</div>`;
    }
}

