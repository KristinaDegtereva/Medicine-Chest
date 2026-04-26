// === БАЗА ДАННЫХ (IndexedDB) ===
const DB_NAME = 'AptechkaDB';
const DB_VERSION = 2;
let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('drugs')) {
                const store = db.createObjectStore('drugs', { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('expiryDate', 'expiryDate', { unique: false });
            }
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        request.onerror = () => reject(request.error);
    });
}

function getAllDrugs() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('drugs', 'readonly');
        const store = tx.objectStore('drugs');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function addDrug(drug) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('drugs', 'readwrite');
        const store = tx.objectStore('drugs');
        const request = store.add(drug);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function updateDrug(drug) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('drugs', 'readwrite');
        const store = tx.objectStore('drugs');
        const request = store.put(drug);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function deleteDrug(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('drugs', 'readwrite');
        const store = tx.objectStore('drugs');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// === ВСПОМОГАТЕЛЬНЫЕ ===
function parseExpiryDate(dateString) {
    if (!dateString) return new Date();
    const parts = dateString.split('-');
    const year = parseInt(parts[0]) || 2026;
    const month = (parseInt(parts[1]) || 1) - 1;
    const day = parts[2] ? parseInt(parts[2]) : 1;
    return new Date(year, month, day);
}

function getStatus(expiryDate) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const expiry = parseExpiryDate(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    if (expiry < now) return 'expired';
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    threeMonths.setHours(0, 0, 0, 0);
    if (expiry <= threeMonths) return 'soon';
    return 'ok';
}

function formatDate(dateString) {
    const d = parseExpiryDate(dateString);
    const months = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
                    'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function formatDateShort(dateString) {
    const d = parseExpiryDate(dateString);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return month + '.' + d.getFullYear();
}

function getMonthName(index) {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return months[index];
}

// === DOM ===
const searchToggle = document.getElementById('searchToggle');
const searchContainer = document.getElementById('searchContainer');
const searchInput = document.getElementById('searchInput');
const mainContent = document.getElementById('mainContent');
const allContent = document.getElementById('allContent');
const expiredList = document.getElementById('expiredList');
const soonList = document.getElementById('soonList');
const expiredSection = document.getElementById('expiredSection');
const soonSection = document.getElementById('soonSection');
const noContent = document.getElementById('noContent');
const allList = document.getElementById('allList');
const allEmpty = document.getElementById('allEmpty');
const tagFilter = document.getElementById('tagFilter');
const searchResults = document.getElementById('searchResults');
const searchResultsList = document.getElementById('searchResultsList');
const noResults = document.getElementById('noResults');
const addButton = document.getElementById('addButton');
const formModal = document.getElementById('formModal');
const cardModal = document.getElementById('cardModal');
const drugForm = document.getElementById('drugForm');
const formTitle = document.getElementById('formTitle');
const drugId = document.getElementById('drugId');
const tagInput = document.getElementById('tagInput');
const nameInput = document.getElementById('nameInput');
const substanceInput = document.getElementById('substanceInput');
const packInput = document.getElementById('packInput');
const monthInput = document.getElementById('monthInput');
const yearInput = document.getElementById('yearInput');
const remainingInput = document.getElementById('remainingInput');
const photoInput = document.getElementById('photoInput');
const photoButton = document.getElementById('photoButton');
const photoList = document.getElementById('photoList');
const cancelForm = document.getElementById('cancelForm');
const closeFormModal = document.getElementById('closeFormModal');
const toast = document.getElementById('toast');
const tabs = document.getElementById('tabs');

const cardPhoto = document.getElementById('cardPhoto');
const cardPhotoPlaceholder = document.getElementById('cardPhotoPlaceholder');
const cardTag = document.getElementById('cardTag');
const cardName = document.getElementById('cardName');
const cardSubstance = document.getElementById('cardSubstance');
const cardPack = document.getElementById('cardPack');
const cardExpiry = document.getElementById('cardExpiry');
const cardRemaining = document.getElementById('cardRemaining');
const editFromCard = document.getElementById('editFromCard');
const deleteFromCard = document.getElementById('deleteFromCard');
const closeCard = document.getElementById('closeCard');
const photoDots = document.getElementById('photoDots');

// === СОСТОЯНИЕ ===
let allDrugs = [];
let currentCardDrug = null;
let searchVisible = false;
let currentTab = 'main';
let currentTagFilter = 'all';
let tempPhotos = [];

// === ИНИЦИАЛИЗАЦИЯ ===
function initMonthYear() {
    if (!monthInput || !yearInput) return;
    monthInput.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const option = document.createElement('option');
        const num = String(i + 1).padStart(2, '0');
        option.value = i;
        option.textContent = num + ' (' + getMonthName(i) + ')';
        monthInput.appendChild(option);
    }
    const now = new Date();
    monthInput.value = now.getMonth();
    yearInput.innerHTML = '';
    for (let y = now.getFullYear() - 10; y <= now.getFullYear() + 10; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        yearInput.appendChild(option);
    }
    yearInput.value = now.getFullYear() + 2;
}

async function init() {
    await openDB();
    initMonthYear();
    await refreshAll();
}

// === ОТРИСОВКА ===
async function refreshAll() {
    allDrugs = await getAllDrugs();
    renderMainTab();
    renderAllTab();
    renderTagFilter();
}

function renderMainTab() {
    if (!expiredList || !soonList) return;
    const expired = [];
    const soon = [];
    allDrugs.forEach(d => {
        const status = getStatus(d.expiryDate);
        if (status === 'expired') expired.push(d);
        else if (status === 'soon') soon.push(d);
    });
    renderDrugList(expiredList, expired);
    renderDrugList(soonList, soon);
    if (expiredSection) expiredSection.classList.toggle('hidden', expired.length === 0);
    if (soonSection) soonSection.classList.toggle('hidden', soon.length === 0);
    if (noContent) noContent.classList.toggle('hidden', expired.length > 0 || soon.length > 0);
}

function renderAllTab() {
    if (!allList) return;
    let filtered = allDrugs;
    if (currentTagFilter !== 'all') {
        filtered = allDrugs.filter(d => (d.tag || 'Лекарство') === currentTagFilter);
    }
    const sorted = [...filtered].sort(function(a, b) {
        var nameA = (a.name || '').toLowerCase();
        var nameB = (b.name || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });
    renderDrugList(allList, sorted);
    if (allEmpty) allEmpty.classList.toggle('hidden', sorted.length > 0);
}

function renderTagFilter() {
    if (!tagFilter) return;
    const tags = new Set();
    allDrugs.forEach(d => tags.add(d.tag || 'Лекарство'));
    tagFilter.innerHTML = '<button class="tag-btn active" data-tag="all">Все</button>';
    tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.dataset.tag = tag;
        btn.textContent = tag;
        if (tag === currentTagFilter) btn.classList.add('active');
        tagFilter.appendChild(btn);
    });
}

function renderDrugList(container, drugs) {
    if (!container) return;
    container.innerHTML = '';
    drugs.forEach(function(d) {
        var card = document.createElement('div');
        card.className = 'drug-card ' + getStatus(d.expiryDate);
        card.addEventListener('click', function() {
            openCard(d);
        });

        var photoHTML = '';
        var firstPhoto = getFirstPhoto(d);
        if (firstPhoto) {
            photoHTML = '<img src="' + firstPhoto + '" class="drug-thumb" alt="">';
        } else {
            photoHTML = '<div class="drug-thumb-placeholder">💊</div>';
        }

        var tagLabel = d.tag || 'Лекарство';

        card.innerHTML =
            photoHTML +
            '<div class="drug-info">' +
                '<div class="drug-name">' + escapeHTML(d.name || '') + '</div>' +
                '<div class="drug-substance">' + escapeHTML(d.substance || '') + '</div>' +
                '<span class="drug-tag">' + escapeHTML(tagLabel) + '</span>' +
            '</div>' +
            '<div class="drug-meta">' +
                '<div class="drug-expiry">до ' + formatDateShort(d.expiryDate) + '</div>' +
                '<div class="drug-remaining">' + escapeHTML(d.remaining || '') + '</div>' +
            '</div>';

        container.appendChild(card);
    });
}

function getFirstPhoto(drug) {
    if (drug.photos && Array.isArray(drug.photos) && drug.photos.length > 0) return drug.photos[0];
    if (drug.photo) return drug.photo;
    return null;
}

function getAllPhotos(drug) {
    if (drug.photos && Array.isArray(drug.photos) && drug.photos.length > 0) return drug.photos;
    if (drug.photo) return [drug.photo];
    return [];
}

// === ФИЛЬТР ТЕГОВ ===
if (tagFilter) {
    tagFilter.addEventListener('click', function(e) {
        if (e.target.classList.contains('tag-btn')) {
            currentTagFilter = e.target.dataset.tag;
            document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderAllTab();
        }
    });
}

// === ВКЛАДКИ ===
if (tabs) {
    tabs.addEventListener('click', function(e) {
        if (e.target.classList.contains('tab')) {
            switchTab(e.target.dataset.tab);
        }
    });
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    var activeTab = document.querySelector('[data-tab="' + tab + '"]');
    if (activeTab) activeTab.classList.add('active');
    if (mainContent) mainContent.classList.toggle('active', tab === 'main');
    if (allContent) allContent.classList.toggle('active', tab === 'all');
    if (searchResults) searchResults.classList.add('hidden');
    if (searchContainer) searchContainer.classList.add('hidden');
    searchVisible = false;
    if (searchInput) searchInput.value = '';
}

// === ПОИСК ===
if (searchToggle) {
    searchToggle.addEventListener('click', function() {
        searchVisible = !searchVisible;
        if (searchVisible) {
            if (searchContainer) searchContainer.classList.remove('hidden');
            if (searchInput) searchInput.focus();
        } else {
            if (searchContainer) searchContainer.classList.add('hidden');
            if (searchInput) searchInput.value = '';
            if (searchResults) searchResults.classList.add('hidden');
            if (currentTab === 'main') {
                if (mainContent) mainContent.classList.add('active');
                if (allContent) allContent.classList.remove('active');
            } else {
                if (allContent) allContent.classList.add('active');
                if (mainContent) mainContent.classList.remove('active');
            }
        }
    });
}

if (searchInput) {
    searchInput.addEventListener('input', function() {
        var query = searchInput.value.trim().toLowerCase();
        if (query === '') {
            if (searchResults) searchResults.classList.add('hidden');
            if (currentTab === 'main') {
                if (mainContent) mainContent.classList.add('active');
                if (allContent) allContent.classList.remove('active');
            } else {
                if (allContent) allContent.classList.add('active');
                if (mainContent) mainContent.classList.remove('active');
            }
            return;
        }
        if (mainContent) mainContent.classList.remove('active');
        if (allContent) allContent.classList.remove('active');
        if (searchResults) searchResults.classList.remove('hidden');
        var filtered = allDrugs.filter(function(d) {
            return (d.name || '').toLowerCase().indexOf(query) !== -1 ||
                   (d.substance || '').toLowerCase().indexOf(query) !== -1;
        });
        if (searchResultsList) searchResultsList.innerHTML = '';
        if (noResults) noResults.classList.toggle('hidden', filtered.length > 0);
        filtered.sort(function(a, b) {
            return parseExpiryDate(a.expiryDate) - parseExpiryDate(b.expiryDate);
        });
        filtered.forEach(function(d) {
            var card = document.createElement('div');
            var status = getStatus(d.expiryDate);
            card.className = 'drug-card ' + status;
            card.addEventListener('click', function() {
                searchInput.value = '';
                if (searchResults) searchResults.classList.add('hidden');
                if (searchContainer) searchContainer.classList.add('hidden');
                searchVisible = false;
                switchTab('main');
                openCard(d);
            });
            var photoHTML = '';
            var firstPhoto = getFirstPhoto(d);
            if (firstPhoto) {
                photoHTML = '<img src="' + firstPhoto + '" class="drug-thumb" alt="">';
            } else {
                photoHTML = '<div class="drug-thumb-placeholder">💊</div>';
            }
            var tagLabel = d.tag || 'Лекарство';
            card.innerHTML =
                photoHTML +
                '<div class="drug-info">' +
                    '<div class="drug-name">' + escapeHTML(d.name || '') + '</div>' +
                    '<div class="drug-substance">' + escapeHTML(d.substance || '') + '</div>' +
                    '<span class="drug-tag">' + escapeHTML(tagLabel) + '</span>' +
                '</div>' +
                '<div class="drug-meta">' +
                    '<div class="drug-expiry">до ' + formatDateShort(d.expiryDate) + '</div>' +
                    '<div class="drug-remaining">' + escapeHTML(d.remaining || '') + '</div>' +
                '</div>';
            if (searchResultsList) searchResultsList.appendChild(card);
        });
    });
}

// === ДОБАВЛЕНИЕ / ФОТО ===
if (addButton) {
    addButton.addEventListener('click', function() {
        openForm(null);
    });
}

if (photoButton) {
    photoButton.addEventListener('click', function() {
        if (photoInput) photoInput.click();
    });
}

if (photoInput) {
    photoInput.addEventListener('change', function(e) {
        var files = Array.from(e.target.files);
        files.forEach(function(file) {
            var reader = new FileReader();
            reader.onload = function(ev) {
                var img = new Image();
                img.onload = function() {
                    var canvas = document.createElement('canvas');
                    var MAX = 400;
                    var w = img.width;
                    var h = img.height;
                    if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                    else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                    canvas.width = w;
                    canvas.height = h;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    var data = canvas.toDataURL('image/jpeg', 0.7);
                    tempPhotos.push(data);
                    renderTempPhotos();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        photoInput.value = '';
    });
}

function renderTempPhotos() {
    if (!photoList) return;
    photoList.innerHTML = '';
    tempPhotos.forEach(function(photo, index) {
        var div = document.createElement('div');
        div.className = 'photo-item';
        div.innerHTML =
            '<img src="' + photo + '" alt="">' +
            '<button type="button" class="photo-item-remove" data-index="' + index + '">✕</button>';
        div.querySelector('.photo-item-remove').addEventListener('click', function() {
            tempPhotos.splice(index, 1);
            renderTempPhotos();
        });
        photoList.appendChild(div);
    });
}

function openForm(drug) {
    if (!formModal) return;
    tempPhotos = [];
    formModal.classList.remove('hidden');
    if (drug) {
        if (formTitle) formTitle.textContent = 'Редактировать';
        if (drugId) drugId.value = drug.id;
        if (tagInput) tagInput.value = drug.tag || 'Лекарство';
        if (nameInput) nameInput.value = drug.name || '';
        if (substanceInput) substanceInput.value = drug.substance || '';
        if (packInput) packInput.value = drug.packSize || '';
        if (remainingInput) remainingInput.value = drug.remaining || '';
        if (drug.expiryDate) {
            var d = parseExpiryDate(drug.expiryDate);
            if (monthInput) monthInput.value = d.getMonth();
            if (yearInput) yearInput.value = d.getFullYear();
        }
        tempPhotos = getAllPhotos(drug);
        renderTempPhotos();
    } else {
        if (formTitle) formTitle.textContent = 'Новое лекарство';
        if (drugId) drugId.value = '';
        if (tagInput) tagInput.value = 'Лекарство';
        if (drugForm) drugForm.reset();
        initMonthYear();
        renderTempPhotos();
    }
}

if (cancelForm) {
    cancelForm.addEventListener('click', function() {
        if (formModal) formModal.classList.add('hidden');
    });
}

if (closeFormModal) {
    closeFormModal.addEventListener('click', function() {
        if (formModal) formModal.classList.add('hidden');
    });
}

if (drugForm) {
    drugForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var month = parseInt(monthInput ? monthInput.value : 0);
        var year = parseInt(yearInput ? yearInput.value : 2026);
        var expiryDate = year + '-' + String(month + 1).padStart(2, '0') + '-01';

        var drug = {
            tag: tagInput ? tagInput.value : 'Лекарство',
            name: nameInput ? nameInput.value.trim() : '',
            substance: substanceInput ? substanceInput.value.trim() : '',
            packSize: packInput ? packInput.value.trim() : '',
            expiryDate: expiryDate,
            remaining: remainingInput ? remainingInput.value.trim() : '',
            photos: tempPhotos.slice()
        };

        if (!drug.name) return;

        if (drugId && drugId.value) {
            drug.id = parseInt(drugId.value);
            await updateDrug(drug);
        } else {
            await addDrug(drug);
        }

        if (formModal) formModal.classList.add('hidden');
        await refreshAll();
    });
}

// === КАРТОЧКА ===
function openCard(drug) {
    if (!cardModal) return;
    currentCardDrug = drug;
    if (cardTag) cardTag.textContent = drug.tag || 'Лекарство';
    if (cardName) cardName.textContent = drug.name || '';
    if (cardSubstance) cardSubstance.textContent = drug.substance || '';
    if (cardPack) cardPack.textContent = drug.packSize || '—';
    if (cardExpiry) cardExpiry.textContent = formatDate(drug.expiryDate);
    if (cardRemaining) cardRemaining.textContent = drug.remaining || '—';

    var photos = getAllPhotos(drug);
    if (photos.length > 0) {
        if (cardPhoto) {
            cardPhoto.src = photos[0];
            cardPhoto.classList.remove('hidden');
        }
        if (cardPhotoPlaceholder) cardPhotoPlaceholder.classList.add('hidden');
    } else {
        if (cardPhoto) cardPhoto.classList.add('hidden');
        if (cardPhotoPlaceholder) cardPhotoPlaceholder.classList.remove('hidden');
    }

    // Точки-индикаторы
    if (photoDots) {
        photoDots.innerHTML = '';
        if (photos.length > 1) {
            photos.forEach(function(_, i) {
                var dot = document.createElement('div');
                dot.className = 'photo-dot' + (i === 0 ? ' active' : '');
                photoDots.appendChild(dot);
            });
        }
    }

    cardModal.classList.remove('hidden');

    // Листание фото по тапу
    if (cardPhoto && photos.length > 1) {
        var currentPhotoIndex = 0;
        cardPhoto.onclick = function() {
            currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
            cardPhoto.src = photos[currentPhotoIndex];
            var dots = photoDots ? photoDots.querySelectorAll('.photo-dot') : [];
            dots.forEach(function(dot, i) {
                dot.classList.toggle('active', i === currentPhotoIndex);
            });
        };
    }
}

if (editFromCard) {
    editFromCard.addEventListener('click', function() {
        if (cardModal) cardModal.classList.add('hidden');
        openForm(currentCardDrug);
    });
}

if (deleteFromCard) {
    deleteFromCard.addEventListener('click', async function() {
        if (!currentCardDrug) return;
        if (!confirm('Удалить?')) return;
        await deleteDrug(currentCardDrug.id);
        if (cardModal) cardModal.classList.add('hidden');
        showToast('Удалено');
        await refreshAll();
    });
}

if (closeCard) {
    closeCard.addEventListener('click', function() {
        if (cardModal) cardModal.classList.add('hidden');
    });
}

document.querySelectorAll('.modal-backdrop').forEach(function(bg) {
    bg.addEventListener('click', function() {
        if (formModal) formModal.classList.add('hidden');
        if (cardModal) cardModal.classList.add('hidden');
    });
});

// === УВЕДОМЛЕНИЕ ===
function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(function() {
        toast.classList.add('hidden');
    }, 2000);
}

// === УТИЛИТЫ ===
function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

// === ЗАПУСК ===
init();