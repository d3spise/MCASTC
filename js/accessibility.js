class AccessibilityManager {
    constructor() {
        this.panel = document.getElementById('accessibility-panel');
        this.toggleBtn = document.getElementById('a11yBtn');
        this.toggleBtnMobile = document.getElementById('a11yBtnMobile');
        this.root = document.documentElement;
        
        const savedState = localStorage.getItem('accessibilityState');
        this.state = savedState ? JSON.parse(savedState) : {
            highContrast: false,
            largeFont: false,
            dyslexiaFont: false
        };

        this.init();
    }

    init() {
        // Toggle Panel
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePanel();
            });
        }
        
        if (this.toggleBtnMobile) {
            this.toggleBtnMobile.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePanel();
            });
        }

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (this.panel.classList.contains('is-open') && 
                !this.panel.contains(e.target) && 
                e.target !== this.toggleBtn &&
                e.target !== this.toggleBtnMobile) {
                this.closePanel();
            }
        });

        // Initialize buttons
        document.getElementById('btn-contrast').addEventListener('click', () => this.toggleFeature('highContrast', 'high-contrast'));
        document.getElementById('btn-font').addEventListener('click', () => this.toggleFeature('largeFont', 'large-font'));
        document.getElementById('btn-dyslexia').addEventListener('click', () => this.toggleFeature('dyslexiaFont', 'dyslexia-font'));
        document.getElementById('btn-reset-a11y').addEventListener('click', () => this.resetAll());

        this.applySavedState();
    }

    togglePanel() {
        this.panel.classList.toggle('is-open');
        const isOpen = this.panel.classList.contains('is-open');
        this.toggleBtn.setAttribute('aria-expanded', isOpen);
    }

    closePanel() {
        this.panel.classList.remove('is-open');
        this.toggleBtn.setAttribute('aria-expanded', 'false');
    }

    toggleFeature(stateKey, className) {
        this.state[stateKey] = !this.state[stateKey];
        this.saveState();
        
        if (this.state[stateKey]) {
            this.root.classList.add(className);
            document.getElementById(`btn-${stateKey === 'highContrast' ? 'contrast' : stateKey === 'largeFont' ? 'font' : 'dyslexia'}`).classList.add('active');

            // Force Dark Mode when High Contrast is enabled
            if (stateKey === 'highContrast') {
                if (!this.root.classList.contains('dark')) {
                    this.root.classList.add('dark');
                    localStorage.theme = "dark";
                    const themeBtn = document.getElementById("themeBtn");
                    if (themeBtn) {
                        themeBtn.innerHTML = '<i data-lucide="sun" class="w-4 h-4"></i>';
                        if (window.lucide) window.lucide.createIcons();
                    }
                }
            }
        } else {
            this.root.classList.remove(className);
            document.getElementById(`btn-${stateKey === 'highContrast' ? 'contrast' : stateKey === 'largeFont' ? 'font' : 'dyslexia'}`).classList.remove('active');
        }
    }

    resetAll() {
        this.state = {
            highContrast: false,
            largeFont: false,
            dyslexiaFont: false
        };
        
        this.root.classList.remove('high-contrast', 'large-font', 'dyslexia-font');
        
        document.querySelectorAll('.a11y-btn').forEach(btn => btn.classList.remove('active'));
        this.saveState();
    }

    saveState() {
        localStorage.setItem('accessibilityState', JSON.stringify(this.state));
    }

    applySavedState() {
        if (this.state.highContrast) {
            this.root.classList.add('high-contrast');
            document.getElementById('btn-contrast').classList.add('active');
            
            if (!this.root.classList.contains('dark')) {
                this.root.classList.add('dark');
                localStorage.theme = "dark";
                const themeBtn = document.getElementById("themeBtn");
                if (themeBtn) {
                    themeBtn.innerHTML = '<i data-lucide="sun" class="w-4 h-4"></i>';
                    if (window.lucide) window.lucide.createIcons();
                }
            }
        }
        
        if (this.state.largeFont) {
            this.root.classList.add('large-font');
            document.getElementById('btn-font').classList.add('active');
        }
        
        if (this.state.dyslexiaFont) {
            this.root.classList.add('dyslexia-font');
            document.getElementById('btn-dyslexia').classList.add('active');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AccessibilityManager();
});
