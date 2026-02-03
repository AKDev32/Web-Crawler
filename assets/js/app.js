// WebCrawler4J - Main Application

/**
 * Application class
 * Initializes and manages the application lifecycle
 */
class App {
    constructor() {
        this.version = '1.0.0';
        this.initialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) return;

        console.log(`WebCrawler4J v${this.version} - Initializing...`);

        try {
            // Initialize storage
            await storage.init();
            console.log('✓ Storage initialized');

            // Load configuration
            await config.loadConfig();
            console.log('✓ Configuration loaded');

            // Initialize UI
            ui.init();
            console.log('✓ UI initialized');

            this.initialized = true;
            console.log('✓ Application ready');

            // Show welcome message for first-time users
            await this.checkFirstRun();
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Initialization failed. Please refresh the page.');
        }
    }

    /**
     * Check if this is the first run
     */
    async checkFirstRun() {
        const hasRun = await storage.getSetting('hasRun');
        
        if (!hasRun) {
            ui.showToast(
                'Welcome to WebCrawler4J!',
                'Start your first crawl by clicking "New Crawl" above',
                'info'
            );
            await storage.saveSetting('hasRun', true);
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-elevated);
            border: 1px solid var(--error);
            border-radius: var(--radius-lg);
            padding: var(--space-2xl);
            max-width: 400px;
            text-align: center;
            z-index: 9999;
        `;
        errorDiv.innerHTML = `
            <h2 style="color: var(--error); margin-bottom: 1rem;">Error</h2>
            <p>${message}</p>
        `;
        document.body.appendChild(errorDiv);
    }

    /**
     * Handle service worker registration (future feature)
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    /**
     * Get application info
     * @returns {Object} Application info
     */
    getInfo() {
        return {
            name: 'WebCrawler4J',
            version: this.version,
            description: 'A powerful web crawler built with modern web technologies',
            author: 'WebCrawler4J Team',
            license: 'Apache-2.0'
        };
    }
}

// Create application instance
const app = new App();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Refresh dashboard when page becomes visible
        if (ui.currentView === 'dashboard') {
            ui.loadDashboard();
        }
    }
});

// Handle window beforeunload
window.addEventListener('beforeunload', (e) => {
    if (ui.activeCrawler && ui.activeCrawler.isRunning) {
        e.preventDefault();
        e.returnValue = 'A crawl is currently in progress. Are you sure you want to leave?';
        return e.returnValue;
    }
});

// Expose app to console for debugging
window.webcrawler4j = {
    app,
    storage,
    config,
    ui,
    utils: Utils,
    version: app.version
};

console.log('%cWebCrawler4J', 'font-size: 24px; font-weight: bold; color: #2dd4bf;');
console.log('%cA professional web crawling tool', 'font-size: 14px; color: #94a3b8;');
console.log('%cAccess via: window.webcrawler4j', 'font-size: 12px; color: #64748b;');