// WebCrawler4J - Storage Management

/**
 * Storage manager for crawler data
 * Supports both IndexedDB and LocalStorage
 */
class StorageManager {
    constructor() {
        this.dbName = 'WebCrawler4JDB';
        this.dbVersion = 1;
        this.db = null;
        this.storageType = 'indexeddb'; // or 'localstorage'
    }

    /**
     * Initialize storage
     * @returns {Promise<void>}
     */
    async init() {
        try {
            if (this.storageType === 'indexeddb') {
                await this.initIndexedDB();
            }
            console.log('Storage initialized successfully');
        } catch (error) {
            console.error('Storage initialization failed:', error);
            // Fallback to localStorage
            this.storageType = 'localstorage';
        }
    }

    /**
     * Initialize IndexedDB
     * @returns {Promise<void>}
     */
    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('crawls')) {
                    const crawlStore = db.createObjectStore('crawls', { keyPath: 'id' });
                    crawlStore.createIndex('timestamp', 'timestamp', { unique: false });
                    crawlStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains('pages')) {
                    const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
                    pageStore.createIndex('crawlId', 'crawlId', { unique: false });
                    pageStore.createIndex('url', 'url', { unique: false });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Save crawl configuration
     * @param {Object} crawl - Crawl configuration object
     * @returns {Promise<string>} Crawl ID
     */
    async saveCrawl(crawl) {
        crawl.id = crawl.id || Utils.generateId();
        crawl.timestamp = crawl.timestamp || Date.now();

        if (this.storageType === 'indexeddb') {
            return this.saveToIndexedDB('crawls', crawl);
        } else {
            return this.saveToLocalStorage('crawls', crawl);
        }
    }

    /**
     * Get crawl by ID
     * @param {string} id - Crawl ID
     * @returns {Promise<Object>} Crawl object
     */
    async getCrawl(id) {
        if (this.storageType === 'indexeddb') {
            return this.getFromIndexedDB('crawls', id);
        } else {
            return this.getFromLocalStorage('crawls', id);
        }
    }

    /**
     * Get all crawls
     * @returns {Promise<Array>} Array of crawls
     */
    async getAllCrawls() {
        if (this.storageType === 'indexeddb') {
            return this.getAllFromIndexedDB('crawls');
        } else {
            return this.getAllFromLocalStorage('crawls');
        }
    }

    /**
     * Delete crawl
     * @param {string} id - Crawl ID
     * @returns {Promise<void>}
     */
    async deleteCrawl(id) {
        // Delete associated pages first
        const pages = await this.getPagesByCrawlId(id);
        for (const page of pages) {
            await this.deletePage(page.id);
        }

        if (this.storageType === 'indexeddb') {
            return this.deleteFromIndexedDB('crawls', id);
        } else {
            return this.deleteFromLocalStorage('crawls', id);
        }
    }

    /**
     * Save crawled page
     * @param {Object} page - Page object
     * @returns {Promise<string>} Page ID
     */
    async savePage(page) {
        page.id = page.id || Utils.generateId();
        page.timestamp = page.timestamp || Date.now();

        if (this.storageType === 'indexeddb') {
            return this.saveToIndexedDB('pages', page);
        } else {
            return this.saveToLocalStorage('pages', page);
        }
    }

    /**
     * Get pages by crawl ID
     * @param {string} crawlId - Crawl ID
     * @returns {Promise<Array>} Array of pages
     */
    async getPagesByCrawlId(crawlId) {
        if (this.storageType === 'indexeddb') {
            return this.getFromIndexedDBByIndex('pages', 'crawlId', crawlId);
        } else {
            const allPages = await this.getAllFromLocalStorage('pages');
            return allPages.filter(page => page.crawlId === crawlId);
        }
    }

    /**
     * Delete page
     * @param {string} id - Page ID
     * @returns {Promise<void>}
     */
    async deletePage(id) {
        if (this.storageType === 'indexeddb') {
            return this.deleteFromIndexedDB('pages', id);
        } else {
            return this.deleteFromLocalStorage('pages', id);
        }
    }

    /**
     * Save setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     * @returns {Promise<void>}
     */
    async saveSetting(key, value) {
        const setting = { key, value };
        if (this.storageType === 'indexeddb') {
            return this.saveToIndexedDB('settings', setting);
        } else {
            localStorage.setItem(`setting_${key}`, JSON.stringify(value));
        }
    }

    /**
     * Get setting
     * @param {string} key - Setting key
     * @param {*} defaultValue - Default value if not found
     * @returns {Promise<*>} Setting value
     */
    async getSetting(key, defaultValue = null) {
        if (this.storageType === 'indexeddb') {
            const setting = await this.getFromIndexedDB('settings', key);
            return setting ? setting.value : defaultValue;
        } else {
            const value = localStorage.getItem(`setting_${key}`);
            return value ? JSON.parse(value) : defaultValue;
        }
    }

    /**
     * Clear all data
     * @returns {Promise<void>}
     */
    async clearAll() {
        if (this.storageType === 'indexeddb') {
            const stores = ['crawls', 'pages', 'settings'];
            for (const store of stores) {
                await this.clearStore(store);
            }
        } else {
            localStorage.clear();
        }
    }

    // IndexedDB helper methods

    saveToIndexedDB(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(data.id);
            request.onerror = () => reject(request.error);
        });
    }

    getFromIndexedDB(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getAllFromIndexedDB(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    getFromIndexedDBByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    deleteFromIndexedDB(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // LocalStorage helper methods

    saveToLocalStorage(storeName, data) {
        const key = `${storeName}_${data.id}`;
        localStorage.setItem(key, JSON.stringify(data));
        return Promise.resolve(data.id);
    }

    getFromLocalStorage(storeName, id) {
        const key = `${storeName}_${id}`;
        const data = localStorage.getItem(key);
        return Promise.resolve(data ? JSON.parse(data) : null);
    }

    getAllFromLocalStorage(storeName) {
        const items = [];
        const prefix = `${storeName}_`;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(prefix)) {
                const data = localStorage.getItem(key);
                items.push(JSON.parse(data));
            }
        }
        
        return Promise.resolve(items);
    }

    deleteFromLocalStorage(storeName, id) {
        const key = `${storeName}_${id}`;
        localStorage.removeItem(key);
        return Promise.resolve();
    }

    /**
     * Get storage usage statistics
     * @returns {Promise<Object>} Storage stats
     */
    async getStorageStats() {
        const crawls = await this.getAllCrawls();
        const totalCrawls = crawls.length;
        let totalPages = 0;
        let totalSize = 0;

        for (const crawl of crawls) {
            const pages = await this.getPagesByCrawlId(crawl.id);
            totalPages += pages.length;
            totalSize += pages.reduce((sum, page) => sum + (page.size || 0), 0);
        }

        return {
            totalCrawls,
            totalPages,
            totalSize,
            formattedSize: Utils.formatBytes(totalSize)
        };
    }
}

// Create singleton instance
const storage = new StorageManager();