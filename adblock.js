(function() {
  console.log("AdBlock loaded in Z-Stream desktop application!");

  // List of common ad, popunder, and tracking domains/keywords
  const blocklist = [
    "adsystem", "adservice", "google-analytics", "doubleclick",
    "popads", "popcash", "onclickads", "exoclick", "juicyads",
    "propellerads", "adsterra", "yandex.ru/clck", "adnxs",
    "admultimedia", "bet365", "1xbet", "mostbet", "pin-up",
    "casino", "gambling", "popunder", "adrun", "adskeeper",
    "mgid", "outbrain", "taboola", "criteo", "amazon-adsystem",
    "a.shorte.st", "adf.ly", "coinhive", "miner", "acscdn", "acscdn.com"
  ];

  function shouldBlock(url) {
    if (!url) return false;
    const urlStr = String(url).toLowerCase();
    return blocklist.some(domain => urlStr.includes(domain));
  }

  // 1. Block window.open popups/popunders
  const originalWindowOpen = window.open;
  window.open = function(url, name, specs) {
    if (shouldBlock(url)) {
      console.log("AdBlock: Blocked popup window to:", url);
      return null;
    }
    if (!url || url === 'about:blank') {
      console.log("AdBlock: Blocked empty/suspicious popup.");
      return null;
    }
    return originalWindowOpen.apply(this, arguments);
  };

  // 2. Intercept fetch
  if (window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
      if (shouldBlock(url)) {
        console.log("AdBlock: Blocked fetch request to:", url);
        return Promise.reject(new TypeError("Blocked by AdBlock"));
      }
      return originalFetch.apply(this, arguments);
    };
  }

  // 3. Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (shouldBlock(url)) {
      console.log("AdBlock: Blocked XHR request to:", url);
      this.send = function() {}; // Override send to do nothing
      return;
    }
    return originalOpen.apply(this, arguments);
  };

  // 4. Intercept script injection in document
  const originalAppendChild = Element.prototype.appendChild;
  Element.prototype.appendChild = function(child) {
    if (child && child.tagName === 'SCRIPT' && shouldBlock(child.src)) {
      console.log("AdBlock: Blocked script injection:", child.src);
      return child;
    }
    return originalAppendChild.apply(this, arguments);
  };

  const originalInsertBefore = Element.prototype.insertBefore;
  Element.prototype.insertBefore = function(newChild, refChild) {
    if (newChild && newChild.tagName === 'SCRIPT' && shouldBlock(newChild.src)) {
      console.log("AdBlock: Blocked script insertion:", newChild.src);
      return newChild;
    }
    return originalInsertBefore.apply(this, arguments);
  };

  // 5. Hide common ad banner classes and frames
  const adSelectors = [
    'iframe[src*="ads"]', 'iframe[src*="adsystem"]', 'iframe[src*="pop"]',
    '.ad-container', '.ads-container', '.ads-wrapper', '#ad-banner',
    '.banner-ads', '.mgid-widget', '.taboola-ad', '.outbrain-ad'
  ];

  function hideAds() {
    // 5.1 Hide elements by selectors
    adSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el.style.display !== 'none') {
          console.log("AdBlock: Hiding ad element:", selector);
          el.style.setProperty('display', 'none', 'important');
        }
      });
    });

    // 5.2 Find and hide elements containing "Advertisement" text
    document.querySelectorAll('span').forEach(el => {
      if (el.textContent && el.textContent.trim().toLowerCase() === 'advertisement') {
        const parent = el.closest('div.relative.rounded-lg');
        if (parent && parent.style.display !== 'none') {
          console.log("AdBlock: Hiding native ad component wrapper");
          parent.style.setProperty('display', 'none', 'important');
        }
      }
    });
  }

  // Run DOM ad hiding on load and periodically
  window.addEventListener('DOMContentLoaded', hideAds);
  setInterval(hideAds, 100);
})();
