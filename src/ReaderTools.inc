// Reader tools: everything the live preview adds on top of the rendered document (not part of HTML exports).
// Tables (breakout, column resize, remembered widths and scroll), code copy buttons, the context menu,
// copy helpers, link routing, find/print requests, the outline button and dismissable warnings.

inline constexpr const char* s_readerToolsCss = R"TOOLS_CSS(
/* Tables: a table that does not fit the reading column grows into the free pane width (centered on the column),
   and scrolls only when even the whole pane is too narrow. Track 2 = fit-content(column width), tracks 1/3 = the gutters. */
#reader-wrap { container-type: inline-size; }
#content { --reader-doc-pad: 22px; padding-inline: var(--reader-doc-pad); }
#content .reader-table-wrap {
    --reader-gutter: calc((100cqw - min(100cqw, var(--reader-max-width, 860px))) / 2 + var(--reader-doc-pad));
    display: grid;
    grid-template-columns: minmax(0, var(--reader-gutter)) fit-content(calc(100cqw - 2 * var(--reader-gutter))) minmax(0, var(--reader-gutter));
    width: 100cqw;
    margin: 1em 0;
    margin-inline-start: calc(-1 * var(--reader-gutter));
    overflow-x: auto;
}
#content .reader-table-wrap > table { grid-column: 2; display: table; width: auto; margin: 0; overflow: visible; }
#content .reader-table-wrap th { position: relative; }
/* still too wide: cap the height so the horizontal scrollbar stays on screen instead of below a long table */
#content .reader-table-wrap.reader-table-overflow { max-height: calc(100vh - 48px); overflow: auto; }
#content .reader-table-overflow thead th { position: sticky; top: 0; z-index: 1; }
.reader-col-grip { position: absolute; top: 0; bottom: 0; inset-inline-end: 0; width: 7px; cursor: col-resize; touch-action: none; }
.reader-col-grip:hover, .reader-col-grip.active { background: var(--link-color); opacity: 0.45; }
body.reader-col-resizing { cursor: col-resize; user-select: none; }

/* Copy button on code blocks: visible on hover or keyboard focus */
#content pre { position: relative; }
.reader-copy-code {
    position: absolute; top: 6px; right: 6px;
    display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 26px; padding: 0;
    border: 1px solid var(--border-color); border-radius: 6px; background: var(--toolbar-bg); color: var(--text-secondary);
    cursor: pointer; opacity: 0; transition: opacity 0.12s ease, color 0.12s ease;
}
#content pre:hover > .reader-copy-code, .reader-copy-code:focus-visible, .reader-copy-code.copied { opacity: 1; }
.reader-copy-code:hover { color: var(--link-color); border-color: var(--link-color); }
.reader-copy-code.copied { color: var(--link-color); }
.reader-copy-code svg { width: 15px; height: 15px; pointer-events: none; }

/* Outline button, next to the settings button */
#toc-fab {
    position: fixed; right: 58px; bottom: 16px; width: 34px; height: 34px; z-index: 9985;
    display: flex; align-items: center; justify-content: center;
    background: var(--toolbar-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border-color); border-radius: 50%; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    color: var(--text-secondary); cursor: pointer; transition: color 0.15s ease, border-color 0.15s ease;
}
#toc-fab:hover, body.toc-open #toc-fab { color: var(--link-color); border-color: var(--link-color); }
body.toc-open #toc-fab { right: 332px; }
#toc-fab:focus-visible, .reader-warning-close:focus-visible { outline: 2px solid var(--link-color); outline-offset: 2px; }
.reader-menu-item:focus-visible { outline: none; background: rgba(128, 128, 128, 0.16); }
@media (max-width: 650px) { body.toc-open #toc-fab { right: 58px; } }

/* Context menu: the settings popover's look */
#reader-menu {
    position: fixed; z-index: 9995; min-width: 190px; max-width: calc(100vw - 16px); padding: 4px;
    background: var(--toolbar-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border-color); border-radius: 10px; box-shadow: var(--toolbar-shadow);
    font: 13px var(--font-ui); color: var(--text-primary); user-select: none;
}
#reader-menu[hidden] { display: none; }
.reader-menu-item {
    display: flex; align-items: center; gap: 16px; width: 100%; padding: 6px 10px; border: 0; border-radius: 6px;
    background: none; color: inherit; font: inherit; text-align: start; cursor: pointer;
}
.reader-menu-item:hover:not(:disabled) { background: rgba(128, 128, 128, 0.16); }
.reader-menu-item:disabled { opacity: 0.45; cursor: default; }
.reader-menu-key { margin-inline-start: auto; color: var(--text-secondary); font-size: 12px; }
.reader-menu-sep { height: 1px; margin: 4px 6px; background: var(--border-color); }

/* Warnings stay readable and can be dismissed (the layer itself lets clicks through to the page) */
#reader-warnings > div:not([hidden]) { pointer-events: auto; display: flex; gap: 10px; align-items: flex-start; user-select: text; }
.reader-warning-text { flex: 1; min-width: 0; }
.reader-warning-close { flex: 0 0 auto; border: 0; background: none; color: inherit; cursor: pointer; font-size: 16px; line-height: 1; padding: 0 2px; opacity: 0.7; }
.reader-warning-close:hover { opacity: 1; }
@media print { #toc-fab, #reader-menu, .reader-copy-code, .reader-col-grip { display: none !important; } }
)TOOLS_CSS";

inline constexpr const char* s_readerToolsHtml = R"TOOLS_HTML(
<button id="toc-fab" title="Outline" aria-label="Outline" aria-controls="toc-drawer" onclick="toggleTocFromMenu()">
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>
</button>
<div id="reader-menu" role="menu" hidden></div>
)TOOLS_HTML";

inline constexpr const char* s_readerToolsScript = R"TOOLS_JS(
var READER_COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
var READER_DONE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

function postToHost(message) {
    if (!window.chrome || !window.chrome.webview) return false;
    window.chrome.webview.postMessage(message);
    return true;
}

// ---- Warnings ---------------------------------------------------------------------------------------------
function setReaderWarning(id, text) {
    var warning = document.getElementById(id);
    if (!warning) return;
    warning.hidden = !text;
    warning.textContent = '';
    if (!text) return;
    var span = document.createElement('span');
    span.className = 'reader-warning-text';
    span.textContent = text;
    var close = document.createElement('button');
    close.className = 'reader-warning-close';
    close.type = 'button';
    close.title = 'Dismiss';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×';
    close.addEventListener('click', function() { warning.hidden = true; warning.textContent = ''; });
    warning.append(span, close);
}
// A script failure outside the renderer's own error view would otherwise only reach the host's log.
window.addEventListener('error', function(event) {
    if (event.target !== window) return; // resource load errors (a missing image) are not script failures
    setReaderWarning('reader-script-warning', 'The preview hit a script error and may be incomplete: ' + (event.message || 'unknown error') + '. Reopen the panel to reload it.');
});

// ---- Clipboard -------------------------------------------------------------------------------------------
// Runs inside the click that asked for it: execCommand('copy') with our own data works in any origin
// (the page is an opaque about:blank, where the async Clipboard API is not guaranteed).
function copyToClipboard(html, text) {
    var copied = false;
    function onCopy(event) {
        event.preventDefault();
        if (html) event.clipboardData.setData('text/html', html);
        event.clipboardData.setData('text/plain', text);
        copied = true;
    }
    document.addEventListener('copy', onCopy, true);
    try { document.execCommand('copy'); } catch (e) {} finally { document.removeEventListener('copy', onCopy, true); }
    if (!copied) setReaderWarning('reader-operation-warning', 'Copying failed. Select the text and press Ctrl+C.');
    return copied;
}
function codeText(pre) {
    var code = pre.querySelector('code');
    return (code || pre).textContent.replace(/\n$/, '');
}
function tableClipboard(table) {
    var clone = table.cloneNode(true);
    clone.querySelectorAll('.reader-col-grip').forEach(function(grip) { grip.remove(); });
    clone.removeAttribute('style');
    clone.querySelectorAll('[style]').forEach(function(cell) { cell.removeAttribute('style'); });
    clone.querySelectorAll('[data-line]').forEach(function(element) { element.removeAttribute('data-line'); });
    clone.removeAttribute('data-line');
    // Tab-separated text pastes into spreadsheet cells; tabs/newlines inside a cell would split it.
    var text = Array.from(table.rows).map(function(row) {
        return Array.from(row.cells).map(function(cell) { return cell.innerText.replace(/[\t\r\n]+/g, ' ').trim(); }).join('\t');
    }).join('\n');
    return {html: clone.outerHTML, text: text};
}

// ---- Code copy buttons -----------------------------------------------------------------------------------
function decorateCodeBlocks() {
    document.querySelectorAll('#content pre').forEach(function(pre) {
        if (pre.querySelector(':scope > .reader-copy-code')) return;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'reader-copy-code';
        button.title = 'Copy code';
        button.setAttribute('aria-label', 'Copy code');
        button.innerHTML = READER_COPY_ICON;
        button.addEventListener('click', function(event) {
            event.stopPropagation();
            if (!copyToClipboard('', codeText(pre))) return;
            button.classList.add('copied');
            button.innerHTML = READER_DONE_ICON;
            setTimeout(function() { button.classList.remove('copied'); button.innerHTML = READER_COPY_ICON; }, 1400);
        });
        button.addEventListener('dblclick', function(event) { event.stopPropagation(); });
        pre.prepend(button);
    });
}

// ---- Links -----------------------------------------------------------------------------------------------
// In-page anchors scroll here; everything else (web, mail, local files such as other.md) goes to the host,
// which opens web/mail links in the default app and local files in Notepad++.
function scrollToAnchor(id) {
    var target = document.getElementById(id) || document.querySelector('[name="' + CSS.escape(id) + '"]');
    if (target) target.scrollIntoView({block: 'start'});
    return !!target;
}
document.addEventListener('click', function(event) {
    if (event.button !== 0 || event.defaultPrevented) return;
    var link = event.target.closest && event.target.closest('#content a[href]');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    event.preventDefault();
    if (href.charAt(0) === '#') {
        var id = href.slice(1);
        try { id = decodeURIComponent(id); } catch (e) {}
        scrollToAnchor(id);
        return;
    }
    if (href) postToHost('openLink:' + href);
});
// A middle click would ask WebView2 for a new window; links open only through the click route above.
document.addEventListener('auxclick', function(event) { if (event.target.closest && event.target.closest('#content a[href]')) event.preventDefault(); });

// ---- Find / print ----------------------------------------------------------------------------------------
function findInPreview() {
    var selection = String(window.getSelection ? window.getSelection() : '').trim().slice(0, 256);
    if (!postToHost(selection && selection.indexOf('\n') < 0 ? 'find:' + selection : 'find')) showToast('Find is available in the preview panel');
}
function printPreview() { closeReaderMenu(); if (!postToHost('print')) window.print(); }
// Ctrl+<letter> as the user means it: the typed letter on Latin layouts (Dvorak, AZERTY move keys), and the
// physical key where the layout types no Latin letter (Russian: Ctrl+А is the F key).
function shortcutLetter(event, letter) {
    var key = String(event.key || '').toLowerCase();
    return key === letter || (!/^[a-z]$/.test(key) && event.code === 'Key' + letter.toUpperCase());
}
document.addEventListener('keydown', function(event) {
    if (!event.ctrlKey || event.altKey || event.shiftKey) return;
    if (shortcutLetter(event, 'f')) { event.preventDefault(); findInPreview(); }
    else if (shortcutLetter(event, 'p')) { event.preventDefault(); printPreview(); }
});

// ---- Context menu ----------------------------------------------------------------------------------------
var readerMenuActions = [];
function closeReaderMenu() {
    var menu = document.getElementById('reader-menu');
    if (menu && !menu.hidden) { menu.hidden = true; menu.textContent = ''; readerMenuActions = []; }
}
function readerMenuItems(target) {
    var selection = String(window.getSelection ? window.getSelection() : '');
    var link = target.closest('#content a[href]');
    var pre = target.closest('#content pre');
    var table = target.closest('#content table');
    var items = [
        {label: 'Copy', key: 'Ctrl+C', disabled: !selection, run: function() { document.execCommand('copy'); }},
        link ? {label: 'Copy link address', run: function() { copyToClipboard('', link.getAttribute('href')); }} : null,
        pre ? {label: 'Copy code', run: function() { copyToClipboard('', codeText(pre)); }} : null,
        table ? {label: 'Copy table', run: function() { var data = tableClipboard(table); if (copyToClipboard(data.html, data.text)) showToast('Table copied'); }} : null,
        {label: 'Select all', key: 'Ctrl+A', run: function() { var range = document.createRange(); range.selectNodeContents(document.getElementById('content')); var s = window.getSelection(); s.removeAllRanges(); s.addRange(range); }},
        'separator',
        {label: 'Find in preview', key: 'Ctrl+F', run: findInPreview},
        {label: 'Print / Save as PDF', key: 'Ctrl+P', run: printPreview},
        {label: document.body.classList.contains('toc-open') ? 'Hide outline' : 'Show outline', run: toggleTocFromMenu}
    ];
    return items.filter(Boolean);
}
function openReaderMenu(x, y, target) {
    var menu = document.getElementById('reader-menu');
    if (!menu) return;
    closeThemePopover();
    menu.textContent = '';
    readerMenuActions = [];
    readerMenuItems(target).forEach(function(item) {
        if (item === 'separator') { var sep = document.createElement('div'); sep.className = 'reader-menu-sep'; sep.setAttribute('role', 'separator'); menu.append(sep); return; }
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'reader-menu-item';
        button.setAttribute('role', 'menuitem');
        button.disabled = !!item.disabled;
        var label = document.createElement('span');
        label.textContent = item.label;
        button.append(label);
        if (item.key) { var key = document.createElement('span'); key.className = 'reader-menu-key'; key.textContent = item.key; button.append(key); }
        button.addEventListener('click', function(event) { event.stopPropagation(); closeReaderMenu(); item.run(); });
        readerMenuActions.push(button);
        menu.append(button);
    });
    menu.hidden = false;
    var bounds = menu.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8)) + 'px';
    menu.style.top = Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8)) + 'px';
    var first = readerMenuActions.find(function(button) { return !button.disabled; });
    if (first) first.focus({preventScroll: true});
}
document.addEventListener('contextmenu', function(event) {
    if (event.target.closest('#theme-popover, #reader-menu, #toc-drawer')) { event.preventDefault(); return; }
    event.preventDefault();
    openReaderMenu(event.clientX, event.clientY, event.target);
});
document.addEventListener('mousedown', function(event) { if (!event.target.closest('#reader-menu')) closeReaderMenu(); }, true);
document.addEventListener('keydown', function(event) {
    var menu = document.getElementById('reader-menu');
    if (!menu || menu.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeReaderMenu(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        var buttons = readerMenuActions.filter(function(button) { return !button.disabled; });
        var index = buttons.indexOf(document.activeElement);
        buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus();
    }
}, true);
window.addEventListener('blur', closeReaderMenu);
window.addEventListener('resize', closeReaderMenu);
document.addEventListener('scroll', closeReaderMenu, {passive: true, capture: true});

// ---- Tables ----------------------------------------------------------------------------------------------
// Column widths the user dragged: "bufferId|tableFingerprint" -> [px]. The native host persists them per file
// (tableWidths messages both ways), so they survive re-renders and Notepad++ restarts.
var readerColumnWidths = new Map();
// Scroll offsets inside overflowing tables, same keys; kept for the session so an edit does not reset them.
var readerTableScroll = new Map();
var readerTableObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(markOverflowingTables) : null;

function markOverflowingTables() {
    document.querySelectorAll('#content .reader-table-wrap').forEach(function(wrap) {
        wrap.classList.toggle('reader-table-overflow', wrap.scrollWidth > wrap.clientWidth + 1);
    });
}
function applyColumnWidths(table, widths) {
    var cells = Array.from(table.rows[0].cells);
    table.style.tableLayout = widths ? 'fixed' : '';
    table.style.width = widths ? widths.reduce(function(sum, w) { return sum + w; }, 0) + 'px' : '';
    cells.forEach(function(cell, i) { cell.style.width = widths ? widths[i] + 'px' : ''; });
}
function startColumnResize(event, table, key, column) {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    var grip = event.currentTarget;
    var widths = Array.from(table.rows[0].cells).map(function(cell) { return Math.round(cell.getBoundingClientRect().width); });
    var rtl = getComputedStyle(table).direction === 'rtl';
    var startX = event.clientX, startWidth = widths[column];
    grip.setPointerCapture(event.pointerId);
    grip.classList.add('active');
    document.body.classList.add('reader-col-resizing');
    function move(e) {
        widths[column] = Math.max(40, startWidth + Math.round(rtl ? startX - e.clientX : e.clientX - startX));
        applyColumnWidths(table, widths);
    }
    function end() {
        grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', end); grip.removeEventListener('pointercancel', end);
        grip.classList.remove('active');
        document.body.classList.remove('reader-col-resizing');
        readerColumnWidths.delete(key); // re-insert: the most recently resized table goes last
        readerColumnWidths.set(key, widths.slice());
        persistTableWidths(key);
        markOverflowingTables();
    }
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
}
// A table is identified by its header text (+ the column count and its occurrence among same-header tables),
// so widths follow the table when other tables are added or removed around it.
function tableFingerprint(table, seen) {
    var text = Array.from(table.rows[0].cells).map(function(cell) { return cell.textContent.trim(); }).join('\u0001');
    seen[text] = (seen[text] || 0) + 1;
    text += '\u0002' + table.rows[0].cells.length + '\u0002' + seen[text];
    var hash = 0x811c9dc5;
    for (var i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
    return ('0000000' + hash.toString(16)).slice(-8);
}
// Wire format (validated natively): "fp:w,w,...;fp:w,..." with fp = 8 hex digits.
function persistTableWidths(key) {
    var bufferId = key.slice(0, key.indexOf('|'));
    if (!/^\d+$/.test(bufferId)) return;
    var entries = [];
    readerColumnWidths.forEach(function(widths, k) {
        if (k.indexOf(bufferId + '|') === 0) entries.push(k.slice(bufferId.length + 1) + ':' + widths.join(','));
    });
    // Oldest first (a resize moves its table to the end): keep the most recently resized tables when a document
    // collects more than the host stores. A table whose header is being edited keeps its widths meanwhile.
    var value = entries.slice(-60).join(';');
    while (value.length > 4096) value = value.indexOf(';') < 0 ? '' : value.slice(value.indexOf(';') + 1);
    postToHost('tableWidths:' + bufferId + ':' + value);
}
function receiveTableWidths(bufferId, value) {
    if (!/^\d+$/.test(bufferId) || !/^[0-9a-f:,;]*$/.test(value)) return;
    Array.from(readerColumnWidths.keys()).forEach(function(k) { if (k.indexOf(bufferId + '|') === 0) readerColumnWidths.delete(k); });
    value.split(';').forEach(function(entry) {
        var match = /^([0-9a-f]{8}):(\d{1,4}(?:,\d{1,4})*)$/.exec(entry);
        if (match) readerColumnWidths.set(bufferId + '|' + match[1], match[2].split(',').map(Number));
    });
    if (window.readerDocumentIndex && window.readerDocumentIndex.bufferId === bufferId) layoutReaderTables(window.readerDocumentIndex);
}
function layoutReaderTables(detail) {
    var content = document.getElementById('content');
    if (!content) return;
    var bufferId = detail && detail.bufferId || '';
    var seen = Object.create(null), restore = [];
    Array.from(content.querySelectorAll('table')).filter(function(table) {
        return table.id !== 'hrdftrtbl' && !table.parentElement.closest('table') && table.rows.length;
    }).forEach(function(table) {
        var cells = Array.from(table.rows[0].cells);
        var key = bufferId + '|' + tableFingerprint(table, seen);
        var wrap = table.parentElement;
        if (!wrap.classList.contains('reader-table-wrap')) {
            wrap = document.createElement('div');
            wrap.className = 'reader-table-wrap';
            table.before(wrap); wrap.appendChild(table);
            wrap.addEventListener('scroll', function() {
                readerTableScroll.delete(key);
                if (wrap.scrollLeft || wrap.scrollTop) readerTableScroll.set(key, {left: wrap.scrollLeft, top: wrap.scrollTop});
                while (readerTableScroll.size > 200) readerTableScroll.delete(readerTableScroll.keys().next().value);
            }, {passive: true});
        }
        cells.forEach(function(cell, column) {
            if (cell.querySelector(':scope > .reader-col-grip')) return;
            var grip = document.createElement('span');
            grip.className = 'reader-col-grip';
            grip.title = 'Drag to resize the column, double-click to reset';
            grip.setAttribute('aria-hidden', 'true');
            grip.addEventListener('pointerdown', function(e) { startColumnResize(e, table, key, column); });
            grip.addEventListener('dblclick', function(e) { e.stopPropagation(); readerColumnWidths.delete(key); applyColumnWidths(table, null); persistTableWidths(key); markOverflowingTables(); });
            cell.appendChild(grip);
        });
        var saved = readerColumnWidths.get(key);
        applyColumnWidths(table, saved && saved.length === cells.length ? saved : null);
        if (readerTableScroll.has(key)) restore.push([wrap, readerTableScroll.get(key)]);
    });
    if (readerTableObserver) readerTableObserver.observe(document.getElementById('reader-wrap'));
    markOverflowingTables();
    // after the overflow class: only then do overflowing wraps have their own vertical scroll range
    restore.forEach(function(pair) { pair[0].scrollLeft = pair[1].left; pair[0].scrollTop = pair[1].top; });
}

// ---- Images ----------------------------------------------------------------------------------------------
// A relative src ("img/a.png", "./a.png", "sub/../a.png") is served from the document's folder through the
// host's virtual folder mapping (docBase). Paths that climb above that folder, absolute paths and URLs stay as
// written: the mapping exposes nothing outside the document's own folder tree.
function documentRelativeUrl(src, base) {
    if (!base || !src || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|\\|#)/i.test(src)) return null;
    var path = src.replace(/\\/g, '/').split(/[?#]/)[0], parts = [];
    var segments = path.split('/');
    for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];
        if (!segment || segment === '.') continue;
        if (segment === '..') { if (!parts.length) return null; parts.pop(); continue; }
        var decoded = segment;
        try { decoded = decodeURIComponent(segment); } catch (e) {}
        // an encoded separator, a stream name, a device name or a dot/space-trimmed ".." (Windows drops trailing
        // dots and spaces) must not climb or reach a device
        if (/[\\/:\0]/.test(decoded) || /[. ]$/.test(decoded) || /^(?:con|prn|aux|nul|com\d|lpt\d)(?:\.|$)/i.test(decoded)) return null;
        parts.push(decoded);
    }
    if (!parts.length) return null;
    return base + parts.map(encodeURIComponent).join('/');
}
function resolveDocumentImages(detail) {
    var base = detail && detail.docBase || '';
    document.querySelectorAll('#content img[src]').forEach(function(image) {
        var url = documentRelativeUrl(image.getAttribute('src'), base);
        if (url) image.src = url;
    });
}

// ---- Wiring ----------------------------------------------------------------------------------------------
function decorateReaderDocument(detail) {
    closeReaderMenu();
    resolveDocumentImages(detail);
    layoutReaderTables(detail);
    decorateCodeBlocks();
}
if (window.chrome && window.chrome.webview) {
    window.chrome.webview.addEventListener('message', function(event) {
        var data = event.data;
        if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { return; } }
        if (data && data.type === 'notice' && typeof data.text === 'string') showToast(data.text, 6000);
    });
}
document.addEventListener('readerRendered', function(event) { decorateReaderDocument(event.detail); });
function initializeReaderTools() {
    if (window.readerDocumentIndex) decorateReaderDocument(window.readerDocumentIndex);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeReaderTools);
else initializeReaderTools();
)TOOLS_JS";
