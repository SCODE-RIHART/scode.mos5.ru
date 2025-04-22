        const body = document.body;
        const cardContainer = document.getElementById('card-container');
        const settingsButton = document.getElementById('settings-button');
        const settingsModal = document.getElementById('settings-modal');
        const modalCloseButton = document.getElementById('modal-close-button');
        const languageSelect = document.getElementById('language-select');
        const themeSelect = document.getElementById('theme-select');
        const toggleHashtagsButton = document.getElementById('toggle-hashtags-button');
        const filterSelect = document.getElementById('filter-select');
        const sortSelect = document.getElementById('sort-select');
        const searchInput = document.getElementById('search-input');
        const resetSearchButton = document.getElementById('reset-search-button');
        const noFavoritesMessage = document.getElementById('no-favorites-message');

        let currentLanguage = 'en'; // Default language
        let currentTheme = 'system'; // Default theme
        let showHashtags = false; // Default: hashtags hidden
        let filterType = 'all'; // Default filter
        let sortOrder = 'new'; // Default sort order is now 'new'
        let favorites = []; // Array to store favorite card IDs
        let downloadCounts = {}; // Object to store download counts { cardId: count }
        let currentSearchTerm = '';
        // --- LocalStorage Functions ---
        const saveSetting = (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error("Error saving to localStorage:", key, e);
            }
        };

        const loadSetting = (key, defaultValue) => {
            try {
                const savedValue = localStorage.getItem(key);
                return savedValue !== null ? JSON.parse(savedValue) : defaultValue;
            } catch (e) {
                console.error("Error loading from localStorage:", key, e);
                return defaultValue;
            }
        };

        function applyTheme(theme) {
            body.classList.remove('light-theme', 'dark-theme', 'system-theme');
            if (theme === 'light') {
                body.classList.add('light-theme');
            } else if (theme === 'dark') {
                body.classList.add('dark-theme');
            } else {
                body.classList.add('system-theme');
            }
            currentTheme = theme;
            saveSetting('theme', theme);
        }

        function applyHashtagVisibility(show) {
            const translationKey = show ? 'toggle_hashtags_hide' : 'toggle_hashtags_show';
            if (show) {
                body.classList.remove('hashtags-hidden');
            } else {
                body.classList.add('hashtags-hidden');
            }

            toggleHashtagsButton.textContent = getTranslation(translationKey);
            toggleHashtagsButton.setAttribute('data-translate-key', translationKey); // Update key if needed

            showHashtags = show;
            saveSetting('showHashtags', show);
        }

        function getTranslation(key, lang = currentLanguage) {
            return translations[lang]?.[key] || translations.en[key] || key;
        }

        function updateFilterOptionCounts() {
            const allOption = filterSelect.querySelector('option[value="all"]');
            const favOption = filterSelect.querySelector('option[value="favorites"]');
            const totalCards = cardData.length;
            const favCount = favorites.length;
            if (allOption) {
                const baseText = getTranslation('filter_all');
                allOption.textContent = `${baseText} (${totalCards})`;
            }
            if (favOption) {
                const baseText = getTranslation('filter_favorites');
                favOption.textContent = `${baseText} (${favCount})`;
            }
        }

        function translateUI() {
            document.querySelectorAll('[data-translate-key]').forEach(element => {
                const key = element.getAttribute('data-translate-key');
                const translation = getTranslation(key);

                if (element.parentElement === filterSelect) {
                    return;
                }

                if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                    if(element.hasAttribute('data-translate-placeholder')) {
                        const placeholderKey = element.getAttribute('data-translate-placeholder');
                        element.placeholder = getTranslation(placeholderKey);
                    }
                }
                else if (element.tagName === 'BUTTON' || element.tagName === 'SPAN' || element.tagName === 'H1' || element.tagName === 'H2' || element.tagName === 'LABEL' || element.tagName === 'DIV') {
                    if (element.id !== 'toggle-hashtags-button') {
                        if (element.children.length > 0 && element.querySelector('span[data-translate-key]')) {
                            const textSpan = element.querySelector('span[data-translate-key]');
                            if (textSpan) textSpan.textContent = translation;
                        } else if (element.children.length === 0 || !element.children[0].matches('span')) { // Avoid replacing icon spans
                            element.textContent = translation;
                        }
                        else if (element.tagName === 'SPAN' && element.getAttribute('data-translate-key') === key){
                            element.textContent = translation;
                        }
                    }
                }
                else if (element.tagName === 'OPTION' && element.closest('select') !== filterSelect) {
                    element.textContent = translation;
                }
            });
            applyHashtagVisibility(showHashtags);
            updateFilterOptionCounts();
            document.documentElement.lang = currentLanguage;
            renderCards();
        }


        function setLanguage(lang) {
            currentLanguage = lang;
            saveSetting('language', lang);
            languageSelect.value = lang;
            translateUI();
        }

        function shuffleArray(array) {
            let currentIndex = array.length, randomIndex;
            while (currentIndex !== 0) {
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;
                [array[currentIndex], array[randomIndex]] = [
                    array[randomIndex], array[currentIndex]];
            }
            return array;
        }

        function renderCards() {
            cardContainer.innerHTML = '';
            noFavoritesMessage.style.display = 'none'; 

            const today = new Date();
            const todayDDMMYYYY = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
            const todayYYYYMMDD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            let filteredData = cardData;
            if (filterType === 'favorites') {
                filteredData = cardData.filter(card => favorites.includes(card.id));
            }

            const searchTerm = currentSearchTerm.toLowerCase().trim();
            if (searchTerm) {
                filteredData = filteredData.filter(card => {
                    const title = card[`title_${currentLanguage}`]?.toLowerCase() || card.title_en.toLowerCase();
                    const author = card[`author_${currentLanguage}`]?.toLowerCase() || card.author_en.toLowerCase();
                    const description = card[`description_${currentLanguage}`]?.toLowerCase() || card.description_en.toLowerCase();
                    const hashtags = card.hashtags.join(' ').toLowerCase();
                    return title.includes(searchTerm) || author.includes(searchTerm) || hashtags.includes(searchTerm) || description.includes( searchTerm);
                });
            }

            let sortedData;
            if (sortOrder === 'random') {
                sortedData = shuffleArray([...filteredData]);
            } else if (sortOrder === 'new') {
                sortedData = [...filteredData].sort((a, b) => b.id - a.id);
            } else {
                sortedData = [...filteredData].sort((a, b) => a.id - b.id);
            }

            if (filterType === 'favorites' && sortedData.length === 0) {
                noFavoritesMessage.style.display = 'block';
                return;
            }

            sortedData.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.classList.add('card');
                cardElement.dataset.id = card.id;

                const isFavorite = favorites.includes(card.id);

                let newBadgeHTML = '';
                if (card.date === todayDDMMYYYY || card.date === todayYYYYMMDD) {
                    newBadgeHTML = `<div class="new-badge">${getTranslation('new_badge')}</div>`;
                }

                cardElement.innerHTML = `
                    ${newBadgeHTML} <span class="card-id">${card.id}</span>
                    <button class="favorite-button ${isFavorite ? 'is-favorite' : ''}" data-id="${card.id}" aria-label="${isFavorite ? getTranslation('remove_favorite_label', 'en') : getTranslation('add_favorite_label', 'en')}">
                        ${isFavorite ? '★' : '☆'}
                    </button>
                    <div class="card-image-container">
                        <img src="${card.imageUrl}" alt="${card[`title_${currentLanguage}`] || card.title_en} preview" loading="lazy">
                    </div>
                    <h3>${card[`title_${currentLanguage}`] || card.title_en}</h3>
                    <p>${card[`description_${currentLanguage}`] || card.description_en}</p>
                    <div class="card-meta">
                        <span class="author">${getTranslation('author_prefix')} ${card[`author_${currentLanguage}`] || card.author_en}</span>
                        <span class="date">${getTranslation('date_prefix')} ${card.date}</span>
                    </div>
                    <div class="card-hashtags">
                        ${card.hashtags.map(tag => `<span>${tag}</span>`).join('')}
                    </div>
                    <div class="card-buttons">
                        <button class="download-button" data-id="${card.id}" data-url="${card.downloadUrl}">
                            <span data-translate-key="download_button">${getTranslation('download_button')}</span>
                            </button>
                        <button class="docs-button" data-url="${card.docsUrl}">
                            <span data-translate-key="docs_button">${getTranslation('docs_button')}</span>
                        </button>
                    </div>
                `;
                cardContainer.appendChild(cardElement);
            });
            applyHashtagVisibility(showHashtags);
        }


        function toggleFavorite(id) {
            const idNum = parseInt(id, 10);
            const index = favorites.indexOf(idNum);
            let wasFavorite;

            if (index > -1) {
                favorites.splice(index, 1);
                wasFavorite = true;
            } else {
                favorites.push(idNum);
                wasFavorite = false;
            }
            saveSetting('favorites', favorites);
             const button = cardContainer.querySelector(`.favorite-button[data-id="${id}"]`);
             if (button) {
                 button.textContent = wasFavorite ? '☆' : '★';
                 button.classList.toggle('is-favorite', !wasFavorite);
             }

             updateFilterOptionCounts();
             if (filterType === 'favorites') {
                 renderCards();
             }
        }

        settingsButton.addEventListener('click', () => {
            settingsModal.style.display = 'flex';
        });
        modalCloseButton.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
        settingsModal.addEventListener('click', (event) => {
            if (event.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
        languageSelect.addEventListener('change', (event) => {
            setLanguage(event.target.value);
        });
        themeSelect.addEventListener('change', (event) => {
            applyTheme(event.target.value);
        });
        toggleHashtagsButton.addEventListener('click', () => {
            applyHashtagVisibility(!showHashtags);
        });
        filterSelect.addEventListener('change', (event) => {
            filterType = event.target.value;
            saveSetting('filterType', filterType);
            renderCards();
        });
        sortSelect.addEventListener('change', (event) => {
            sortOrder = event.target.value;
            saveSetting('sortOrder', sortOrder);
            renderCards();
        });
        searchInput.addEventListener('input', (event) => {
            currentSearchTerm = event.target.value;
            resetSearchButton.style.display = currentSearchTerm ? 'block' : 'none';
            renderCards();
        });
        resetSearchButton.addEventListener('click', () => {
            searchInput.value = '';
            currentSearchTerm = '';
            resetSearchButton.style.display = 'none';
            renderCards();
        });
        cardContainer.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            const cardElement = button.closest('.card');
            const cardId = cardElement?.dataset.id;

            if (button.classList.contains('favorite-button') && cardId) {
                toggleFavorite(cardId);
            }

            if (button.classList.contains('download-button') && cardId) {
                const url = button.dataset.url;
                if (url && url !== '#') {
                    const numericCardId = parseInt(cardId, 10);
                    downloadCounts[numericCardId] = (downloadCounts[numericCardId] || 0) + 1;
                    saveSetting('downloadCounts', downloadCounts);

                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', '');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    console.log(`Download requested: ${url} (Client-side Count: ${downloadCounts[numericCardId]})`);

                } else {
                    alert('Download link not available.');
                }
            }

            if (button.classList.contains('docs-button')) {
                const url = button.dataset.url;
                if (url && url !== '#') {
                    window.open(url, '_blank');
                } else {
                    alert('Documentation link not available.');
                }
            }
        });
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
        prefersDarkScheme.addEventListener('change', () => {
            if (currentTheme === 'system') {
                applyTheme('system');
            }
        });
        document.addEventListener('DOMContentLoaded', () => {
            currentLanguage = loadSetting('language', 'en');
            currentTheme = loadSetting('theme', 'system');
            showHashtags = loadSetting('showHashtags', false);
            filterType = loadSetting('filterType', 'all');
            sortOrder = loadSetting('sortOrder', 'new');
            favorites = loadSetting('favorites', []);
            downloadCounts = loadSetting('downloadCounts', {});

            languageSelect.value = currentLanguage;
            themeSelect.value = currentTheme;
            filterSelect.value = filterType;
            sortSelect.value = sortOrder;

            applyTheme(currentTheme);
            setLanguage(currentLanguage);

            console.log("Website Initialized");
        });