// WebCrawler4J - Core Crawler Engine

/**
 * Web Crawler Engine
 * Implements multi-threaded crawling with queue management
 */
class WebCrawler {
    constructor(crawlConfig) {
        this.config = crawlConfig;
        this.queue = [];
        this.visited = new Set();
        this.processing = new Set();
        this.results = [];
        this.isRunning = false;
        this.workers = [];
        this.stats = {
            pagesProcessed: 0,
            pagesQueued: 0,
            startTime: null,
            endTime: null,
            errors: 0
        };
        this.robotsCache = new Map();
        this.callbacks = {
            onProgress: null,
            onComplete: null,
            onError: null,
            onPageCrawled: null
        };
    }

    /**
     * Register callback functions
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        this.callbacks[event] = callback;
    }

    /**
     * Start crawling
     * @returns {Promise<void>}
     */
    async start() {
        if (this.isRunning) {
            throw new Error('Crawler is already running');
        }

        this.isRunning = true;
        this.stats.startTime = Date.now();
        
        // Add seed URLs to queue
        this.config.seedUrls.forEach(url => {
            this.addToQueue(url, 0);
        });

        // Start crawlers
        const promises = [];
        for (let i = 0; i < this.config.numCrawlers; i++) {
            promises.push(this.crawlWorker(i));
        }

        // Wait for all workers to complete
        await Promise.all(promises);

        this.isRunning = false;
        this.stats.endTime = Date.now();
        this.stats.duration = this.stats.endTime - this.stats.startTime;

        if (this.callbacks.onComplete) {
            this.callbacks.onComplete(this.stats, this.results);
        }
    }

    /**
     * Stop crawling
     */
    stop() {
        this.isRunning = false;
        this.queue = [];
    }

    /**
     * Crawl worker function
     * @param {number} workerId - Worker ID
     * @returns {Promise<void>}
     */
    async crawlWorker(workerId) {
        while (this.isRunning && (this.queue.length > 0 || this.processing.size > 0)) {
            const item = this.queue.shift();
            
            if (!item) {
                await Utils.sleep(100);
                continue;
            }

            // Check if max pages reached
            if (this.stats.pagesProcessed >= this.config.maxPages) {
                this.stop();
                break;
            }

            try {
                this.processing.add(item.url);
                await this.crawlPage(item.url, item.depth, workerId);
                this.processing.delete(item.url);
            } catch (error) {
                this.processing.delete(item.url);
                this.stats.errors++;
                
                if (this.callbacks.onError) {
                    this.callbacks.onError(error, item.url);
                }
            }

            // Politeness delay
            if (this.config.politenessDelay > 0) {
                await Utils.sleep(this.config.politenessDelay);
            }
        }
    }

    /**
     * Crawl a single page
     * @param {string} url - URL to crawl
     * @param {number} depth - Current depth
     * @param {number} workerId - Worker ID
     * @returns {Promise<void>}
     */
    async crawlPage(url, depth, workerId) {
        // Check if should visit
        if (!this.shouldVisit(url, depth)) {
            return;
        }

        // Mark as visited
        this.visited.add(url);

        // Check robots.txt
        if (this.config.respectRobots) {
            const allowed = await this.checkRobotsTxt(url);
            if (!allowed) {
                this.log(`Blocked by robots.txt: ${url}`, 'warning', workerId);
                return;
            }
        }

        this.log(`Crawling: ${url}`, 'info', workerId);

        try {
            // Fetch page
            const response = await this.fetchPage(url);
            
            // Process page
            const pageData = await this.processPage(url, response, depth);
            
            // Save page data
            this.results.push(pageData);
            this.stats.pagesProcessed++;

            // Save to storage
            if (storage) {
                pageData.crawlId = this.config.id;
                await storage.savePage(pageData);
            }

            // Extract and queue links
            if (depth < this.config.maxDepth || this.config.maxDepth === 0) {
                const links = this.extractLinks(pageData.html, url);
                links.forEach(link => {
                    this.addToQueue(link, depth + 1);
                });
            }

            // Callback
            if (this.callbacks.onPageCrawled) {
                this.callbacks.onPageCrawled(pageData);
            }

            // Progress update
            if (this.callbacks.onProgress) {
                this.callbacks.onProgress({
                    processed: this.stats.pagesProcessed,
                    queued: this.queue.length,
                    total: this.config.maxPages,
                    percentage: (this.stats.pagesProcessed / this.config.maxPages) * 100
                });
            }

            this.log(`✓ Success: ${url}`, 'success', workerId);
        } catch (error) {
            this.log(`✗ Error: ${url} - ${error.message}`, 'error', workerId);
            throw error;
        }
    }

    /**
     * Fetch page content
     * @param {string} url - URL to fetch
     * @returns {Promise<Response>} Fetch response
     */
    async fetchPage(url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': this.config.userAgent
                },
                redirect: this.config.followRedirects ? 'follow' : 'manual'
            });

            clearTimeout(timeout);
            return response;
        } catch (error) {
            clearTimeout(timeout);
            throw error;
        }
    }

    /**
     * Process fetched page
     * @param {string} url - Page URL
     * @param {Response} response - Fetch response
     * @param {number} depth - Current depth
     * @returns {Promise<Object>} Page data
     */
    async processPage(url, response, depth) {
        const contentType = response.headers.get('content-type') || '';
        const isHtml = contentType.includes('text/html');
        
        let html = '';
        let text = '';
        let size = 0;

        if (isHtml || this.config.includeBinary) {
            const content = await response.text();
            html = content;
            size = new Blob([content]).size;

            if (isHtml) {
                // Extract text content
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                text = doc.body?.textContent || '';
            }
        }

        return {
            id: Utils.generateId(),
            url,
            depth,
            status: response.status,
            statusText: response.statusText,
            contentType,
            size,
            html,
            text,
            timestamp: Date.now()
        };
    }

    /**
     * Extract links from HTML
     * @param {string} html - HTML content
     * @param {string} baseUrl - Base URL
     * @returns {Array<string>} Array of URLs
     */
    extractLinks(html, baseUrl) {
        if (!html) return [];

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const anchors = doc.querySelectorAll('a[href]');
            const links = [];

            anchors.forEach(anchor => {
                try {
                    const href = anchor.getAttribute('href');
                    const absoluteUrl = new URL(href, baseUrl).href;
                    links.push(absoluteUrl);
                } catch (e) {
                    // Invalid URL, skip
                }
            });

            return links;
        } catch (error) {
            return [];
        }
    }

    /**
     * Check if URL should be visited
     * @param {string} url - URL to check
     * @param {number} depth - Current depth
     * @returns {boolean} True if should visit
     */
    shouldVisit(url, depth) {
        // Already visited
        if (this.visited.has(url)) return false;

        // Currently processing
        if (this.processing.has(url)) return false;

        // Check depth limit
        if (this.config.maxDepth > 0 && depth > this.config.maxDepth) return false;

        // Check URL pattern
        if (this.config.urlPattern && !Utils.matchesPattern(url, this.config.urlPattern)) {
            return false;
        }

        // Check exclude pattern
        if (this.config.excludePattern && Utils.matchesPattern(url, this.config.excludePattern)) {
            return false;
        }

        return true;
    }

    /**
     * Add URL to crawl queue
     * @param {string} url - URL to add
     * @param {number} depth - Depth level
     */
    addToQueue(url, depth) {
        if (this.shouldVisit(url, depth)) {
            this.queue.push({ url, depth });
            this.stats.pagesQueued++;
        }
    }

    /**
     * Check robots.txt for URL
     * @param {string} url - URL to check
     * @returns {Promise<boolean>} True if allowed
     */
    async checkRobotsTxt(url) {
        try {
            const urlObj = new URL(url);
            const domain = `${urlObj.protocol}//${urlObj.host}`;
            const robotsUrl = `${domain}/robots.txt`;

            // Check cache
            if (this.robotsCache.has(domain)) {
                const rules = this.robotsCache.get(domain);
                return config.isAllowedByRobots(url, rules);
            }

            // Fetch robots.txt
            try {
                const response = await fetch(robotsUrl);
                if (response.ok) {
                    const robotsTxt = await response.text();
                    const rules = config.parseRobotsTxt(robotsTxt, this.config.userAgent);
                    this.robotsCache.set(domain, rules);
                    return config.isAllowedByRobots(url, rules);
                }
            } catch (e) {
                // No robots.txt or error fetching, allow by default
            }

            // Cache empty rules
            this.robotsCache.set(domain, { allowed: [], disallowed: [], crawlDelay: 0 });
            return true;
        } catch (error) {
            return true; // Allow on error
        }
    }

    /**
     * Log message
     * @param {string} message - Log message
     * @param {string} level - Log level
     * @param {number} workerId - Worker ID
     */
    log(message, level = 'info', workerId = 0) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            level,
            workerId,
            message
        };

        if (this.callbacks.onProgress) {
            this.callbacks.onProgress({
                log: logEntry,
                processed: this.stats.pagesProcessed,
                queued: this.queue.length
            });
        }
    }

    /**
     * Get current statistics
     * @returns {Object} Current stats
     */
    getStats() {
        return {
            ...this.stats,
            queueSize: this.queue.length,
            visitedCount: this.visited.size,
            processingCount: this.processing.size
        };
    }

    /**
     * Export results
     * @param {string} format - Export format (json, csv)
     * @returns {string} Exported data
     */
    exportResults(format = 'json') {
        if (format === 'json') {
            return JSON.stringify({
                config: this.config,
                stats: this.stats,
                results: this.results
            }, null, 2);
        } else if (format === 'csv') {
            const headers = ['URL', 'Depth', 'Status', 'Content-Type', 'Size', 'Timestamp'];
            const rows = this.results.map(page => [
                page.url,
                page.depth,
                page.status,
                page.contentType,
                page.size,
                new Date(page.timestamp).toISOString()
            ]);
            
            return [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebCrawler;
}