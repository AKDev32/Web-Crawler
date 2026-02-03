// WebCrawler4J - Configuration Manager

/**
 * Configuration manager for crawler settings
 */
class ConfigManager {
    constructor() {
        this.defaultConfig = {
            // Basic settings
            maxDepth: 2,
            maxPages: 100,
            numCrawlers: 4,
            politenessDelay: 200,
            
            // Filtering
            urlPattern: '',
            excludePattern: '.*(\\.(css|js|gif|jpg|png|mp3|mp4|zip|gz))$',
            
            // Behavior
            followRedirects: true,
            respectRobots: true,
            includeBinary: false,
            
            // Advanced
            userAgent: 'WebCrawler4J/1.0 (https://github.com/webcrawler4j)',
            timeout: 30000,
            maxRetries: 3,
            
            // UI preferences
            theme: 'auto',
            storageType: 'indexeddb'
        };
        
        this.currentConfig = { ...this.defaultConfig };
    }

    /**
     * Load configuration from storage
     * @returns {Promise<void>}
     */
    async loadConfig() {
        try {
            const savedConfig = await storage.getSetting('appConfig');
            if (savedConfig) {
                this.currentConfig = { ...this.defaultConfig, ...savedConfig };
            }
        } catch (error) {
            console.error('Failed to load config:', error);
        }
    }

    /**
     * Save configuration to storage
     * @returns {Promise<void>}
     */
    async saveConfig() {
        try {
            await storage.saveSetting('appConfig', this.currentConfig);
        } catch (error) {
            console.error('Failed to save config:', error);
        }
    }

    /**
     * Get configuration value
     * @param {string} key - Configuration key
     * @returns {*} Configuration value
     */
    get(key) {
        return this.currentConfig[key];
    }

    /**
     * Set configuration value
     * @param {string} key - Configuration key
     * @param {*} value - Configuration value
     * @returns {Promise<void>}
     */
    async set(key, value) {
        this.currentConfig[key] = value;
        await this.saveConfig();
    }

    /**
     * Get all configuration
     * @returns {Object} Current configuration
     */
    getAll() {
        return { ...this.currentConfig };
    }

    /**
     * Reset to default configuration
     * @returns {Promise<void>}
     */
    async reset() {
        this.currentConfig = { ...this.defaultConfig };
        await this.saveConfig();
    }

    /**
     * Validate crawl configuration
     * @param {Object} config - Crawl configuration to validate
     * @returns {Object} Validation result
     */
    validateCrawlConfig(config) {
        const errors = [];

        if (!config.name || config.name.trim() === '') {
            errors.push('Crawl name is required');
        }

        if (!config.seedUrls || config.seedUrls.length === 0) {
            errors.push('At least one seed URL is required');
        }

        config.seedUrls?.forEach((url, index) => {
            if (!Utils.isValidUrl(url)) {
                errors.push(`Invalid URL at position ${index + 1}: ${url}`);
            }
        });

        if (config.maxDepth < 0) {
            errors.push('Max depth cannot be negative');
        }

        if (config.maxPages < 1) {
            errors.push('Max pages must be at least 1');
        }

        if (config.numCrawlers < 1 || config.numCrawlers > 10) {
            errors.push('Number of crawlers must be between 1 and 10');
        }

        if (config.politenessDelay < 0) {
            errors.push('Politeness delay cannot be negative');
        }

        // Validate regex patterns
        if (config.urlPattern) {
            try {
                new RegExp(config.urlPattern);
            } catch (e) {
                errors.push('Invalid URL pattern regex');
            }
        }

        if (config.excludePattern) {
            try {
                new RegExp(config.excludePattern);
            } catch (e) {
                errors.push('Invalid exclude pattern regex');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Create crawl configuration from form data
     * @param {FormData} formData - Form data
     * @returns {Object} Crawl configuration
     */
    createCrawlConfig(formData) {
        return {
            id: Utils.generateId(),
            name: formData.get('name'),
            seedUrls: Utils.parseSeedUrls(formData.get('seedUrls')),
            maxDepth: parseInt(formData.get('maxDepth')) || 0,
            maxPages: parseInt(formData.get('maxPages')) || 100,
            numCrawlers: parseInt(formData.get('numCrawlers')) || 4,
            politenessDelay: parseInt(formData.get('politenessDelay')) || 200,
            urlPattern: formData.get('urlPattern') || '',
            excludePattern: formData.get('excludePattern') || '',
            followRedirects: formData.get('followRedirects') === 'on',
            respectRobots: formData.get('respectRobots') === 'on',
            includeBinary: formData.get('includeBinary') === 'on',
            userAgent: this.currentConfig.userAgent,
            timeout: this.currentConfig.timeout,
            maxRetries: this.currentConfig.maxRetries,
            timestamp: Date.now(),
            status: 'pending',
            stats: {
                pagesProcessed: 0,
                pagesQueued: 0,
                startTime: null,
                endTime: null,
                duration: 0
            }
        };
    }

    /**
     * Export configuration
     * @returns {string} JSON string of configuration
     */
    exportConfig() {
        return JSON.stringify(this.currentConfig, null, 2);
    }

    /**
     * Import configuration
     * @param {string} jsonString - JSON configuration string
     * @returns {Promise<boolean>} Success status
     */
    async importConfig(jsonString) {
        try {
            const config = JSON.parse(jsonString);
            this.currentConfig = { ...this.defaultConfig, ...config };
            await this.saveConfig();
            return true;
        } catch (error) {
            console.error('Failed to import config:', error);
            return false;
        }
    }

    /**
     * Get robots.txt parser rules
     * @param {string} robotsTxt - robots.txt content
     * @param {string} userAgent - User agent string
     * @returns {Object} Parsed rules
     */
    parseRobotsTxt(robotsTxt, userAgent = '*') {
        const lines = robotsTxt.split('\n');
        const rules = {
            allowed: [],
            disallowed: [],
            crawlDelay: 0
        };

        let currentAgent = null;
        let matchesAgent = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const [key, ...valueParts] = trimmed.split(':');
            const value = valueParts.join(':').trim();

            if (key.toLowerCase() === 'user-agent') {
                currentAgent = value;
                matchesAgent = value === '*' || value === userAgent;
            } else if (matchesAgent) {
                if (key.toLowerCase() === 'disallow') {
                    if (value) rules.disallowed.push(value);
                } else if (key.toLowerCase() === 'allow') {
                    if (value) rules.allowed.push(value);
                } else if (key.toLowerCase() === 'crawl-delay') {
                    rules.crawlDelay = parseInt(value) || 0;
                }
            }
        }

        return rules;
    }

    /**
     * Check if URL is allowed by robots.txt rules
     * @param {string} url - URL to check
     * @param {Object} rules - Parsed robots.txt rules
     * @returns {boolean} True if allowed
     */
    isAllowedByRobots(url, rules) {
        if (!rules) return true;

        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname;

            // Check if explicitly allowed
            for (const allowed of rules.allowed) {
                if (path.startsWith(allowed)) return true;
            }

            // Check if disallowed
            for (const disallowed of rules.disallowed) {
                if (path.startsWith(disallowed)) return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }
}

// Create singleton instance
const config = new ConfigManager();