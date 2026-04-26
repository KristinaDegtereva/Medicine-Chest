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
const searchResults = document.getElementById('searchResults');
const searchResultsList = document.getElementById('searchResultsList');
const noResults = document.getElementById('noResults');
const addButton = document.getElementById('addButton');
const formModal = document.getElementById('formModal');
const cardModal = document.getElementById('cardModal');
const drugForm = document.getElementById('drugForm');
const formTitle = document.getElementById('formTitle');
const drugId = document.getElementById('drugId');
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
let tempPhotos = [];

// === ИНИЦИАЛИЗАЦИЯ ===
function initMonthYear() {
    monthInput.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = getMonthName(i);
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
    try {
        await openDB();
        initMonthYear();
        await refreshAll();
    } catch (err) {
        console.error('Ошибка инициализации:', err);
    }
}

// === ОТРИСОВКА ===
async function refreshAll() {
    allDrugs = await getAllDrugs();
    renderMainTab();
    renderAllTab();
}

function renderMainTab() {
    const expired = [];
    const soon = [];
    allDrugs.forEach(d => {
        const status = getStatus(d.expiryDate);
        if (status === 'expired') expired.push(d);
        else if (status === 'soon') soon.push(d);
    });
    renderDrugList(expiredList, expired);
    renderDrugList(soonList, soon);
    expiredSection.classList.toggle('hidden', expired.length === 0);
    soonSection.classList.toggle('hidden', soon.length === 0);
    noContent.classList.toggle('hidden', expired.length > 0 || soon.length > 0);
}

function renderAllTab() {
    const sorted = [...allDrugs].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB, 'ru');
    });
    renderDrugList(allList, sorted);
    allEmpty.classList.toggle('hidden', sorted.length > 0);
}

function renderDrugList(container, drugs) {
    container.innerHTML = '';
    drugs.forEach(d => {
        const card = document.createElement('div');
        card.className = 'drug-card ' + getStatus(d.expiryDate);
        card.addEventListener('click', () => openCard(d));

        let photoHTML = '';
        const firstPhoto = getFirstPhoto(d);
        if (firstPhoto) {
            photoHTML = `<img src="${firstPhoto}" class="drug-thumb" alt="">`;
        } else {
            photoHTML = `<div class="drug-thumb-placeholder">💊</div>`;
        }

        card.innerHTML = `
            ${photoHTML}
            <div class="drug-info">
                <div class="drug-name">${escapeHTML(d.name || '')}</div>
                <div class="drug-substance">${escapeHTML(d.substance || '')}</div>
            </div>
            <div class="drug-meta">
                <div class="drug-expiry ${getStatus(d.expiryDate) === 'expired' ? 'expired-text' : getStatus(d.expiryDate) === 'soon' ? 'soon-text' : ''}">до ${formatDateShort(d.expiryDate)}</div>
                <div class="drug-remaining">${escapeHTML(d.remaining || '')}</div>
            </div>
        `;
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

// === ВКЛАДКИ ===
tabs.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab')) {
        switchTab(e.target.dataset.tab);
    }
});

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const targetTab = document.querySelector(`[data-tab="${tab}"]`);
    if (targetTab) targetTab.classList.add('active');
    
    mainContent.classList.toggle('active', tab === 'main');
    allContent.classList.toggle('active', tab === 'all');
    searchResults.classList.add('hidden');
    searchContainer.classList.add('hidden');
    searchVisible = false;
    searchInput.value = '';
}

// === ПОИСК ===
searchToggle.addEventListener('click', () => {
    searchVisible = !searchVisible;
    if (searchVisible) {
        searchContainer.classList.remove('hidden');
        searchInput.focus();
    } else {
        searchContainer.classList.add('hidden');
        searchInput.value = '';
        searchResults.classList.add('hidden');
        if (currentTab === 'main') {
            mainContent.classList.add('active');
            allContent.classList.remove('active');
        } else {
            allContent.classList.add('active');
            mainContent.classList.remove('active');
        }
    }
});

searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query === '') {
        searchResults.classList.add('hidden');
        if (currentTab === 'main') {
            mainContent.classList.add('active');
            allContent.classList.remove('active');
        } else {
            allContent.classList.add('active');
            mainContent.classList.remove('active');
        }
        return;
    }
    mainContent.classList.remove('active');
    allContent.classList.remove('active');
    searchResults.classList.remove('hidden');
    const filtered = allDrugs.filter(d =>
        (d.name || '').toLowerCase().includes(query) ||
        (d.substance || '').toLowerCase().includes(query)
    );
    searchResultsList.innerHTML = '';
    noResults.classList.toggle('hidden', filtered.length > 0);
    filtered.sort((a, b) => {
        const da = parseExpiryDate(a.expiryDate);
        const db = parseExpiryDate(b.expiryDate);
        return da - db;
    });
    filtered.forEach(d => {
        const card = document.createElement('div');
        const status = getStatus(d.expiryDate);
        card.className = 'drug-card ' + status;
        card.addEventListener('click', () => {
            searchInput.value = '';
            searchResults.classList.add('hidden');
            searchContainer.classList.add('hidden');
            searchVisible = false;
            switchTab('main');
            openCard(d);
        });
        let photoHTML = '';
        const firstPhoto = getFirstPhoto(d);
        if (firstPhoto) {
            photoHTML = `<img src="${firstPhoto}" class="drug-thumb" alt="">`;
        } else {
            photoHTML = `<div class="drug-thumb-placeholder">💊</div>`;
        }
        card.innerHTML = `
            ${photoHTML}
            <div class="drug-info">
                <div class="drug-name">${escapeHTML(d.name || '')}</div>
                <div class="drug-substance">${escapeHTML(d.substance || '')}</div>
            </div>
            <div class="drug-meta">
                <div class="drug-expiry ${status === 'expired' ? 'expired-text' : status === 'soon' ? 'soon-text' : ''}">до ${formatDateShort(d.expiryDate)}</div>
                <div class="drug-remaining">${escapeHTML(d.remaining || '')}</div>
            </div>
        `;
        searchResultsList.appendChild(card);
    });
});

// === ДОБАВЛЕНИЕ / ФОТО ===
addButton.addEventListener('click', () => {
    openForm(null);
});

photoButton.addEventListener('click', () => {
    photoInput.click();
});

photoInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 400;
                let w = img.width;
                let h = img.height;
                if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const data = canvas.toDataURL('image/jpeg', 0.7);
                tempPhotos.push(data);
                renderTempPhotos();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
    photoInput.value = '';
});

function renderTempPhotos() {
    photoList.innerHTML = '';
    tempPhotos.forEach((photo, index) => {
        const div = document.createElement('div');
        div.className = 'photo-item';
        div.innerHTML = `
            <img src="${photo}" alt="">
            <button type="button" class="photo-item-remove" data-index="${index}">✕</button>
        `;
        div.querySelector('.photo-item-remove').addEventListener('click', () => {
            tempPhotos.splice(index, 1);
            renderTempPhotos();
        });
        photoList.appendChild(div);
    });
}

function openForm(drug) {
    tempPhotos = [];
    formModal.classList.remove('hidden');
    if (drug) {
        formTitle.textContent = 'Редактировать';
        drugId.value = drug.id;
        nameInput.value = drug.name || '';
        substanceInput.value = drug.substance || '';
        packInput.value = drug.packSize || '';
        remainingInput.value = drug.remaining || '';
        if (drug.expiryDate) {
            const d = parseExpiryDate(drug.expiryDate);
            monthInput.value = d.getMonth();
            yearInput.value = d.getFullYear();
        }
        tempPhotos = getAllPhotos(drug);
        renderTempPhotos();
    } else {
        formTitle.textContent = 'Новое лекарство';
        drugId.value = '';
        drugForm.reset();
        initMonthYear();
        renderTempPhotos();
    }
}

cancelForm.addEventListener('click', () => {
    formModal.classList.add('hidden');
});

closeFormModal.addEventListener('click', () => {
    formModal.classList.add('hidden');
});

drugForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const month = parseInt(monthInput.value);
    const year = parseInt(yearInput.value);
    const expiryDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const drug = {
        name: nameInput.value.trim(),
        substance: substanceInput.value.trim(),
        packSize: packInput.value.trim(),
        expiryDate: expiryDate,
        remaining: remainingInput.value.trim(),
        photos: [...tempPhotos]
    };

    if (!drug.name) return;

    if (drugId.value) {
        drug.id = parseInt(drugId.value);
        await updateDrug(drug);
    } else {
        await addDrug(drug);
    }

    formModal.classList.add('hidden');
    await refreshAll();
});

// === КАРТОЧКА ===
function openCard(drug) {
    currentCardDrug = drug;
    cardName.textContent = drug.name || '';
    cardSubstance.textContent = drug.substance || '';
    cardPack.textContent = drug.packSize || '—';
    cardExpiry.textContent = formatDate(drug.expiryDate);
    cardRemaining.textContent = drug.remaining || '—';

    const photos = getAllPhotos(drug);
    if (photos.length > 0) {
        cardPhoto.src = photos[0];
        cardPhoto.classList.remove('hidden');
        cardPhotoPlaceholder.classList.add('hidden');
    } else {
        cardPhoto.classList.add('hidden');
        cardPhotoPlaceholder.classList.remove('hidden');
    }

    photoDots.innerHTML = '';
    if (photos.length > 1) {
        photos.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = 'photo-dot' + (i === 0 ? ' active' : '');
            photoDots.appendChild(dot);
        });
    }

    cardModal.classList.remove('hidden');
}

editFromCard.addEventListener('click', () => {
    cardModal.classList.add('hidden');
    openForm(currentCardDrug);
});

deleteFromCard.addEventListener('click', async () => {
    if (!confirm('Удалить это лекарство?')) return;
    await deleteDrug(currentCardDrug.id);
    cardModal.classList.add('hidden');
    showToast('Лекарство удалено');
    await refreshAll();
});

closeCard.addEventListener('click', () => {
    cardModal.classList.add('hidden');
});

document.querySelectorAll('.modal-backdrop').forEach(bg => {
    bg.addEventListener('click', () => {
        formModal.classList.add('hidden');
        cardModal.classList.add('hidden');
    });
});

// === УВЕДОМЛЕНИЕ ===
function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

// === УТИЛИТЫ ===
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

// === ЗАПУСК ===
init();        request.onsuccess = () => resolve(request.result);
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
    const parts = dateString.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
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
const searchResults = document.getElementById('searchResults');
const searchResultsList = document.getElementById('searchResultsList');
const noResults = document.getElementById('noResults');
const addButton = document.getElementById('addButton');
const formModal = document.getElementById('formModal');
const cardModal = document.getElementById('cardModal');
const drugForm = document.getElementById('drugForm');
const formTitle = document.getElementById('formTitle');
const drugId = document.getElementById('drugId');
const nameInput = document.getElementById('nameInput');
const substanceInput = document.getElementById('substanceInput');
const packInput = document.getElementById('packInput');
const monthInput = document.getElementById('monthInput');
const yearInput = document.getElementById('yearInput');
const remainingInput = document.getElementById('remainingInput');
const photoData = document.getElementById('photoData');
const photoInput = document.getElementById('photoInput');
const photoButton = document.getElementById('photoButton');
const photoList = document.getElementById('photoList');
const cancelForm = document.getElementById('cancelForm');
const closeFormModal = document.getElementById('closeFormModal');
const toast = document.getElementById('toast');
const tabs = document.getElementById('tabs');

const cardPhoto = document.getElementById('cardPhoto');
const cardPhotoPlaceholder = document.getElementById('cardPhotoPlaceholder');
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
let tempPhotos = []; // временные фото при добавлении/редактировании

// === ИНИЦИАЛИЗАЦИЯ ===
function initMonthYear() {
    monthInput.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = getMonthName(i);
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
}

function renderMainTab() {
    const expired = [];
    const soon = [];
    allDrugs.forEach(d => {
        const status = getStatus(d.expiryDate);
        if (status === 'expired') expired.push(d);
        else if (status === 'soon') soon.push(d);
    });
    renderDrugList(expiredList, expired);
    renderDrugList(soonList, soon);
    expiredSection.classList.toggle('hidden', expired.length === 0);
    soonSection.classList.toggle('hidden', soon.length === 0);
    noContent.classList.toggle('hidden', expired.length > 0 || soon.length > 0);
}

function renderAllTab() {
    // Сортировка строго по алфавиту
    const sorted = [...allDrugs].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    renderDrugList(allList, sorted);
    allEmpty.classList.toggle('hidden', sorted.length > 0);
}

function renderDrugList(container, drugs) {
    container.innerHTML = '';
    // Не сортируем здесь — порядок задаётся выше
    drugs.forEach(d => {
        const card = document.createElement('div');
        card.className = 'drug-card ' + getStatus(d.expiryDate);
        card.addEventListener('click', () => openCard(d));

        let photoHTML = '';
        const firstPhoto = getFirstPhoto(d);
        if (firstPhoto) {
            photoHTML = `<img src="${firstPhoto}" class="drug-thumb" alt="">`;
        } else {
            photoHTML = `<div class="drug-thumb-placeholder">💊</div>`;
        }

        card.innerHTML = `
            ${photoHTML}
            <div class="drug-info">
                <div class="drug-name">${escapeHTML(d.name)}</div>
                <div class="drug-substance">${escapeHTML(d.substance || '')}</div>
            </div>
            <div class="drug-meta">
                <div class="drug-expiry ${getStatus(d.expiryDate) === 'expired' ? 'expired-text' : getStatus(d.expiryDate) === 'soon' ? 'soon-text' : ''}">до ${formatDateShort(d.expiryDate)}</div>
                <div class="drug-remaining">${escapeHTML(d.remaining || '')}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

function getFirstPhoto(drug) {
    if (drug.photos && drug.photos.length > 0) return drug.photos[0];
    if (drug.photo) return drug.photo;
    return null;
}

function getAllPhotos(drug) {
    if (drug.photos && drug.photos.length > 0) return drug.photos;
    if (drug.photo) return [drug.photo];
    return [];
}

// === ВКЛАДКИ ===
tabs.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab')) {
        switchTab(e.target.dataset.tab);
    }
});

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    mainContent.classList.toggle('active', tab === 'main');
    allContent.classList.toggle('active', tab === 'all');
    searchResults.classList.add('hidden');
    searchContainer.classList.add('hidden');
    searchVisible = false;
    searchInput.value = '';
}

// === ПОИСК ===
searchToggle.addEventListener('click', () => {
    searchVisible = !searchVisible;
    if (searchVisible) {
        searchContainer.classList.remove('hidden');
        searchInput.focus();
    } else {
        searchContainer.classList.add('hidden');
        searchInput.value = '';
        searchResults.classList.add('hidden');
        if (currentTab === 'main') {
            mainContent.classList.add('active');
            allContent.classList.remove('active');
        } else {
            allContent.classList.add('active');
            mainContent.classList.remove('active');
        }
    }
});

searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query === '') {
        searchResults.classList.add('hidden');
        if (currentTab === 'main') {
            mainContent.classList.add('active');
            allContent.classList.remove('active');
        } else {
            allContent.classList.add('active');
            mainContent.classList.remove('active');
        }
        return;
    }
    mainContent.classList.remove('active');
    allContent.classList.remove('active');
    searchResults.classList.remove('hidden');
    const filtered = allDrugs.filter(d =>
        d.name.toLowerCase().includes(query) ||
        (d.substance && d.substance.toLowerCase().includes(query))
    );
    searchResultsList.innerHTML = '';
    noResults.classList.toggle('hidden', filtered.length > 0);
    filtered.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    filtered.forEach(d => {
        const card = document.createElement('div');
        const status = getStatus(d.expiryDate);
        card.className = 'drug-card ' + status;
        card.addEventListener('click', () => {
            searchInput.value = '';
            searchResults.classList.add('hidden');
            searchContainer.classList.add('hidden');
            searchVisible = false;
            switchTab('main');
            openCard(d);
        });
        let photoHTML = '';
        const firstPhoto = getFirstPhoto(d);
        if (firstPhoto) {
            photoHTML = `<img src="${firstPhoto}" class="drug-thumb" alt="">`;
        } else {
            photoHTML = `<div class="drug-thumb-placeholder">💊</div>`;
        }
        card.innerHTML = `
            ${photoHTML}
            <div class="drug-info">
                <div class="drug-name">${escapeHTML(d.name)}</div>
                <div class="drug-substance">${escapeHTML(d.substance || '')}</div>
            </div>
            <div class="drug-meta">
                <div class="drug-expiry ${status === 'expired' ? 'expired-text' : status === 'soon' ? 'soon-text' : ''}">до ${formatDateShort(d.expiryDate)}</div>
                <div class="drug-remaining">${escapeHTML(d.remaining || '')}</div>
            </div>
        `;
        searchResultsList.appendChild(card);
    });
});

// === ДОБАВЛЕНИЕ / ФОТО ===
addButton.addEventListener('click', () => openForm(null));

photoButton.addEventListener('click', () => photoInput.click());

photoInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 400;
                let w = img.width;
                let h = img.height;
                if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const data = canvas.toDataURL('image/jpeg', 0.7);
                tempPhotos.push(data);
                renderTempPhotos();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
    photoInput.value = '';
});

function renderTempPhotos() {
    photoList.innerHTML = '';
    tempPhotos.forEach((photo, index) => {
        const div = document.createElement('div');
        div.className = 'photo-item';
        div.innerHTML = `
            <img src="${photo}" alt="">
            <button type="button" class="photo-item-remove" data-index="${index}">✕</button>
        `;
        div.querySelector('.photo-item-remove').addEventListener('click', () => {
            tempPhotos.splice(index, 1);
            renderTempPhotos();
        });
        photoList.appendChild(div);
    });
}

function openForm(drug) {
    tempPhotos = [];
    formModal.classList.remove('hidden');
    if (drug) {
        formTitle.textContent = 'Редактировать';
        drugId.value = drug.id;
        nameInput.value = drug.name;
        substanceInput.value = drug.substance || '';
        packInput.value = drug.packSize || '';
        remainingInput.value = drug.remaining || '';
        if (drug.expiryDate) {
            const d = parseExpiryDate(drug.expiryDate);
            monthInput.value = d.getMonth();
            yearInput.value = d.getFullYear();
        }
        tempPhotos = getAllPhotos(drug);
        renderTempPhotos();
    } else {
        formTitle.textContent = 'Новое лекарство';
        drugId.value = '';
        drugForm.reset();
        initMonthYear();
        renderTempPhotos();
    }
}

cancelForm.addEventListener('click', () => formModal.classList.add('hidden'));
closeFormModal.addEventListener('click', () => formModal.classList.add('hidden'));

drugForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const month = parseInt(monthInput.value);
    const year = parseInt(yearInput.value);
    const expiryDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const drug = {
        name: nameInput.value.trim(),
        substance: substanceInput.value.trim(),
        packSize: packInput.value.trim(),
        expiryDate: expiryDate,
        remaining: remainingInput.value.trim(),
        photos: [...tempPhotos]
    };

    if (!drug.name) return;

    if (drugId.value) {
        drug.id = parseInt(drugId.value);
        await updateDrug(drug);
    } else {
        await addDrug(drug);
    }

    formModal.classList.add('hidden');
    await refreshAll();
});

// === КАРТОЧКА ===
function openCard(drug) {
    currentCardDrug = drug;
    cardName.textContent = drug.name;
    cardSubstance.textContent = drug.substance || '';
    cardPack.textContent = drug.packSize || '—';
    cardExpiry.textContent = formatDate(drug.expiryDate);
    cardRemaining.textContent = drug.remaining || '—';

    const photos = getAllPhotos(drug);
    if (photos.length > 0) {
        cardPhoto.src = photos[0];
        cardPhoto.classList.remove('hidden');
        cardPhotoPlaceholder.classList.add('hidden');
    } else {
        cardPhoto.classList.add('hidden');
        cardPhotoPlaceholder.classList.remove('hidden');
    }

    // Точки-индикаторы
    photoDots.innerHTML = '';
    if (photos.length > 1) {
        photos.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = 'photo-dot' + (i === 0 ? ' active' : '');
            photoDots.appendChild(dot);
        });
    }

    cardModal.classList.remove('hidden');
}

editFromCard.addEventListener('click', () => {
    cardModal.classList.add('hidden');
    openForm(currentCardDrug);
});

deleteFromCard.addEventListener('click', async () => {
    if (!confirm('Удалить это лекарство?')) return;
    await deleteDrug(currentCardDrug.id);
    cardModal.classList.add('hidden');
    showToast('Лекарство удалено');
    await refreshAll();
});

closeCard.addEventListener('click', () => cardModal.classList.add('hidden'));

document.querySelectorAll('.modal-backdrop').forEach(bg => {
    bg.addEventListener('click', () => {
        formModal.classList.add('hidden');
        cardModal.classList.add('hidden');
    });
});

// === УВЕДОМЛЕНИЕ ===
function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

// === УТИЛИТЫ ===
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// === ЗАПУСК ===
init();
