// WebCrawler4J - UI Controller

/**
 * UI Controller
 * Manages all user interface interactions and updates
 */
class UIController {
    constructor() {
        this.currentView = 'dashboard';
        this.activeCrawler = null;
        this.updateInterval = null;
    }

    /**
     * Initialize UI
     */
    init() {
        this.setupEventListeners();
        this.loadDashboard();
        this.applyTheme();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(btn.dataset.view);
            });
        });

        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle');
        themeToggle?.addEventListener('click', () => this.toggleTheme());

        // Crawler form
        const crawlerForm = document.getElementById('crawler-form');
        crawlerForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.startCrawl(new FormData(crawlerForm));
        });

        // Reset form
        const resetBtn = document.getElementById('reset-form');
        resetBtn?.addEventListener('click', () => crawlerForm?.reset());

        // Stop crawler
        const stopBtn = document.getElementById('stop-crawler');
        stopBtn?.addEventListener('click', () => this.stopCrawl());

        // History search
        const historySearch = document.getElementById('history-search');
        historySearch?.addEventListener('input', Utils.debounce((e) => {
            this.filterHistory(e.target.value);
        }, 300));

        // Clear history
        const clearHistoryBtn = document.getElementById('clear-history');
        clearHistoryBtn?.addEventListener('click', () => this.clearHistory());

        // Settings
        const themeSelect = document.getElementById('theme-select');
        themeSelect?.addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });

        // Clear all data
        const clearDataBtn = document.getElementById('clear-all-data');
        clearDataBtn?.addEventListener('click', () => this.clearAllData());

        // Export/Import settings
        const exportBtn = document.getElementById('export-settings');
        exportBtn?.addEventListener('click', () => this.exportSettings());

        const importBtn = document.getElementById('import-settings');
        importBtn?.addEventListener('click', () => this.importSettings());
    }

    /**
     * Switch to a different view
     * @param {string} viewName - View to switch to
     */
    switchView(viewName) {
        // Update active view
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}-view`)?.classList.add('active');

        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === viewName) {
                btn.classList.add('active');
            }
        });

        this.currentView = viewName;

        // Load view data
        switch (viewName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'history':
                this.loadHistory();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboard() {
        try {
            const stats = await storage.getStorageStats();
            const crawls = await storage.getAllCrawls();

            // Update stat cards
            document.getElementById('total-crawls').textContent = stats.totalCrawls;
            document.getElementById('pages-crawled').textContent = stats.totalPages;
            document.getElementById('data-size').textContent = stats.formattedSize;

            // Load recent crawls
            this.displayRecentCrawls(crawls.slice(0, 5));
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    }

    /**
     * Display recent crawls
     * @param {Array} crawls - Array of crawl objects
     */
    displayRecentCrawls(crawls) {
        const container = document.getElementById('recent-crawls-list');
        
        if (crawls.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                    </svg>
                    <p>No crawls yet. Start your first crawl!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = crawls.map(crawl => `
            <div class="crawl-item stagger-item">
                <div class="crawl-item-name">${crawl.name}</div>
                <div class="crawl-item-url">${crawl.seedUrls[0]}</div>
                <div class="crawl-item-meta">
                    <span>📄 ${crawl.stats?.pagesProcessed || 0} pages</span>
                    <span>🕐 ${Utils.formatDate(crawl.timestamp)}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Start crawling process
     * @param {FormData} formData - Form data
     */
    async startCrawl(formData) {
        try {
            // Create config from form
            const crawlConfig = {
                id: Utils.generateId(),
                name: formData.get('crawl-name'),
                seedUrls: Utils.parseSeedUrls(formData.get('seed-urls')),
                maxDepth: parseInt(formData.get('max-depth')),
                maxPages: parseInt(formData.get('max-pages')),
                numCrawlers: parseInt(formData.get('num-crawlers')),
                politenessDelay: parseInt(formData.get('politeness-delay')),
                urlPattern: formData.get('url-pattern'),
                excludePattern: formData.get('exclude-pattern'),
                followRedirects: formData.get('follow-redirects') === 'on',
                respectRobots: formData.get('respect-robots') === 'on',
                includeBinary: formData.get('include-binary') === 'on',
                userAgent: config.get('userAgent'),
                timeout: config.get('timeout'),
                timestamp: Date.now(),
                status: 'running',
                stats: {
                    pagesProcessed: 0,
                    pagesQueued: 0,
                    startTime: null,
                    endTime: null
                }
            };

            // Validate config
            const validation = config.validateCrawlConfig(crawlConfig);
            if (!validation.isValid) {
                this.showToast('Validation Error', validation.errors.join(', '), 'error');
                return;
            }

            // Save crawl config
            await storage.saveCrawl(crawlConfig);

            // Show crawler status
            document.getElementById('crawler-status').classList.remove('hidden');
            document.querySelector('.crawler-form').style.display = 'none';

            // Create crawler instance
            this.activeCrawler = new WebCrawler(crawlConfig);

            // Setup callbacks
            this.activeCrawler.on('onProgress', (progress) => {
                this.updateCrawlProgress(progress);
            });

            this.activeCrawler.on('onComplete', async (stats, results) => {
                crawlConfig.status = 'completed';
                crawlConfig.stats = stats;
                await storage.saveCrawl(crawlConfig);
                
                this.showToast('Crawl Complete', `Crawled ${stats.pagesProcessed} pages`, 'success');
                this.resetCrawlerUI();
            });

            this.activeCrawler.on('onError', (error, url) => {
                this.addLogEntry(`Error: ${url} - ${error.message}`, 'error');
            });

            this.activeCrawler.on('onPageCrawled', (page) => {
                this.addLogEntry(`✓ ${page.url}`, 'success');
            });

            // Start timer
            this.startTimer();

            // Start crawling
            this.showToast('Crawl Started', `Starting crawl: ${crawlConfig.name}`, 'info');
            await this.activeCrawler.start();

        } catch (error) {
            console.error('Crawl error:', error);
            this.showToast('Error', error.message, 'error');
            this.resetCrawlerUI();
        }
    }

    /**
     * Stop active crawl
     */
    stopCrawl() {
        if (this.activeCrawler) {
            this.activeCrawler.stop();
            this.showToast('Crawl Stopped', 'Crawling has been stopped', 'warning');
            this.resetCrawlerUI();
        }
    }

    /**
     * Update crawl progress UI
     * @param {Object} progress - Progress data
     */
    updateCrawlProgress(progress) {
        if (progress.log) {
            this.addLogEntry(progress.log.message, progress.log.level);
        }

        const percentage = Math.min(progress.percentage || 0, 100);
        document.getElementById('crawl-progress').style.width = `${percentage}%`;
        document.getElementById('progress-text').textContent = `${Math.round(percentage)}%`;
        document.getElementById('status-processed').textContent = progress.processed || 0;
        document.getElementById('status-queue').textContent = progress.queued || 0;
    }

    /**
     * Add log entry
     * @param {string} message - Log message
     * @param {string} level - Log level
     */
    addLogEntry(message, level = 'info') {
        const logContent = document.getElementById('live-log-content');
        if (!logContent) return;

        const entry = document.createElement('div');
        entry.className = `log-entry ${level}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;

        // Keep only last 100 entries
        while (logContent.children.length > 100) {
            logContent.removeChild(logContent.firstChild);
        }
    }

    /**
     * Start elapsed time timer
     */
    startTimer() {
        const startTime = Date.now();
        this.updateInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            document.getElementById('status-time').textContent = Utils.formatDuration(elapsed);
        }, 1000);
    }

    /**
     * Reset crawler UI
     */
    resetCrawlerUI() {
        clearInterval(this.updateInterval);
        document.getElementById('crawler-status').classList.add('hidden');
        document.querySelector('.crawler-form').style.display = 'block';
        document.getElementById('live-log-content').innerHTML = '';
        this.activeCrawler = null;
        this.loadDashboard();
    }

    /**
     * Load crawl history
     */
    async loadHistory() {
        try {
            const crawls = await storage.getAllCrawls();
            this.displayHistory(crawls);
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }

    /**
     * Display crawl history
     * @param {Array} crawls - Array of crawl objects
     */
    displayHistory(crawls) {
        const container = document.getElementById('history-list');
        
        if (crawls.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    </svg>
                    <p>No crawl history available</p>
                </div>
            `;
            return;
        }

        // Sort by timestamp desc
        crawls.sort((a, b) => b.timestamp - a.timestamp);

        container.innerHTML = crawls.map(crawl => `
            <div class="history-item stagger-item" data-crawl-id="${crawl.id}">
                <div class="history-item-header">
                    <div>
                        <div class="history-item-title">${crawl.name}</div>
                        <div class="history-item-date">${Utils.formatDate(crawl.timestamp)}</div>
                    </div>
                </div>
                <div class="history-item-stats">
                    <div class="history-stat">
                        <span>Pages:</span>
                        <strong>${crawl.stats?.pagesProcessed || 0}</strong>
                    </div>
                    <div class="history-stat">
                        <span>Duration:</span>
                        <strong>${Utils.formatDuration(crawl.stats?.duration || 0)}</strong>
                    </div>
                    <div class="history-stat">
                        <span>Status:</span>
                        <strong>${crawl.status || 'unknown'}</strong>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="btn btn-secondary" onclick="ui.exportCrawl('${crawl.id}')">
                        Export
                    </button>
                    <button class="btn btn-danger" onclick="ui.deleteCrawl('${crawl.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Filter history by search term
     * @param {string} searchTerm - Search term
     */
    async filterHistory(searchTerm) {
        const crawls = await storage.getAllCrawls();
        const filtered = crawls.filter(crawl => 
            crawl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            crawl.seedUrls.some(url => url.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.displayHistory(filtered);
    }

    /**
     * Export crawl data
     * @param {string} crawlId - Crawl ID
     */
    async exportCrawl(crawlId) {
        try {
            const crawl = await storage.getCrawl(crawlId);
            const pages = await storage.getPagesByCrawlId(crawlId);
            
            const data = {
                config: crawl,
                pages: pages
            };

            Utils.exportToJson(data, `crawl_${crawl.name}_${Date.now()}`);
            this.showToast('Export Success', 'Crawl data exported', 'success');
        } catch (error) {
            this.showToast('Export Failed', error.message, 'error');
        }
    }

    /**
     * Delete crawl
     * @param {string} crawlId - Crawl ID
     */
    async deleteCrawl(crawlId) {
        if (!confirm('Are you sure you want to delete this crawl?')) return;

        try {
            await storage.deleteCrawl(crawlId);
            this.showToast('Deleted', 'Crawl deleted successfully', 'success');
            this.loadHistory();
        } catch (error) {
            this.showToast('Delete Failed', error.message, 'error');
        }
    }

    /**
     * Clear all history
     */
    async clearHistory() {
        if (!confirm('Are you sure you want to clear all crawl history?')) return;

        try {
            await storage.clearAll();
            this.showToast('Cleared', 'All history cleared', 'success');
            this.loadHistory();
            this.loadDashboard();
        } catch (error) {
            this.showToast('Clear Failed', error.message, 'error');
        }
    }

    /**
     * Load settings
     */
    async loadSettings() {
        const currentConfig = config.getAll();
        document.getElementById('theme-select').value = currentConfig.theme;
        document.getElementById('default-user-agent').value = currentConfig.userAgent;
        document.getElementById('storage-type').value = currentConfig.storageType;
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        if (!confirm('This will delete ALL crawler data. Are you sure?')) return;

        try {
            await storage.clearAll();
            this.showToast('Data Cleared', 'All data has been deleted', 'success');
            this.loadDashboard();
        } catch (error) {
            this.showToast('Error', error.message, 'error');
        }
    }

    /**
     * Export settings
     */
    exportSettings() {
        const configData = config.exportConfig();
        const blob = new Blob([configData], { type: 'application/json' });
        Utils.downloadBlob(blob, 'webcrawler4j_settings.json');
        this.showToast('Exported', 'Settings exported successfully', 'success');
    }

    /**
     * Import settings
     */
    async importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const success = await config.importConfig(text);
                
                if (success) {
                    this.showToast('Imported', 'Settings imported successfully', 'success');
                    this.loadSettings();
                } else {
                    this.showToast('Error', 'Failed to import settings', 'error');
                }
            } catch (error) {
                this.showToast('Error', error.message, 'error');
            }
        };

        input.click();
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const currentTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
        this.setTheme(currentTheme);
    }

    /**
     * Set theme
     * @param {string} theme - Theme name (light, dark, auto)
     */
    async setTheme(theme) {
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }

        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(`${theme}-theme`);

        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        }

        await config.set('theme', theme);
    }

    /**
     * Apply saved theme
     */
    async applyTheme() {
        const theme = await config.get('theme') || 'auto';
        this.setTheme(theme);
    }

    /**
     * Show toast notification
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     */
    showToast(title, message, type = 'info') {
        const container = document.getElementById('toast-container');
        
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
}

// Create global UI instance
const ui = new UIController();