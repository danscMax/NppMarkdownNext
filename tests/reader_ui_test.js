async () => {
    if (!Array.isArray(window.__messages)) throw new Error('Run against the local mock-host reader fixture');
    const checks = [];
    function expect(condition, description) {
        if (!condition) throw new Error(description);
        checks.push(description);
    }
    function finishAnimations() { document.getAnimations().forEach(animation => animation.finish()); }
    function row(label) {
        const element = [...document.querySelectorAll('#theme-pop-list .theme-pop-item')]
            .find(item => item.textContent.trim().startsWith(label));
        if (!element) throw new Error('Missing menu row: ' + label);
        return element;
    }
    function settings() {
        closeThemePopover();
        document.getElementById('theme-fab').click();
        finishAnimations();
    }
    function themes() { settings(); row('Theme:').click(); }
    function selectTheme(id) {
        themes();
        if (id === 'bearded' || id.startsWith('bearded-v-')) {
            document.querySelector('#theme-pop-list [data-theme="bearded"]').click();
        }
        const element = document.querySelector('#theme-pop-list [data-theme="' + id + '"]');
        if (!element) throw new Error('Missing theme: ' + id);
        element.click();
        finishAnimations();
    }
    settings();
    expect(document.querySelectorAll('#theme-pop-list .theme-pop-item').length === 11, 'All ten legacy settings and Typography are present');
    expect(document.getElementById('theme-fab').getAttribute('aria-expanded') === 'true', 'Gear opens the settings menu');
    const originalText = document.getElementById('content').textContent;
    const options = [...THEME_LIST, ...window.BEARDED_VARIANTS];
    const normalizer = document.createElement('span');
    normalizer.style.display = 'none';
    document.body.appendChild(normalizer);
    for (const option of options) {
        selectTheme(option.id);
        const css = getComputedStyle(document.body);
        normalizer.style.color = css.getPropertyValue('--bg-page');
        expect(css.backgroundColor === getComputedStyle(normalizer).color, 'Palette applies: ' + option.id);
        expect(window._themeId === option.id, 'Theme selection persists: ' + option.id);
        expect(document.getElementById('content').textContent === originalText, 'Theme preserves Markdown: ' + option.id);
    }
    normalizer.remove();
    selectTheme('light');
    const lightClass = document.body.className;
    const messageCount = window.__messages.length;
    themes();
    document.querySelector('#theme-pop-list [data-theme="dark"]').dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
    finishAnimations();
    expect(document.body.classList.contains('dark'), 'Hover previews a different theme');
    expect(window._themeId === 'light' && window.__messages.length === messageCount, 'Hover does not persist a theme');
    document.getElementById('theme-popover').dispatchEvent(new MouseEvent('mouseleave'));
    finishAnimations();
    expect(document.body.className === lightClass, 'Leaving the theme menu restores the selected theme');
    for (const [label, field] of [['Sync with caret', '_syncEnabled'], ['Smart BiDi', '_bidiEnabled'], ['Auto-show for Markdown', '_autoShowPanel']]) {
        settings(); row(label).click();
        expect(window[field] === false && row(label).getAttribute('aria-pressed') === 'false', label + ' toggles off');
        row(label).click();
        expect(window[field] === true, label + ' toggles back on');
    }
    settings(); row('Outline / TOC').click();
    expect(document.body.classList.contains('toc-open') && !document.getElementById('toc-drawer').inert, 'Outline opens');
    expect(document.querySelectorAll('#toc-drawer .toc-item').length === 2, 'Outline lists the actual headings');
    document.querySelector('.toc-close').click();
    expect(!document.body.classList.contains('toc-open') && document.getElementById('toc-drawer').inert, 'Outline closes');
    settings(); row('Zoom:').click(); row('125%').click();
    expect(window._zoomPercent === 125, 'Zoom preset reaches the host');
    row('Zoom in').click(); expect(window._zoomPercent === 135, 'Zoom in updates the menu');
    row('Zoom out').click(); expect(window._zoomPercent === 125, 'Zoom out updates the menu');
    row('Reset (100%)').click(); expect(window._zoomPercent === 100, 'Zoom resets');
    selectTheme('follow');
    settings(); row('Dark mode:').click(); row('Light').click();
    expect(window._darkMode === 0, 'Dark mode override reaches the host');
    settings(); row('Dark mode:').click(); row('Auto (follow').click();
    expect(window._darkMode === -1, 'Dark mode can follow Notepad++ again');
    function resultFor(command, status, detail = '') {
        const operation = command.startsWith('copyHtml:') ? 'copyHtml' : 'saveAsHtml';
        window.__emit({type:'operationResult',operation,status,detail,error:status==='failed'?5:0,recoveryPath:'',requestId:command.slice(operation.length+1)});
    }
    settings(); row('Copy HTML').click();
    const copy = window.__messages.findLast(message => message.startsWith('copyHtml:'));
    expect(!!copy, 'Copy HTML reaches the host with an operation ID');
    resultFor(copy, 'succeeded');
    settings(); row('Save HTML...').click();
    const save = window.__messages.findLast(message => message.startsWith('saveAsHtml:'));
    expect(!!save, 'Save HTML reaches the host with an operation ID');
    resultFor(save, 'cancelled');
    settings(); row('About NppMarkdownNext').click();
    expect(document.getElementById('theme-pop-list').textContent.includes('v1.6.0'), 'About shows the current version');
    expect(document.querySelectorAll('#content > ol > li').length === 10, 'Numbering has ten top-level items');
    expect(document.querySelectorAll('#content ol ul').length === 2, 'Both nested lists stay inside the ordered list');
    selectTheme('bearded-v-gold-d-raynh');
    const gold = getComputedStyle(document.body).backgroundColor;
    expect(gold === 'rgb(15, 22, 40)', 'Bearded Gold retains its original background');
    async function settled() { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); finishAnimations(); }
    const scrollRoot = () => window.getReaderScrollRoot();
    const scrollTo = top => { scrollRoot().scrollTop = top; };
    let nativeRevision = 1;
    async function render(markdown, bufferId = '11', caretLine = -1) {
        const theme = window.READER_THEME_CATALOG.find(item => item.id === window._themeId);
        window.__emit({type:'render',markdown,bufferId,caretLine,renderRevision:String(++nativeRevision),title:'Regression',isDark:theme ? theme.isDark : true,isBiDi:true,themeId:window._themeId});
        await settled();
    }
    const color = selector => getComputedStyle(document.querySelector(selector)).color;
    await render('# Gold roles\n\n**Bold** *Italic* `inline`\n\n> Quote\n\n[link](https://example.com)\n\n```python\n# author comment\n```\n');
    for (const [selector, expected] of [['h1','rgb(255, 208, 0)'],['strong','rgb(237, 242, 247)'],['em','rgb(255, 130, 63)'],[':not(pre) > code','rgb(161, 103, 255)'],['blockquote','rgb(228, 172, 115)'],['a','rgb(62, 178, 255)'],['.hljs-comment','rgb(113, 134, 192)']]) {
        expect(color('#content ' + selector) === expected, 'GoldMarkdownRoles ' + selector);
    }
    expect(color('#content') === 'rgb(184, 196, 228)', 'GoldMarkdownRoles body text');
    const tablesMd = '| a | b |\n|---|---|\n| 1 | 2 |\n\n| id | where |\n|---|---|\n| x | `' + 'w'.repeat(140) + '` |\n';
    await render(tablesMd, '31');
    const content = document.getElementById('content'), contentBox = content.getBoundingClientRect();
    const [smallWrap, wideWrap] = content.querySelectorAll('.reader-table-wrap');
    expect(smallWrap && wideWrap && smallWrap.querySelectorAll('.reader-col-grip').length === 2, 'Tables are wrapped and get one resize grip per column');
    expect(Math.abs(smallWrap.firstChild.getBoundingClientRect().left - contentBox.left - parseFloat(getComputedStyle(content).paddingLeft)) < 2, 'A narrow table stays aligned with the reading column');
    expect(wideWrap.firstChild.getBoundingClientRect().width > content.clientWidth || wideWrap.classList.contains('reader-table-overflow'), 'A wide table uses the free pane width or scrolls inside the visible pane');
    const firstTable = () => content.querySelector('.reader-table-wrap table');
    const smallFp = tableFingerprint(firstTable(), {});
    receiveTableWidths('31', smallFp + ':120,200;abc:1');
    expect(firstTable().rows[0].cells[1].style.width === '200px', 'Saved widths from the host apply to the shown document at once, malformed entries are skipped');
    window.__messages.length = 0;
    firstTable().querySelector('.reader-col-grip').dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    expect(firstTable().rows[0].cells[1].style.width === '' && window.__messages.includes('tableWidths:31:'), 'Resetting a column sends the updated widths to the host');
    receiveTableWidths('31', smallFp + ':120,200');
    await render('| new | table |\n|---|---|\n| 0 | 0 |\n\n' + tablesMd, '31');
    const moved = content.querySelectorAll('.reader-table-wrap table')[1];
    expect(moved.rows[0].cells[1].style.width === '200px' && content.querySelector('.reader-table-wrap table').rows[0].cells[1].style.width === '', 'Widths follow their table when another table is inserted above');
    await render(tablesMd, '32');
    expect(firstTable().rows[0].cells[1].style.width === '', 'Resized column widths do not leak into another buffer');

    // Reader tools: context menu, copy helpers, code buttons, outline button, warnings, links
    await render('Para [site](https://example.com/x) and [plan](notes/plan.md).\n\n| h1 | h2 |\n|---|---|\n| a\tb | c |\n\n```js\nlet x = 1;\n```\n', '33');
    const menu = document.getElementById('reader-menu');
    const menuLabels = () => [...menu.querySelectorAll('.reader-menu-item')].map(item => item.firstChild.textContent);
    content.querySelector('td').dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true, clientX: 40, clientY: 40}));
    expect(!menu.hidden && menuLabels().includes('Copy table') && !menuLabels().includes('Copy code') && menu.querySelector('.reader-menu-item').disabled, 'Context menu offers table actions; Copy is disabled without a selection');
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    expect(menu.hidden, 'Escape closes the context menu');
    content.querySelector('pre code').dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true, clientX: 9999, clientY: 9999}));
    const menuBox = menu.getBoundingClientRect();
    expect(menuLabels().includes('Copy code') && menuBox.right <= window.innerWidth && menuBox.bottom <= window.innerHeight, 'Context menu offers code actions and stays inside the pane');
    window.__messages.length = 0;
    [...menu.querySelectorAll('.reader-menu-item')].find(item => item.textContent.startsWith('Find in preview')).click();
    expect(menu.hidden && window.__messages.includes('find'), 'Find in preview asks the host to open its find bar');
    const tableData = tableClipboard(content.querySelector('table'));
    expect(tableData.text === 'h1\th2\na b\tc' && !tableData.html.includes('reader-col-grip') && !tableData.html.includes('data-line'), 'Copy table yields clean HTML and tab-separated text');
    expect(content.querySelectorAll('pre > .reader-copy-code').length === 1 && codeText(content.querySelector('pre')) === 'let x = 1;', 'Code blocks get one copy button that copies only the code');
    window.__messages.length = 0;
    content.querySelector('a[href="notes/plan.md"]').click();
    content.querySelector('a[href^="https:"]').click();
    expect(window.__messages.join('|') === 'openLink:notes/plan.md|openLink:https://example.com/x', 'Links are routed to the host instead of navigating the preview');
    document.getElementById('toc-fab').click();
    expect(document.body.classList.contains('toc-open'), 'Outline button opens the outline');
    document.getElementById('toc-fab').click();
    expect(!document.body.classList.contains('toc-open'), 'Outline button closes the outline');
    setReaderWarning('reader-operation-warning', 'Test warning');
    const warning = document.getElementById('reader-operation-warning');
    expect(!warning.hidden && getComputedStyle(warning).pointerEvents === 'auto', 'Warnings accept the pointer');
    warning.querySelector('.reader-warning-close').click();
    expect(warning.hidden, 'Warnings can be dismissed');

    // Shortcuts follow the typed letter, and the physical key only where the layout types no Latin letter
    expect(shortcutLetter({key: 'а', code: 'KeyF'}, 'f') && shortcutLetter({key: 'f', code: 'KeyY'}, 'f') && !shortcutLetter({key: 'u', code: 'KeyF'}, 'f') && !shortcutLetter({key: 'l', code: 'KeyP'}, 'p'), 'Ctrl+F/Ctrl+P work on Russian, Dvorak and AZERTY layouts');
    // At most the 60 most recently resized tables of a document are sent to the host
    window.__messages.length = 0;
    for (let i = 0; i < 70; i++) readerColumnWidths.set('77|' + ('0000000' + i.toString(16)).slice(-8), [100, 100]);
    persistTableWidths('77|00000000');
    const sentWidths = window.__messages.find(message => message.startsWith('tableWidths:77:')).split(':').slice(2).join(':').split(';');
    expect(sentWidths.length === 60 && sentWidths[0].startsWith('0000000a:') && sentWidths[59].startsWith('00000045:'), 'Width lists are capped to the most recent tables');
    Array.from(readerColumnWidths.keys()).forEach(key => { if (key.startsWith('77|')) readerColumnWidths.delete(key); });
    // Relative images resolve inside the document's folder only
    const base = 'https://npp-reader-document.local/';
    expect(documentRelativeUrl('img/a b.png', base) === base + 'img/a%20b.png' && documentRelativeUrl('./x/../y.png', base) === base + 'y.png', 'Relative image paths map into the document folder');
    expect(['..%2f..%2fx.png', 'a%5Cb.png', 'x/%2e%2e/y.png', '..%20/x.png', '.../x.png', 'x.png:stream', 'dir./x.png', 'con.png', 'img/NUL', 'COM1.png', 'con.tar.png', 'conin$.png', 'CONOUT$', 'com².png', 'lpt¹.png'].every(src => documentRelativeUrl(src, base) === null) && documentRelativeUrl('console.png', base) === base + 'console.png', 'Encoded separators, dot segments and device names cannot leave the folder');
    expect(['../up.png', '/root.png', 'C:\\x.png', 'https://e.com/a.png', 'data:image/png;base64,AA', '//host/a.png', ''].every(src => documentRelativeUrl(src, base) === null) && documentRelativeUrl('a.png', '') === null, 'Absolute, external and escaping paths are left alone');
    window.__emit({type:'notice', text:'Native notice'});
    expect(document.getElementById('toast-msg').textContent === 'Native notice', 'Host notices appear as toasts');

    // Scrolling: another document jumps to its caret without animation; typing on the caret line does not re-centre
    const longDoc = Array.from({length: 120}, (_, i) => 'Line ' + i).join('\n\n');
    await render(longDoc, '41', -1);
    scrollTo(scrollRoot().scrollHeight);
    await render(longDoc, '42', 0);
    expect(scrollRoot().scrollTop === 0, 'Switching to another document lands on its caret at once (no scroll animation from the old offset)');
    await render(longDoc, '42', 200);
    const centred = scrollRoot().scrollTop;
    await new Promise(resolve => setTimeout(resolve, 700));
    const afterMove = scrollRoot().scrollTop;
    scrollTo(afterMove - 120);
    await render(longDoc + '\n\nTyped', '42', 200);
    expect(afterMove > centred - 1 && Math.abs(scrollRoot().scrollTop - (afterMove - 120)) < 30, 'A render with an unchanged caret line keeps the reader where it is (no re-centring)');

    settings();
    const darkRow = row('Dark mode:');
    const beforeDark = window.__messages.length;
    expect(darkRow.getAttribute('aria-disabled') === 'true', 'DarkModeApplicability locks named palettes');
    darkRow.click(); setDarkModeFromMenu(0);
    expect(window.__messages.length === beforeDark && window._themeId === 'bearded-v-gold-d-raynh', 'DarkModeFixtureMatchesHost rejects named palette override');
    selectTheme('follow'); settings(); row('Dark mode:').click(); row('Light').click();
    expect(!document.body.classList.contains('dark'), 'DarkModeApplicability actually changes Follow palette');
    selectTheme('bearded-v-gold-d-raynh');

    settings(); row('Typography').click(); row('Text size:').click(); row('19px').click();
    openThemeView('typography'); row('Line height:').click(); row('190%').click();
    openThemeView('typography'); row('Reading width:').click(); row('680px').click();
    await settled();
    expect(getComputedStyle(document.getElementById('content')).fontSize === '19px', 'TypographyContentOnly font size');
    expect(Math.abs(parseFloat(getComputedStyle(document.getElementById('content')).lineHeight) - 36.1) < 0.1, 'TypographyContentOnly line height');
    expect(getComputedStyle(document.getElementById('content')).maxWidth === '680px', 'TypographyContentOnly reading width');
    const gearStyle = getComputedStyle(document.getElementById('theme-fab'));
    expect(Math.abs(parseFloat(gearStyle.width) - 34) < 0.1 && Math.abs(parseFloat(gearStyle.height) - 34) < 0.1 && getComputedStyle(row('680px')).fontSize === '13px', 'TypographyContentOnly preserves controls');
    const beforeTypography = window.__messages.length;
    setTypographyFromMenu('fontSize', 999);
    expect(window.__messages.length === beforeTypography, 'Typography rejects unbounded CSS values');
    for (const [kind, value] of [['fontSize',15],['lineHeight',170],['readingWidth',860]]) setTypographyFromMenu(kind,value);

    await render('# Same\n\n# Same\n\n# Привет Мир!\n\n# !!!\n');
    expect(window.readerDocumentIndex.headings.map(item => item.id).join(',') === 'same,same-1,привет-мир,section', 'StableHeadingAnchors unicode and duplicates');
    expect(!!document.getElementById('reader-heading-0'), 'StableHeadingAnchors retain a legacy alias');
    const imageHeading = '# ![Logo](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==)\n';
    await render(imageHeading);
    expect(document.querySelector('#content h1').id === 'logo', 'ImageHeadingAlt produces the same semantic ID as native export');
    expect(document.querySelector('#toc-drawer .toc-item').textContent === 'Logo', 'ImageHeadingAlt supplies the outline label');
    expect(document.querySelector('#content h1 img').getAttribute('alt') === 'Logo', 'ImageHeadingAlt preserves the rendered image');
    await render('<h2 id="reader-heading-0">Manual</h2>\n\n# Content\n\n# Same\n');
    expect(document.getElementById('reader-heading-0').textContent === 'Manual', 'LegacyAnchorCollision preserves author ID');
    expect(document.querySelectorAll('[id="content"]').length === 1 && !!document.getElementById('content-1'), 'AuthorAndReservedIds protects reader controls');
    expect(document.querySelectorAll('[id="reader-heading-0"]').length === 1, 'LegacyAnchorCollision creates no duplicate alias');
    await render('# Intro\n\n# Reader Heading 0\n');
    expect(document.querySelectorAll('#content h1')[1].id === 'reader-heading-0', 'CanonicalHeadingBeforeLegacyAlias preserves the native HTML slug');
    expect(document.getElementById('reader-heading-0').tagName === 'H1', 'CanonicalHeadingBeforeLegacyAlias gives a real heading priority');
    await render('[Jump to section](#destination)\n\n' + ('Ordinary prose #same and https://example.com/#same\n\n').repeat(30) + '# Destination\n\n' + ('Tail text\n\n').repeat(30));
    document.querySelector('#content a[href="#destination"]').click(); await settled();
    expect(scrollRoot().scrollTop > 0 && document.getElementById('destination').getBoundingClientRect().top >= -1 && document.getElementById('destination').getBoundingClientRect().top < window.innerHeight, 'StableHeadingAnchors follows a real Markdown section link');
    expect(document.getElementById('content').textContent.includes('Ordinary prose #same and https://example.com/#same'), 'AnchorDoesNotRewriteProse preserves ordinary text and URLs');

    await render('# First\n\n# Second\n\n# Third\n');
    openToc(); closeThemePopover();
    const secondLink = document.querySelector('#toc-drawer [data-heading-id="second"]');
    secondLink.focus();
    await render('# First\n\n# Second\n\n# Third\n');
    expect(document.activeElement === secondLink && secondLink.isConnected, 'OutlineKeepsFocus reuses focused node');
    await render('# First\n\n# Third\n');
    expect(document.activeElement.isConnected && document.activeElement.closest('#toc-drawer'), 'OutlineKeepsFocus handles a removed heading');
    const longSection = '# First\n\n' + ('Long section words '.repeat(60) + '\n\n').repeat(40) + '# Second\n\n' + ('Tail words '.repeat(60) + '\n\n').repeat(12);
    await render(longSection);
    expect(scrollRoot() === document.body && document.body.scrollHeight > document.body.clientHeight, 'ReaderScrollRoot uses the actual Kelk body container');
    scrollTo(Math.max(100, document.getElementById('second').offsetTop / 2)); await settled();
    expect(document.querySelector('#toc-drawer [aria-current="location"]').dataset.headingId === 'first', 'OutlineCurrentAndEmpty identifies a long section between headings');
    scrollTo(scrollRoot().scrollTop + document.getElementById('second').getBoundingClientRect().top - 39); await settled();
    expect(document.querySelector('#toc-drawer [aria-current="location"]').dataset.headingId === 'second', 'OutlineCurrentAndEmpty uses the forty-pixel boundary');
    const bodyStyle = document.body.getAttribute('style'), htmlStyle = document.documentElement.getAttribute('style');
    try {
        scrollTo(0);
        document.body.style.height = 'auto'; document.body.style.overflow = 'visible';
        document.documentElement.style.height = 'auto'; document.documentElement.style.overflow = 'auto';
        await settled();
        expect(scrollRoot() === document.scrollingElement && scrollRoot().scrollHeight > scrollRoot().clientHeight, 'ReaderScrollRoot falls back to the document container');
        scrollTo(scrollRoot().scrollTop + document.getElementById('second').getBoundingClientRect().top - 39); await settled();
        expect(document.querySelector('#toc-drawer [aria-current="location"]').dataset.headingId === 'second', 'OutlineCurrentAndEmpty follows document-root scrolling too');
    } finally {
        scrollTo(0);
        if (bodyStyle === null) document.body.removeAttribute('style'); else document.body.setAttribute('style', bodyStyle);
        if (htmlStyle === null) document.documentElement.removeAttribute('style'); else document.documentElement.setAttribute('style', htmlStyle);
        await settled(); scrollTo(0);
    }
    closeToc();

    await render('<div data-source-unmapped="true"><p data-line="0">Unknown <input class="task-checkbox" type="checkbox" data-line="0"></p></div>');
    const beforeUnknown = window.__messages.length;
    document.querySelector('#content p').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
    document.querySelector('#content input').click();
    expect(window.__messages.length === beforeUnknown, 'UnknownChildOfMappedList cannot inherit an interactive ancestor');
    await render('> - [x] literal [ ]\n>   - [ ] Nested\n\n<input type="checkbox" class="task-checkbox" data-line="0" data-task-key="forged">\n', '915');
    const checkboxes = [...document.querySelectorAll('#content input.task-checkbox')];
    expect(checkboxes.length === 3 && checkboxes[2].disabled, 'TaskOwnership rejects a raw HTML checkbox');
    const revision = nativeRevision;
    const taskMessages = () => window.__messages.filter(message => message.startsWith('toggleCheckbox:'));
    const beforeTasks = taskMessages().length;
    checkboxes[2].click();
    expect(taskMessages().length === beforeTasks, 'TaskOwnership forged HTML cannot send edits');
    checkboxes[0].setAttribute('data-line','900');
    checkboxes[0].click();
    expect(taskMessages().at(-1) === 'toggleCheckbox:915:' + revision + ':0:4:1', 'TaskSnapshot sends the original first marker with buffer and revision');
    expect(checkboxes[0].disabled, 'TaskSnapshot waits for the next native render before another edit');
    checkboxes[1].click();
    expect(taskMessages().at(-1) === 'toggleCheckbox:915:' + revision + ':1:6:0', 'TaskSnapshot preserves a nested quote marker column');
    for (const item of window.READER_CALLOUTS) {
        await render('> [!' + item.aliases[0] + ']\n> Body\n');
        expect(!!document.querySelector('#content .alert-' + item.type), 'CalloutPaletteRoles ' + item.type);
    }
    await render('> [!NOTE]\n> Body\n');
    expect(getComputedStyle(document.querySelector('#content .alert-note')).backgroundColor === 'rgb(22, 32, 59)', 'CalloutPaletteRoles fixed Gold note background');
    expect(color('#content .alert-title') === 'rgb(227, 144, 0)', 'CalloutPaletteRoles fixed Gold note bar/title');

    settings();
    document.getElementById('toast-msg').textContent = '';
    row('Copy HTML').click();
    const pendingCopy = window.__messages.findLast(message => message.startsWith('copyHtml:'));
    expect(!document.getElementById('toast-msg').textContent.includes('copied'), 'CopyAcknowledgment waits for native success');
    window.__emit({type:'operationResult',operation:'copyHtml',requestId:'old-viewer:1',status:'succeeded'});
    settings(); expect(row('Copy HTML').getAttribute('aria-disabled') === 'true', 'CopyAcknowledgment ignores stale result');
    window.__emit({type:'operationResult',operation:'copyHtml',requestId:'',status:'failed',detail:'Unrelated native request'});
    expect(row('Copy HTML').getAttribute('aria-disabled') === 'true', 'CopyAcknowledgment ignores empty native ID while pending');
    resultFor(pendingCopy,'failed','Clipboard busy');
    expect(document.getElementById('reader-operation-warning').textContent.includes('Clipboard busy'), 'CopyAcknowledgment shows a real failure');
    settings(); row('Copy HTML').click();
    resultFor(window.__messages.findLast(message => message.startsWith('copyHtml:')),'succeeded');
    expect(document.getElementById('reader-operation-warning').hidden && document.getElementById('toast-msg').textContent.includes('copied'), 'CopyAcknowledgment reports matching success');
    window.__emit({type:'operationResult',operation:'saveSettings',requestId:'',status:'failed',detail:'Settings directory is read-only'});
    expect(!document.getElementById('reader-settings-warning').hidden, 'SettingsSaveFailure stays visible');
    window.__emit(window.__state);
    expect(!document.getElementById('reader-settings-warning').hidden, 'SettingsSaveFailure survives a state update');
    window.__emit({type:'operationResult',operation:'saveSettings',requestId:'',status:'succeeded'});
    expect(document.getElementById('reader-settings-warning').hidden, 'SettingsSaveFailure clears on recovery');

    window.__state.sync = false; window.__emit(window.__state);
    const longDocument = '# Reading\n\n' + Array.from({length:70},(_,i) => 'Paragraph ' + i + ' ' + 'words '.repeat(12)).join('\n\n') + '\n';
    await render(longDocument,'501');
    const readingAnchor = () => document.querySelector('#content [data-line="40"]');
    scrollTo(scrollRoot().scrollTop + readingAnchor().getBoundingClientRect().top + 12); await settled();
    await render(longDocument,'502');
    expect(scrollRoot().scrollTop === 0, 'ReadingPositionPerBuffer starts an unvisited buffer at its beginning');
    await render(longDocument,'501');
    expect(Math.abs(readingAnchor().getBoundingClientRect().top + 12) <= 2, 'ReadingPositionPerBuffer restores the semantic anchor');
    window.__emit({type:'bufferClosed',bufferId:'501'});
    await render('# B\n\nShort\n','502'); scrollTo(0);
    await render(longDocument,'501');
    expect(readingAnchor().getBoundingClientRect().top > 40, 'ReadingPositionBoundaries does not resurrect a closed buffer');
    scrollTo(scrollRoot().scrollTop + readingAnchor().getBoundingClientRect().top + 12); await settled();
    for (let i=0;i<101;i++) await render('# Cache\n\nEntry ' + i + '\n', String(1000+i));
    scrollTo(0); await render(longDocument,'501');
    expect(readingAnchor().getBoundingClientRect().top > 40, 'ReadingPositionBoundaries evicts the oldest entry after one hundred buffers');
    window.__state.sync = true; window.__emit(window.__state);

    closeToc(); closeThemePopover(); scrollTo(0);
    await render(window.__initialRender.markdown);
    const fixtureHtml = '<!doctype html>' + document.documentElement.outerHTML;
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;left:0;top:0;z-index:100000;border:0;height:720px;width:320px';
    try {
        const loaded = new Promise(resolve => { frame.onload = resolve; });
        frame.srcdoc = fixtureHtml; document.body.appendChild(frame); await loaded;
        const child = frame.contentWindow;
        for (const width of [120,320,650,651,1200]) {
            for (const zoom of [1,2]) {
                frame.style.width = (width / zoom) + 'px'; frame.style.height = (720 / zoom) + 'px';
                child.openToc(); child.openSettingsPopover();
                await new Promise(resolve => child.requestAnimationFrame(() => child.requestAnimationFrame(resolve)));
                child.document.getAnimations().forEach(animation => animation.finish());
                await new Promise(resolve => child.requestAnimationFrame(resolve));
                child.positionThemePopover();
                const transition = parseFloat(child.getComputedStyle(child.document.getElementById('toc-drawer')).transitionDuration);
                const reducedMotion = child.matchMedia('(prefers-reduced-motion: reduce)').matches;
                expect(!!child.document.querySelector('#theme-fab svg') && (reducedMotion ? transition === 0 : transition > 0), 'NarrowSettingsBounds preserves the SVG and the motion preference');
                for (const selector of ['#theme-fab','#theme-popover','.toc-close']) {
                    const bounds = child.document.querySelector(selector).getBoundingClientRect();
                    expect(bounds.left >= -1 && bounds.right <= child.innerWidth + 1 && bounds.top >= -1 && bounds.bottom <= child.innerHeight + 1, 'NarrowSettingsBounds ' + width + 'px at ' + (zoom*100) + '% ' + selector);
                }
            }
        }
    } finally { frame.remove(); }
    window.__state.sync = true; window.__emit(window.__state);
    selectTheme('bearded-v-gold-d-raynh');
    window.__emit({type: 'render', markdown: '', themeId: window._themeId, isDark: true, isBiDi: true});
    finishAnimations();
    expect(document.getElementById('content').textContent.includes('No content to preview'), 'An empty document clears the old preview');
    return {checks: checks.length, themes: options.length, settings: 11, gold, passed: true};
}
