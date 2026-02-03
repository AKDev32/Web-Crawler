// WebCrawler4J - Utility Functions

/**
 * Utility class with helper functions
 */
class Utils {
    /**
     * Generate a unique ID
     * @returns {string} Unique identifier
     */
    static generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Format date to readable string
     * @param {Date|string|number} date - Date to format
     * @returns {string} Formatted date string
     */
    static formatDate(date) {
        const d = new Date(date);
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return d.toLocaleDateString('en-US', options);
    }

    /**
     * Format duration in milliseconds to readable string
     * @param {number} ms - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    static formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const h = hours.toString().padStart(2, '0');
        const m = (minutes % 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');

        return `${h}:${m}:${s}`;
    }

    /**
     * Format bytes to readable size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size string
     */
    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid URL
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Extract domain from URL
     * @param {string} url - URL to parse
     * @returns {string} Domain name
     */
    static getDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return '';
        }
    }

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Sleep for specified duration
     * @param {number} ms - Duration in milliseconds
     * @returns {Promise} Promise that resolves after duration
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Parse seed URLs from textarea input
     * @param {string} input - Raw input string
     * @returns {Array<string>} Array of valid URLs
     */
    static parseSeedUrls(input) {
        return input
            .split('\n')
            .map(url => url.trim())
            .filter(url => url && this.isValidUrl(url));
    }

    /**
     * Sanitize filename
     * @param {string} filename - Original filename
     * @returns {string} Sanitized filename
     */
    static sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }

    /**
     * Export data to JSON file
     * @param {Object} data - Data to export
     * @param {string} filename - Filename for download
     */
    static exportToJson(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        this.downloadBlob(blob, `${filename}.json`);
    }

    /**
     * Export data to CSV file
     * @param {Array} data - Array of objects
     * @param {string} filename - Filename for download
     */
    static exportToCsv(data, filename) {
        if (!data.length) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    JSON.stringify(row[header] || '')
                ).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        this.downloadBlob(blob, `${filename}.csv`);
    }

    /**
     * Download blob as file
     * @param {Blob} blob - Blob to download
     * @param {string} filename - Filename
     */
    static downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Success status
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            return false;
        }
    }

    /**
     * Get color based on status
     * @param {string} status - Status string
     * @returns {string} Color hex code
     */
    static getStatusColor(status) {
        const colors = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6',
            'pending': '#8b5cf6',
            'running': '#2dd4bf'
        };
        return colors[status] || '#64748b';
    }

    /**
     * Calculate crawl statistics
     * @param {Array} pages - Array of crawled pages
     * @returns {Object} Statistics object
     */
    static calculateStats(pages) {
        const totalPages = pages.length;
        const successfulPages = pages.filter(p => p.status === 200).length;
        const failedPages = pages.filter(p => p.status !== 200).length;
        const totalSize = pages.reduce((sum, p) => sum + (p.size || 0), 0);
        const avgSize = totalPages > 0 ? totalSize / totalPages : 0;

        return {
            totalPages,
            successfulPages,
            failedPages,
            totalSize,
            avgSize,
            successRate: totalPages > 0 ? (successfulPages / totalPages * 100).toFixed(2) : 0
        };
    }

    /**
     * Extract links from HTML content
     * @param {string} html - HTML content
     * @param {string} baseUrl - Base URL for relative links
     * @returns {Array<string>} Array of absolute URLs
     */
    static extractLinks(html, baseUrl) {
        const links = new Set();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const anchors = doc.querySelectorAll('a[href]');

        anchors.forEach(anchor => {
            try {
                const href = anchor.getAttribute('href');
                const absoluteUrl = new URL(href, baseUrl).href;
                links.add(absoluteUrl);
            } catch (err) {
                // Invalid URL, skip
            }
        });

        return Array.from(links);
    }

    /**
     * Check if URL matches pattern
     * @param {string} url - URL to check
     * @param {string} pattern - Regex pattern
     * @returns {boolean} True if matches
     */
    static matchesPattern(url, pattern) {
        if (!pattern) return true;
        try {
            const regex = new RegExp(pattern);
            return regex.test(url);
        } catch {
            return false;
        }
    }

    /**
     * Generate random color
     * @returns {string} Hex color code
     */
    static randomColor() {
        return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    }

    /**
     * Truncate string
     * @param {string} str - String to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated string
     */
    static truncate(str, maxLength) {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - 3) + '...';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}