# WebCrawler 🕷️

A powerful, modern web crawler built entirely with HTML, CSS, and JavaScript. Inspired by the popular crawler4j Java library, WebCrawler brings professional web crawling capabilities directly to your browser.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)

## ✨ Features

### Core Functionality
- **Multi-threaded Crawling**: Concurrent crawler threads for faster data collection
- **Configurable Depth**: Control how deep the crawler goes into a website
- **URL Filtering**: Include/exclude URLs using regex patterns
- **Robots.txt Compliance**: Respects website crawling rules
- **Politeness Delay**: Configurable delay between requests to be server-friendly
- **Resume Support**: Continue interrupted crawls (via browser storage)

### User Experience
- **Real-time Progress**: Live statistics and log output
- **Beautiful UI**: Modern, responsive interface with dark/light themes
- **Data Visualization**: View crawl statistics and history
- **Export Functionality**: Export results to JSON or CSV
- **Persistent Storage**: Uses IndexedDB for efficient data storage

### Technical Highlights
- **Pure JavaScript**: No backend required
- **Web Standards**: Built with modern web APIs
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Offline Capable**: Can run without internet (for local testing)

## 🚀 Quick Start

### Installation

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. Start crawling!

```bash
# If you want to serve it locally with Python:
python -m http.server 8000

# Or with Node.js:
npx http-server
```

Then navigate to `http://localhost:8000`

### First Crawl

1. Click on **"New Crawl"** in the navigation
2. Fill in the form:
   - **Crawl Name**: Give your crawl a descriptive name
   - **Seed URLs**: Enter starting URLs (one per line)
   - **Max Depth**: How many links deep to crawl (0 = unlimited)
   - **Max Pages**: Maximum number of pages to crawl
   - **Threads**: Number of concurrent crawlers (1-10)
3. Click **"Start Crawling"**
4. Watch the progress in real-time!

## 📖 Documentation

### Configuration Options

#### Basic Settings
- **Crawl Name**: Identifier for your crawl
- **Seed URLs**: Starting points for the crawler
- **Max Depth**: Maximum link depth (0 for unlimited)
- **Max Pages**: Maximum pages to crawl
- **Number of Threads**: Concurrent crawler instances
- **Politeness Delay**: Milliseconds to wait between requests

#### Filtering
- **URL Pattern**: Regex to include only matching URLs
- **Exclude Pattern**: Regex to exclude matching URLs
- **Follow Redirects**: Whether to follow HTTP redirects
- **Respect robots.txt**: Honor website crawling rules
- **Include Binary**: Crawl binary content (images, PDFs, etc.)

### Architecture

```
WebCrawler4J/
├── index.html              # Main entry point
├── assets/
│   ├── css/
│   │   ├── main.css        # Core styles
│   │   ├── components.css  # Component styles
│   │   └── animations.css  # Animations
│   └── js/
│       ├── app.js          # Application initialization
│       ├── crawler.js      # Crawler engine
│       ├── config.js       # Configuration manager
│       ├── storage.js      # Data persistence
│       ├── ui.js           # UI controller
│       └── utils.js        # Utility functions
```

### Key Classes

#### `WebCrawler`
The core crawling engine. Manages URL queue, workers, and page fetching.

```javascript
const crawler = new WebCrawler(config);
crawler.on('onProgress', (data) => console.log(data));
crawler.on('onComplete', (stats, results) => console.log('Done!'));
await crawler.start();
```

#### `StorageManager`
Handles data persistence using IndexedDB or LocalStorage.

```javascript
await storage.init();
await storage.saveCrawl(crawlData);
const crawls = await storage.getAllCrawls();
```

#### `ConfigManager`
Manages application and crawl configurations.

```javascript
config.set('theme', 'dark');
const userAgent = config.get('userAgent');
```

#### `UIController`
Controls all user interface interactions and updates.

```javascript
ui.switchView('dashboard');
ui.showToast('Success', 'Operation complete', 'success');
```

## 🎨 Customization

### Themes
WebCrawler4J supports light and dark themes. You can customize colors in `assets/css/main.css`:

```css
:root {
    --primary: #2dd4bf;
    --secondary: #8b5cf6;
    /* Add your custom colors */
}
```

### User Agent
Change the default user agent in Settings or modify the default in `config.js`:

```javascript
userAgent: 'WebCrawler4J/1.0 (Your Custom String)'
```

## 🔧 Advanced Usage

### Programmatic API

You can interact with WebCrawler4J programmatically via the console:

```javascript
// Access the app
const { app, storage, config, ui } = window.webcrawler4j;

// Start a crawl programmatically
const crawlConfig = {
    name: 'My Crawl',
    seedUrls: ['https://example.com'],
    maxDepth: 2,
    maxPages: 50,
    // ... other options
};

const crawler = new WebCrawler(crawlConfig);
await crawler.start();

// Export all crawls
const crawls = await storage.getAllCrawls();
console.log(crawls);
```

### Event Handling

The crawler emits several events:

```javascript
crawler.on('onProgress', (progress) => {
    console.log(`Processed: ${progress.processed}`);
    console.log(`Queued: ${progress.queued}`);
});

crawler.on('onPageCrawled', (page) => {
    console.log(`Crawled: ${page.url}`);
});

crawler.on('onError', (error, url) => {
    console.error(`Error on ${url}:`, error);
});

crawler.on('onComplete', (stats, results) => {
    console.log('Crawl complete!', stats);
});
```

## 🛡️ Limitations & Best Practices

### Browser Limitations
- **CORS**: Cannot crawl sites with strict CORS policies
- **Memory**: Large crawls may consume significant browser memory
- **Storage**: IndexedDB has browser-specific size limits (~50MB - 500MB)
- **Performance**: Slower than native applications for large-scale crawls

### Best Practices
1. **Start Small**: Test with `maxPages: 10` first
2. **Be Polite**: Use appropriate `politenessDelay` (200ms minimum)
3. **Respect robots.txt**: Keep this enabled unless you have permission
4. **Monitor Memory**: Close other tabs when running large crawls
5. **Export Regularly**: Export data to prevent loss

### Use Cases
✅ **Good For:**
- Small to medium website analysis
- Link checking
- Content auditing
- SEO analysis
- Learning web scraping concepts
- Prototyping crawl strategies

❌ **Not Suitable For:**
- Large-scale web crawling (millions of pages)
- Sites requiring authentication
- JavaScript-heavy single-page applications
- High-frequency crawling
- Production data pipelines

## 📊 Storage

WebCrawler4J uses IndexedDB by default, with LocalStorage as a fallback:

```javascript
// Data structure
{
    crawls: [
        {
            id: 'unique-id',
            name: 'My Crawl',
            seedUrls: [...],
            stats: {...},
            timestamp: 1234567890
        }
    ],
    pages: [
        {
            id: 'page-id',
            crawlId: 'crawl-id',
            url: 'https://...',
            html: '...',
            status: 200
        }
    ]
}
```

## 🤝 Contributing

Contributions are welcome! Here are some ways you can help:

- Report bugs
- Suggest new features
- Improve documentation
- Submit pull requests

## 📄 License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by [crawler4j](https://github.com/yasserg/crawler4j)
- Built with modern web standards
- Designed with ❤️ for developers

## 📞 Support

- **Issues**: Report bugs or request features
- **Documentation**: Check out the full documentation
- **Community**: Join discussions

## 🗺️ Roadmap

- [ ] Visual sitemap generation
- [ ] Advanced filtering rules
- [ ] Scheduled crawls
- [ ] Cloud export (Google Drive, Dropbox)
- [ ] Custom extractors
- [ ] Graph visualization
- [ ] Performance analytics
- [ ] Browser extension version

---

**Star this project if you find it useful!** ⭐
