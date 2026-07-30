/**
 * Hancia Manga & Webtoon Reader
 * Real-time MangaDex API integration with CORS Fallback, Dark Mode, Search, and Vertical Reader
 */

document.addEventListener('DOMContentLoaded', () => {
    // API Configuration
    const MANGADEX_BASE = 'https://api.mangadex.org';
    const COVER_BASE = 'https://uploads.mangadex.org/covers';
    
    // List of CORS Proxy fallbacks in case MangaDex direct fetch is blocked by client CORS policy
    const CORS_PROXIES = [
        (url) => url, // Direct call first
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ];

    // App State
    const state = {
        theme: localStorage.getItem('hancia-theme') || 'dark',
        currentMangaList: [],
        selectedManga: null,
        chapters: [],
        filteredChapters: [],
        currentChapterIndex: -1,
        sortAscending: false,
        selectedLang: 'all',
        quality: 'data'
    };

    // DOM Elements
    const htmlEl = document.documentElement;
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    
    // Search Inputs & Buttons
    const heroSearchInput = document.getElementById('heroSearchInput');
    const heroSearchBtn = document.getElementById('heroSearchBtn');
    const headerSearchInput = document.getElementById('headerSearchInput');
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    const langFilter = document.getElementById('langFilter');
    const typeFilter = document.getElementById('typeFilter');
    const logoBtn = document.getElementById('logoBtn');

    // Section Elements
    const sectionTitle = document.getElementById('sectionTitle');
    const resultsCount = document.getElementById('resultsCount');
    const mangaGrid = document.getElementById('mangaGrid');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const retryBtn = document.getElementById('retryBtn');

    // Details Modal Elements
    const mangaDetailsView = document.getElementById('mangaDetailsView');
    const closeDetailsBtn = document.getElementById('closeDetailsBtn');
    const mangaDetailsContainer = document.getElementById('mangaDetailsContainer');
    const chaptersList = document.getElementById('chaptersList');
    const chaptersLoading = document.getElementById('chaptersLoading');
    const chapterSearchInput = document.getElementById('chapterSearchInput');
    const chapterLangSelect = document.getElementById('chapterLangSelect');
    const sortOrderBtn = document.getElementById('sortOrderBtn');
    const sortOrderText = document.getElementById('sortOrderText');

    // Reader Elements
    const readerView = document.getElementById('readerView');
    const exitReaderBtn = document.getElementById('exitReaderBtn');
    const readerMangaTitle = document.getElementById('readerMangaTitle');
    const readerChapterTitle = document.getElementById('readerChapterTitle');
    const prevChapterBtn = document.getElementById('prevChapterBtn');
    const nextChapterBtn = document.getElementById('nextChapterBtn');
    const readerChapterSelect = document.getElementById('readerChapterSelect');
    const dataQualitySelect = document.getElementById('dataQualitySelect');
    const readerPages = document.getElementById('readerPages');
    const readerLoading = document.getElementById('readerLoading');
    const readerFooter = document.getElementById('readerFooter');
    const footerPrevBtn = document.getElementById('footerPrevBtn');
    const footerBackDetailsBtn = document.getElementById('footerBackDetailsBtn');
    const footerNextBtn = document.getElementById('footerNextBtn');

    // Initialize Application
    init();

    function init() {
        applyTheme(state.theme);
        setupEventListeners();
        fetchPopularManga();
    }

    // Theme Switcher
    function applyTheme(theme) {
        state.theme = theme;
        htmlEl.setAttribute('data-theme', theme);
        localStorage.setItem('hancia-theme', theme);
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        }
    }

    function toggleTheme() {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    }

    // Robust Fetcher with CORS Proxy Fallback
    async function fetchWithCorsFallback(endpoint) {
        let lastError = null;
        for (const proxyFn of CORS_PROXIES) {
            try {
                const targetUrl = proxyFn(endpoint);
                const response = await fetch(targetUrl);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const data = await response.json();
                return data;
            } catch (err) {
                lastError = err;
                console.warn(`Proxy/Fetch failed for ${endpoint}:`, err.message);
            }
        }
        throw lastError || new Error('All fetch attempts failed.');
    }

    // Event Listeners Registration
    function setupEventListeners() {
        // Theme toggle
        themeToggleBtn.addEventListener('click', toggleTheme);

        // Logo home click
        logoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            heroSearchInput.value = '';
            headerSearchInput.value = '';
            fetchPopularManga();
        });

        // Search Handlers
        heroSearchBtn.addEventListener('click', () => performSearch(heroSearchInput.value));
        heroSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') performSearch(heroSearchInput.value);
        });

        headerSearchBtn.addEventListener('click', () => performSearch(headerSearchInput.value));
        headerSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') performSearch(headerSearchInput.value);
        });

        langFilter.addEventListener('change', () => performSearch(heroSearchInput.value || headerSearchInput.value));
        typeFilter.addEventListener('change', () => performSearch(heroSearchInput.value || headerSearchInput.value));

        retryBtn.addEventListener('click', () => fetchPopularManga());

        // Details Modal
        closeDetailsBtn.addEventListener('click', () => {
            mangaDetailsView.classList.add('hidden');
            document.body.style.overflow = 'auto';
        });

        chapterSearchInput.addEventListener('input', filterAndRenderChapters);
        chapterLangSelect.addEventListener('change', (e) => {
            state.selectedLang = e.target.value;
            filterAndRenderChapters();
        });

        sortOrderBtn.addEventListener('click', () => {
            state.sortAscending = !state.sortAscending;
            sortOrderText.textContent = state.sortAscending ? 'Ascending' : 'Descending';
            filterAndRenderChapters();
        });

        // Reader Controls
        exitReaderBtn.addEventListener('click', closeReader);
        dataQualitySelect.addEventListener('change', (e) => {
            state.quality = e.target.value;
            if (state.currentChapterIndex !== -1) {
                loadChapterContent(state.filteredChapters[state.currentChapterIndex]);
            }
        });

        prevChapterBtn.addEventListener('click', navigatePrevChapter);
        nextChapterBtn.addEventListener('click', navigateNextChapter);
        footerPrevBtn.addEventListener('click', navigatePrevChapter);
        footerNextBtn.addEventListener('click', navigateNextChapter);
        footerBackDetailsBtn.addEventListener('click', closeReader);

        readerChapterSelect.addEventListener('change', (e) => {
            const index = parseInt(e.target.value, 10);
            if (!isNaN(index) && state.filteredChapters[index]) {
                state.currentChapterIndex = index;
                loadChapterContent(state.filteredChapters[index]);
            }
        });
    }

    // Fetch Popular Manga on Load
    async function fetchPopularManga() {
        showLoading(true);
        hideError();
        sectionTitle.innerHTML = `<i class="fa-solid fa-fire"></i> Popular Manga & Webtoons`;
        
        try {
            const url = `${MANGADEX_BASE}/manga?limit=32&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive`;
            const data = await fetchWithCorsFallback(url);

            if (data && data.data) {
                state.currentMangaList = data.data;
                renderMangaCards(data.data);
                resultsCount.textContent = `Showing top ${data.data.length} popular titles`;
            } else {
                throw new Error('No data returned from MangaDex API.');
            }
        } catch (err) {
            showError(`Failed to load popular titles: ${err.message}. Please click Retry.`);
        } finally {
            showLoading(false);
        }
    }

    // Perform Title Search
    async function performSearch(query) {
        query = query.trim();
        showLoading(true);
        hideError();

        if (query) {
            sectionTitle.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Search Results for "${escapeHtml(query)}"`;
        } else {
            fetchPopularManga();
            return;
        }

        try {
            let url = `${MANGADEX_BASE}/manga?limit=32&title=${encodeURIComponent(query)}&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive`;
            
            // Language and Type Filters
            const selectedLang = langFilter.value;
            if (selectedLang !== 'all') {
                url += `&availableTranslatedLanguage[]=${selectedLang}`;
            }

            const selectedType = typeFilter.value;
            if (selectedType !== 'all') {
                url += `&originalLanguage[]=${selectedType}`;
            }

            const data = await fetchWithCorsFallback(url);

            if (data && data.data) {
                state.currentMangaList = data.data;
                renderMangaCards(data.data);
                resultsCount.textContent = `Found ${data.data.length} results`;
            } else {
                throw new Error('Invalid search response.');
            }
        } catch (err) {
            showError(`Search failed: ${err.message}. Please check your query or proxy.`);
        } finally {
            showLoading(false);
        }
    }

    // Helper to build robust cover image URL
    function buildCoverUrl(mangaId, fileName, size = '') {
        if (!fileName) return 'https://via.placeholder.com/256x360?text=No+Cover';
        const suffix = size ? `.${size}.jpg` : '';
        return `${COVER_BASE}/${mangaId}/${fileName}${suffix}`;
    }

    // Render Grid Cards
    function renderMangaCards(mangaList) {
        mangaGrid.innerHTML = '';

        if (!mangaList || mangaList.length === 0) {
            mangaGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                    <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>No manga or webtoons found</h3>
                    <p>Try searching for a different keyword or resetting language filters.</p>
                </div>
            `;
            return;
        }

        mangaList.forEach((manga) => {
            const id = manga.id;
            const attributes = manga.attributes || {};
            const title = getTitle(attributes.title, attributes.altTitles);
            const description = getDescription(attributes.description);
            const coverFileName = getCoverFileName(manga.relationships);
            const primaryCoverUrl = buildCoverUrl(id, coverFileName, '256');
            const fullCoverUrl = buildCoverUrl(id, coverFileName);

            const origLang = (attributes.originalLanguage || 'manga').toUpperCase();
            const pubStatus = attributes.status ? attributes.status.toUpperCase() : 'UNKNOWN';
            
            // Tags
            const tags = (attributes.tags || []).slice(0, 3).map(t => t.attributes?.name?.en).filter(Boolean);

            const card = document.createElement('div');
            card.className = 'manga-card';
            card.setAttribute('data-id', id);

            card.innerHTML = `
                <div class="card-cover-wrapper">
                    <img src="${primaryCoverUrl}" 
                         alt="${escapeHtml(title)}" 
                         loading="lazy" 
                         referrerpolicy="no-referrer" 
                         onerror="if(!this.dataset.retry){this.dataset.retry=1;this.src='${fullCoverUrl}';}else{this.src='https://via.placeholder.com/256x360?text=No+Cover';}">
                    <span class="card-badge">${origLang}</span>
                    <span class="card-lang-badge">${pubStatus}</span>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${escapeHtml(title)}</h3>
                    <div class="card-tags">
                        ${tags.map(tag => `<span class="tag-item">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                    <p class="card-desc">${escapeHtml(description)}</p>
                </div>
            `;

            card.addEventListener('click', () => openMangaDetails(manga));
            mangaGrid.appendChild(card);
        });
    }

    // Open Manga Details Modal & Load Chapters
    async function openMangaDetails(manga) {
        state.selectedManga = manga;
        const id = manga.id;
        const attributes = manga.attributes || {};
        const title = getTitle(attributes.title, attributes.altTitles);
        const description = getDescription(attributes.description);
        const coverFileName = getCoverFileName(manga.relationships);
        const primaryCoverUrl = buildCoverUrl(id, coverFileName, '512');
        const fullCoverUrl = buildCoverUrl(id, coverFileName);

        const year = attributes.year || 'N/A';
        const status = attributes.status || 'N/A';
        const origLang = (attributes.originalLanguage || 'N/A').toUpperCase();
        const tags = (attributes.tags || []).map(t => t.attributes?.name?.en).filter(Boolean);

        mangaDetailsContainer.innerHTML = `
            <div>
                <img class="details-cover" 
                     src="${primaryCoverUrl}" 
                     alt="${escapeHtml(title)}" 
                     referrerpolicy="no-referrer" 
                     onerror="if(!this.dataset.retry){this.dataset.retry=1;this.src='${fullCoverUrl}';}else{this.src='https://via.placeholder.com/512x720?text=No+Cover';}">
            </div>
            <div class="details-info-header">
                <h1>${escapeHtml(title)}</h1>
                <div class="details-meta">
                    <span class="details-meta-item"><i class="fa-solid fa-calendar"></i> Year: ${year}</span>
                    <span class="details-meta-item"><i class="fa-solid fa-signal"></i> Status: ${status.toUpperCase()}</span>
                    <span class="details-meta-item"><i class="fa-solid fa-globe"></i> Origin: ${origLang}</span>
                </div>
                <div class="details-tags">
                    ${tags.map(t => `<span class="tag-item">${escapeHtml(t)}</span>`).join('')}
                </div>
                <p class="details-description">${escapeHtml(description || 'No summary available.')}</p>
            </div>
        `;

        mangaDetailsView.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Load Chapters
        await fetchChapters(id);
    }

    // Fetch Chapters for a Manga (with full pagination up to 500 chapters)
    async function fetchChapters(mangaId) {
        chaptersLoading.classList.remove('hidden');
        chaptersList.innerHTML = '';

        try {
            let allChapters = [];
            let offset = 0;
            const limit = 100;
            let total = 100;

            // Fetch up to 300 chapters for performance
            while (offset < total && offset < 300) {
                const url = `${MANGADEX_BASE}/manga/${mangaId}/feed?limit=${limit}&offset=${offset}&includes[]=scanlation_group&order[chapter]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`;
                const data = await fetchWithCorsFallback(url);

                if (data && data.data) {
                    allChapters = allChapters.concat(data.data);
                    total = data.total || data.data.length;
                    offset += limit;
                    if (data.data.length === 0) break;
                } else {
                    break;
                }
            }

            if (allChapters.length > 0) {
                state.chapters = allChapters;
                populateLanguageFilter(allChapters);
                filterAndRenderChapters();
            } else {
                chaptersList.innerHTML = `<p style="color: var(--text-muted); padding: 1rem;"><i class="fa-solid fa-info-circle"></i> No translated chapters found for this title.</p>`;
            }
        } catch (err) {
            chaptersList.innerHTML = `<p style="color: #ef4444; padding: 1rem;"><i class="fa-solid fa-circle-exclamation"></i> Error loading chapters: ${err.message}</p>`;
        } finally {
            chaptersLoading.classList.add('hidden');
        }
    }

    // Populate Language Filter Options based on available chapter languages
    function populateLanguageFilter(chapters) {
        const langs = new Set();
        chapters.forEach(ch => {
            if (ch.attributes?.translatedLanguage) {
                langs.add(ch.attributes.translatedLanguage);
            }
        });

        chapterLangSelect.innerHTML = '<option value="all">All Languages</option>';
        Array.from(langs).sort().forEach(lang => {
            const opt = document.createElement('option');
            opt.value = lang;
            opt.textContent = lang.toUpperCase();
            chapterLangSelect.appendChild(opt);
        });
    }

    // Filter, Sort and Render Chapter Buttons
    function filterAndRenderChapters() {
        const searchVal = chapterSearchInput.value.toLowerCase().trim();
        const selectedLang = chapterLangSelect.value;

        let list = state.chapters.filter((ch) => {
            const attr = ch.attributes || {};
            const chapterNum = attr.chapter || '';
            const chapterTitle = attr.title || '';
            const lang = attr.translatedLanguage || '';

            const matchesSearch = !searchVal || chapterNum.toLowerCase().includes(searchVal) || chapterTitle.toLowerCase().includes(searchVal);
            const matchesLang = selectedLang === 'all' || lang === selectedLang;

            return matchesSearch && matchesLang;
        });

        // Sort order
        list.sort((a, b) => {
            const numA = parseFloat(a.attributes?.chapter) || 0;
            const numB = parseFloat(b.attributes?.chapter) || 0;
            return state.sortAscending ? numA - numB : numB - numA;
        });

        state.filteredChapters = list;
        chaptersList.innerHTML = '';

        if (list.length === 0) {
            chaptersList.innerHTML = '<p style="color: var(--text-muted); padding: 1rem; grid-column: 1 / -1;">No chapters found matching criteria.</p>';
            return;
        }

        list.forEach((ch, index) => {
            const attr = ch.attributes || {};
            const chNum = attr.chapter ? `Chapter ${attr.chapter}` : 'Oneshot / Special';
            const chTitle = attr.title ? `- ${attr.title}` : '';
            const lang = (attr.translatedLanguage || 'en').toUpperCase();

            // Scanlation group name
            const groupRel = (ch.relationships || []).find(r => r.type === 'scanlation_group');
            const groupName = groupRel?.attributes?.name ? ` • ${groupRel.attributes.name}` : '';

            const item = document.createElement('div');
            item.className = 'chapter-item';
            item.innerHTML = `
                <div>
                    <div class="chapter-num">${escapeHtml(chNum)} ${escapeHtml(chTitle)}</div>
                    <div class="chapter-sub">${lang}${escapeHtml(groupName)}</div>
                </div>
                <span class="chapter-lang">${lang}</span>
            `;

            item.addEventListener('click', () => {
                state.currentChapterIndex = index;
                openReader(ch);
            });

            chaptersList.appendChild(item);
        });
    }

    // Open Vertical Slide Chapter Reader
    async function openReader(chapter) {
        readerView.classList.remove('hidden');
        mangaDetailsView.classList.add('hidden');

        // Populate dropdown
        readerChapterSelect.innerHTML = '';
        state.filteredChapters.forEach((ch, idx) => {
            const attr = ch.attributes || {};
            const label = `Ch. ${attr.chapter || '?'} (${(attr.translatedLanguage || 'en').toUpperCase()})`;
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = label;
            if (idx === state.currentChapterIndex) opt.selected = true;
            readerChapterSelect.appendChild(opt);
        });

        const mangaTitle = getTitle(state.selectedManga.attributes.title, state.selectedManga.attributes.altTitles);
        readerMangaTitle.textContent = mangaTitle;

        await loadChapterContent(chapter);
    }

    // Fetch Chapter Pages & Render Vertically
    async function loadChapterContent(chapter) {
        readerLoading.classList.remove('hidden');
        readerPages.innerHTML = '';
        readerFooter.classList.add('hidden');

        const attr = chapter.attributes || {};
        const chNum = attr.chapter ? `Chapter ${attr.chapter}` : 'Special';
        const chTitle = attr.title ? `: ${attr.title}` : '';
        readerChapterTitle.textContent = `${chNum} ${chTitle}`;

        // Navigation state
        prevChapterBtn.disabled = state.currentChapterIndex >= state.filteredChapters.length - 1;
        nextChapterBtn.disabled = state.currentChapterIndex <= 0;
        footerPrevBtn.disabled = prevChapterBtn.disabled;
        footerNextBtn.disabled = nextChapterBtn.disabled;

        try {
            // Get MangaDex At-Home server endpoint
            const serverUrl = `${MANGADEX_BASE}/at-home/server/${chapter.id}`;
            const atHomeData = await fetchWithCorsFallback(serverUrl);

            if (!atHomeData || !atHomeData.chapter) {
                throw new Error('Failed to retrieve chapter image server.');
            }

            const baseUrl = atHomeData.baseUrl;
            const hash = atHomeData.chapter.hash;
            
            // Note: MangaDex path for dataSaver is 'data-saver' (kebab-case) in URL, but 'data' for high quality
            const qualityMode = state.quality === 'dataSaver' ? 'data-saver' : 'data';
            const pageFiles = state.quality === 'dataSaver' ? atHomeData.chapter.dataSaver : atHomeData.chapter.data;

            if (!pageFiles || pageFiles.length === 0) {
                throw new Error('This chapter has no readable pages.');
            }

            // Render images vertically for seamless webtoon/manga scrolling
            pageFiles.forEach((filename, i) => {
                const imgUrl = `${baseUrl}/${qualityMode}/${hash}/${filename}`;
                
                const img = document.createElement('img');
                img.className = 'reader-page-img';
                img.alt = `Page ${i + 1}`;
                img.loading = i < 3 ? 'eager' : 'lazy'; // Fast initial load
                img.referrerPolicy = 'no-referrer';
                img.src = imgUrl;

                img.onerror = () => {
                    // Fallback to CORS proxy if image CDN fails
                    if (!img.dataset.proxied) {
                        img.dataset.proxied = 'true';
                        img.src = `https://corsproxy.io/?${encodeURIComponent(imgUrl)}`;
                    }
                };

                readerPages.appendChild(img);
            });

            readerFooter.classList.remove('hidden');
        } catch (err) {
            readerPages.innerHTML = `
                <div class="error-box" style="margin: 3rem 1rem;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>Unable to load chapter content: ${escapeHtml(err.message)}</p>
                    <button class="btn btn-secondary" id="retryChapterBtn"><i class="fa-solid fa-rotate-right"></i> Retry Loading</button>
                </div>
            `;
            document.getElementById('retryChapterBtn')?.addEventListener('click', () => loadChapterContent(chapter));
        } finally {
            readerLoading.classList.add('hidden');
        }
    }

    function navigatePrevChapter() {
        if (state.currentChapterIndex < state.filteredChapters.length - 1) {
            state.currentChapterIndex++;
            readerChapterSelect.value = state.currentChapterIndex;
            loadChapterContent(state.filteredChapters[state.currentChapterIndex]);
            document.getElementById('readerContainer').scrollTop = 0;
        }
    }

    function navigateNextChapter() {
        if (state.currentChapterIndex > 0) {
            state.currentChapterIndex--;
            readerChapterSelect.value = state.currentChapterIndex;
            loadChapterContent(state.filteredChapters[state.currentChapterIndex]);
            document.getElementById('readerContainer').scrollTop = 0;
        }
    }

    function closeReader() {
        readerView.classList.add('hidden');
        mangaDetailsView.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // Helper Utilities
    function getTitle(titleObj, altTitles) {
        if (!titleObj) return 'Untitled';
        if (titleObj.en) return titleObj.en;
        if (titleObj.ja) return titleObj.ja;
        if (titleObj['ja-ro']) return titleObj['ja-ro'];
        if (titleObj.ko) return titleObj.ko;
        if (titleObj.zh) return titleObj.zh;
        
        const firstKey = Object.keys(titleObj)[0];
        if (firstKey) return titleObj[firstKey];

        if (altTitles && altTitles.length > 0) {
            for (const alt of altTitles) {
                const altKey = Object.keys(alt)[0];
                if (altKey && alt[altKey]) return alt[altKey];
            }
        }

        return 'Untitled';
    }

    function getDescription(descObj) {
        if (!descObj) return 'No description provided.';
        return descObj.en || descObj.ja || descObj.ko || Object.values(descObj)[0] || 'No description provided.';
    }

    function getCoverFileName(relationships) {
        if (!relationships) return null;
        const rel = relationships.find(r => r.type === 'cover_art');
        return rel?.attributes?.fileName || null;
    }

    function showLoading(show) {
        if (show) loadingSpinner.classList.remove('hidden');
        else loadingSpinner.classList.add('hidden');
    }

    function showError(msg) {
        errorText.textContent = msg;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
