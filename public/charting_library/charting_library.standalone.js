/* Placeholder for TradingView Charting Library.
 * -------------------------------------------------
 * You MUST replace this file and the folder contents
 * with the official TradingView Charting Library distribution
 * obtained from: https://www.tradingview.com/HTML5-stock-forex-bitcoin-charting-library/
 * (requires applying for a free license for non‑commercial / evaluation use).
 *
 * Steps:
 * 1. Delete this placeholder file.
 * 2. Copy the entire 'charting_library' folder from the official package into public/.
 *    It must contain (example) files/folders such as:
 *      charting_library.standalone.js
 *      charting_library.js
 *      datafeeds/ (if provided)
 *      static/ (themes, fonts, images)
 * 3. Ensure the path /charting_library/charting_library.standalone.js is reachable in the browser.
 * 4. Reload the asset detail page and switch to Kline mode.
 */
(function(){
  if (typeof window === 'undefined') return;
  if (!window.TradingView) {
    window.TradingView = {
      widget: function(cfg){
        const id = cfg && cfg.container_id ? cfg.container_id : null;
        const el = id && document.getElementById(id);
        if (el) {
          el.innerHTML = ''+
            '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font:12px/1.4 system-ui,Arial,sans-serif;color:#bbb;background:#121212;border:1px solid #2a2a2a;">' +
            '<div style="max-width:480px;padding:16px;text-align:center;">' +
            '<strong>TradingView Library Placeholder</strong><br/><br/>' +
            'Replace public/charting_library/ with the official TradingView Charting Library package to view real candlestick charts.' +
            '<br/><br/>Current symbol: '+ (cfg && cfg.symbol ? cfg.symbol : '(none)') +
            '</div></div>';
        } else {
          console.warn('[TV Placeholder] Container not found for widget.');
        }
        return { remove(){ if(el) el.innerHTML=''; } };
      }
    };
  }
  console.info('[TV Placeholder] Using stub TradingView library. Replace with official distribution.');
})();
