// --- READABILITY ENHANCEMENTS ---

// --- COLLAPSIBLE SECTIONS ---
function initCollapsibleSections() {
  const toggles = document.querySelectorAll(".collapsible-toggle");

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      const target = document.getElementById(targetId);

      if (target) {
        // Toggle collapsed class
        target.classList.toggle("collapsed");
        this.classList.toggle("collapsed");

        // Update button text
        const btnText = this.querySelector(".toggle-text");
        if (btnText) {
          btnText.textContent = target.classList.contains("collapsed")
            ? document.documentElement.lang === "pl"
              ? "Rozwiń"
              : "Expand"
            : document.documentElement.lang === "pl"
              ? "Zwiń"
              : "Collapse";
        }
      }
    });
  });
}

// --- READING PROGRESS BOOKMARK ---
function initReadingBookmark() {
  const sections = [
    "mechanizm",
    "tethered-cord-def",
    "cci-def",
    "mecfs-def",
    "connection",
    "objawy",
  ];
  // Track reading progress
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          localStorage.setItem("lastReadSection", entry.target.id);
        }
      });
    },
    { threshold: 0.5 },
  );

  sections.forEach((id) => {
    const element = document.getElementById(id);
    if (element) observer.observe(element);
  });
}

// --- READING TIME ESTIMATE ---
function calculateReadingTime() {
  const contentSections = document.querySelectorAll(".content-section");
  let totalWords = 0;

  contentSections.forEach((section) => {
    const text = section.textContent || section.innerText;
    totalWords += text.trim().split(/\s+/).length;
  });

  const wordsPerMinute = 200;
  const readingTime = Math.ceil(totalWords / wordsPerMinute);

  return readingTime;
}

function displayReadingTime() {
  const readingTime = calculateReadingTime();
  const badge = document.getElementById("reading-time-badge");

  if (badge) {
    const text =
      document.documentElement.lang === "pl"
        ? `Czas czytania: ~${readingTime} min`
        : `Reading time: ~${readingTime} min`;
    badge.textContent = text;
  }
}

// --- TOOLTIPS FOR MEDICAL TERMS ---
function initTooltips() {
  const terms = document.querySelectorAll(".tooltip-term");

  terms.forEach((term) => {
    // Ensure tooltip content exists
    if (!term.querySelector(".tooltip-content")) {
      const tooltip = document.createElement("span");
      tooltip.className = "tooltip-content";
      tooltip.textContent = term.getAttribute("data-tooltip") || "";
      term.appendChild(tooltip);
    }
  });
}

// Initialize all readability features
document.addEventListener("DOMContentLoaded", function () {
  initCollapsibleSections();
  initReadingBookmark();
  displayReadingTime();
  initTooltips();
});
