/* ========================================
   رفيق القرآن - App Logic v3.0
   Theme System + Professional Mushaf
   ======================================== */

// Global State
let currentAudio = null;
let allSurahs = [];
let currentSurahNum = null;
let currentReciter = 'ar.alafasy';
let currentFontSize = 100;
let autoPlayNext = false;
let quizStreak = 0;
let quizCorrect = 0;
let quizWrong = 0;
let speedTimerInterval = null;
let currentQuizType = '';
let currentCorrectAnswer = '';
let currentScrambledWords = [];
let currentScrambledSelected = [];
let currentMushafStyle = 'uthmani';

// Data Storage Keys
const STORAGE_KEYS = {
    THEME: 'quran_theme',
    PLAN: 'quran_plan',
    STATS: 'quran_stats',
    BADGES: 'quran_badges',
    BOOKMARKS: 'quran_bookmarks',
    HISTORY: 'quran_history',
    SETTINGS: 'quran_settings',
    CACHE: 'quran_cache',
    FONT_SIZE: 'quran_font_size',
    RECITER: 'quran_reciter',
    MUSHAF_STYLE: 'quran_mushaf_style',
    COLOR_THEME: 'quran_color_theme'
};

// Theme Definitions
const THEMES = ['classic', 'ocean', 'royal', 'sunset', 'forest', 'midnight'];

// Mushaf Style Definitions
const MUSHAF_STYLES = {
    uthmani: { font: "'Scheherazade New', 'Amiri', serif", lineHeight: 2.8 },
    'mushaf-madinah': { font: "'Amiri', 'Scheherazade New', serif", lineHeight: 2.6 },
    simple: { font: "'Cairo', sans-serif", lineHeight: 2.2 }
};

// Juz mapping (approximate page numbers)
const JUZ_PAGES = {
    1: 1, 2: 22, 3: 42, 4: 62, 5: 82, 6: 102, 7: 121, 8: 141, 9: 161, 10: 181,
    11: 201, 12: 221, 13: 241, 14: 261, 15: 281, 16: 301, 17: 321, 18: 341, 19: 361, 20: 381,
    21: 401, 22: 421, 23: 441, 24: 461, 25: 481, 26: 501, 27: 521, 28: 541, 29: 561, 30: 582
};

// Badge Definitions
const BADGES = [
    { id: 'first_werd', name: 'بداية الطريق', icon: 'fa-seedling', desc: 'أكمل أول ورد', condition: (s) => s.completedWerds >= 1 },
    { id: 'week_streak', name: 'أسبوع متتالي', icon: 'fa-fire', desc: '7 أيام متتالية', condition: (s) => s.streak >= 7 },
    { id: 'month_streak', name: 'شهر متتالي', icon: 'fa-fire-alt', desc: '30 يوم متتالي', condition: (s) => s.streak >= 30 },
    { id: 'first_quiz', name: 'أول اختبار', icon: 'fa-graduation-cap', desc: 'أكمل أول اختبار', condition: (s) => s.quizzesTaken >= 1 },
    { id: 'quiz_master', name: 'سيد الاختبارات', icon: 'fa-trophy', desc: '50 إجابة صحيحة', condition: (s) => s.correctAnswers >= 50 },
    { id: 'hafiz_1', name: 'حافظ الجزء الأول', icon: 'fa-book-open', desc: 'ختم الجزء الأول', condition: (s) => s.pagesRead >= 20 },
    { id: 'hafiz_10', name: 'حافظ العشرة', icon: 'fa-star', desc: 'ختم 10 أجزاء', condition: (s) => s.pagesRead >= 200 },
    { id: 'hafiz_30', name: 'خاتم القرآن', icon: 'fa-crown', desc: 'ختم القرآن كاملاً', condition: (s) => s.pagesRead >= 604 },
    { id: 'night_reader', name: 'قارئ الليل', icon: 'fa-moon', desc: 'اقرأ بعد منتصف الليل', condition: (s) => s.nightReads >= 1 },
    { id: 'early_bird', name: 'قارئ الفجر', icon: 'fa-sun', desc: 'اقرأ قبل الشروق', condition: (s) => s.earlyReads >= 1 },
    { id: 'bookmark_collector', name: 'جامع العلامات', icon: 'fa-bookmark', desc: '10 علامات مرجعية', condition: (s) => (s.bookmarks || []).length >= 10 },
    { id: 'speed_demon', name: 'سريع البديهة', icon: 'fa-bolt', desc: 'أجب بسرعة في 10 اختبارات', condition: (s) => s.speedQuizzes >= 10 }
];

// Plan Templates
const PLAN_TEMPLATES = {
    khatma30: { name: 'ختمة في 30 يوم', pagesPerDay: 20, totalDays: 30, startPage: 1, endPage: 604, type: 'intense' },
    khatma60: { name: 'ختمة في 60 يوم', pagesPerDay: 10, totalDays: 60, startPage: 1, endPage: 604, type: 'moderate' },
    khatma365: { name: 'ختمة في سنة', pagesPerDay: 2, totalDays: 302, startPage: 1, endPage: 604, type: 'light' },
    shortSurahs: { name: 'خطة السور القصيرة', pagesPerDay: 1, totalDays: 30, startPage: 582, endPage: 604, type: 'beginner' },
    tajweed: { name: 'خطة التجويد', pagesPerDay: 2, totalDays: 30, startPage: 1, endPage: 60, type: 'special' }
};

// ========================================
// Toast Notifications
// ========================================
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type]}"></i> ${message}`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, duration + 300);
}

// ========================================
// Data Management
// ========================================
function getData(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch { return defaultValue; }
}

function setData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getStats() {
    return getData(STORAGE_KEYS.STATS, {
        streak: 0,
        xp: 0,
        completedWerds: 0,
        pagesRead: 0,
        quizzesTaken: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        nightReads: 0,
        earlyReads: 0,
        bookmarks: [],
        speedQuizzes: 0,
        readTime: 0,
        lastReadDate: null,
        weeklyActivity: [0, 0, 0, 0, 0, 0, 0]
    });
}

function saveStats(stats) {
    setData(STORAGE_KEYS.STATS, stats);
    updateStatsPreview();
}

function addXP(amount) {
    const stats = getStats();
    stats.xp += amount;
    saveStats(stats);
    showToast(`+${amount} نقطة!`, 'success');
    checkBadges();
}

function addReadTime(minutes) {
    const stats = getStats();
    stats.readTime += minutes;
    saveStats(stats);
}

function recordRead(pages) {
    const stats = getStats();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (stats.lastReadDate === yesterday) {
        stats.streak++;
    } else if (stats.lastReadDate !== today) {
        stats.streak = 1;
    }

    stats.lastReadDate = today;
    stats.pagesRead += pages;
    stats.completedWerds++;

    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) stats.nightReads++;
    if (hour >= 4 && hour < 7) stats.earlyReads++;

    const dayIndex = new Date().getDay();
    stats.weeklyActivity[dayIndex] += pages;

    saveStats(stats);

    const history = getData(STORAGE_KEYS.HISTORY, []);
    history.unshift({ date: new Date().toISOString(), pages, surah: currentSurahNum });
    if (history.length > 100) history.pop();
    setData(STORAGE_KEYS.HISTORY, history);

    checkBadges();
}

// ========================================
// Badge System
// ========================================
function getBadges() {
    return getData(STORAGE_KEYS.BADGES, []);
}

function checkBadges() {
    const stats = getStats();
    const unlocked = getBadges();
    let newUnlock = false;

    BADGES.forEach(badge => {
        if (!unlocked.includes(badge.id) && badge.condition(stats)) {
            unlocked.push(badge.id);
            newUnlock = true;
            showToast(`🎉 حصلت على شارة: ${badge.name}!`, 'success', 4000);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
    });

    if (newUnlock) {
        setData(STORAGE_KEYS.BADGES, unlocked);
        renderBadges();
    }

    return newUnlock;
}

function renderBadges() {
    const grid = document.getElementById('badgesGrid');
    if (!grid) return;

    const unlocked = getBadges();
    grid.innerHTML = BADGES.map(badge => {
        const isUnlocked = unlocked.includes(badge.id);
        return `
            <div class="badge-item ${isUnlocked ? 'unlocked' : ''}" title="${badge.desc}">
                <i class="fas ${badge.icon}"></i>
                <span>${badge.name}</span>
            </div>
        `;
    }).join('');
}

// ========================================
// THEME SYSTEM
// ========================================
function setTheme(themeName) {
    if (!THEMES.includes(themeName)) return;

    const body = document.body;

    // Remove all theme classes
    THEMES.forEach(t => body.classList.remove('theme-' + t));

    // Add new theme
    body.classList.add('theme-' + themeName);

    // Save preference
    localStorage.setItem(STORAGE_KEYS.COLOR_THEME, themeName);

    // Update UI
    document.querySelectorAll('.theme-option').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.theme === themeName) {
            el.classList.add('active');
        }
    });

    showToast(`تم تغيير الثيم إلى: ${getThemeLabel(themeName)}`, 'success');
    if (navigator.vibrate) navigator.vibrate(20);
}

function getThemeLabel(theme) {
    const labels = {
        classic: 'كلاسيكي',
        ocean: 'محيطي',
        royal: 'ملكي',
        sunset: 'غروب',
        forest: 'غابة',
        midnight: 'منتصف الليل'
    };
    return labels[theme] || theme;
}

function loadTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.COLOR_THEME) || 'classic';
    const body = document.body;

    THEMES.forEach(t => body.classList.remove('theme-' + t));
    body.classList.add('theme-' + savedTheme);

    // Update UI if on settings screen
    document.querySelectorAll('.theme-option').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.theme === savedTheme) {
            el.classList.add('active');
        }
    });
}

// ========================================
// MUSHAF STYLE SYSTEM
// ========================================
function setMushafStyle(style) {
    if (!MUSHAF_STYLES[style]) return;

    currentMushafStyle = style;
    localStorage.setItem(STORAGE_KEYS.MUSHAF_STYLE, style);

    // Update UI
    document.querySelectorAll('.mushaf-option').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.style === style) {
            el.classList.add('active');
        }
    });

    // Re-render current surah if open
    if (currentSurahNum) {
        const surah = allSurahs.find(s => s.number === currentSurahNum);
        if (surah) {
            openSurah(currentSurahNum, surah.name);
        }
    }

    showToast(`تم تغيير نمط المصحف إلى: ${getMushafLabel(style)}`, 'success');
}

function getMushafLabel(style) {
    const labels = {
        'uthmani': 'عثماني',
        'mushaf-madinah': 'مصحف المدينة',
        'simple': 'مبسط'
    };
    return labels[style] || style;
}

function loadMushafStyle() {
    const savedStyle = localStorage.getItem(STORAGE_KEYS.MUSHAF_STYLE) || 'uthmani';
    currentMushafStyle = savedStyle;

    document.querySelectorAll('.mushaf-option').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.style === savedStyle) {
            el.classList.add('active');
        }
    });
}

// ========================================
// Theme & Settings
// ========================================
function toggleDarkMode() {
    const body = document.body;
    const icon = document.querySelector('#themeToggle i');
    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';

    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = isDark;

    localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
}

function toggleDarkModeFromSettings() {
    toggleDarkMode();
}

function loadSettings() {
    const settings = getData(STORAGE_KEYS.SETTINGS, {
        dailyReminder: false,
        reminderTime: '05:00',
        defaultFontSize: 100
    });

    const reminderToggle = document.getElementById('dailyReminderToggle');
    const reminderTime = document.getElementById('reminderTime');
    const fontSizeSlider = document.getElementById('defaultFontSize');
    const fontSizeValue = document.getElementById('defaultFontSizeValue');

    if (reminderToggle) reminderToggle.checked = settings.dailyReminder;
    if (reminderTime) reminderTime.value = settings.reminderTime;
    if (fontSizeSlider) {
        fontSizeSlider.value = settings.defaultFontSize;
        if (fontSizeValue) fontSizeValue.innerText = settings.defaultFontSize + '%';
    }

    currentFontSize = settings.defaultFontSize;
    currentReciter = localStorage.getItem(STORAGE_KEYS.RECITER) || 'ar.alafasy';

    const reciterSelect = document.getElementById('reciterSelect');
    if (reciterSelect) reciterSelect.value = currentReciter;

    // Load theme and mushaf style
    loadTheme();
    loadMushafStyle();
}

function saveSettings() {
    const settings = {
        dailyReminder: document.getElementById('dailyReminderToggle')?.checked || false,
        reminderTime: document.getElementById('reminderTime')?.value || '05:00',
        defaultFontSize: parseInt(document.getElementById('defaultFontSize')?.value) || 100
    };
    setData(STORAGE_KEYS.SETTINGS, settings);
}

function toggleDailyReminder() {
    saveSettings();
    const enabled = document.getElementById('dailyReminderToggle').checked;
    if (enabled) {
        requestNotificationPermission();
        showToast('تم تفعيل التذكير اليومي', 'success');
    } else {
        showToast('تم إلغاء التذكير', 'info');
    }
}

function updateReminderTime() {
    saveSettings();
    showToast('تم تحديث وقت التذكير', 'success');
}

function updateDefaultFontSize() {
    const value = document.getElementById('defaultFontSize').value;
    document.getElementById('defaultFontSizeValue').innerText = value + '%';
    currentFontSize = parseInt(value);
    saveSettings();
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ========================================
// Offline Detection
// ========================================
function updateOnlineStatus() {
    const indicator = document.getElementById('offlineIndicator');
    if (!navigator.onLine) {
        indicator.classList.remove('hidden');
        showToast('أنت في وضع عدم الاتصال', 'warning');
    } else {
        indicator.classList.add('hidden');
        showToast('تم استعادة الاتصال', 'success');
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ========================================
// PWA Install
// ========================================
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBtn').classList.remove('hidden');
});

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
            if (choice.outcome === 'accepted') {
                showToast('تم تثبيت التطبيق بنجاح!', 'success');
            }
            deferredPrompt = null;
            document.getElementById('installBtn').classList.add('hidden');
        });
    }
}

// ========================================
// Surah Loading
// ========================================
async function loadSurahs() {
    try {
        const cached = getData(STORAGE_KEYS.CACHE + '_surahs');
        if (cached && cached.length > 0) {
            allSurahs = cached;
            displaySurahs(allSurahs);
            return;
        }

        const res = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await res.json();
        allSurahs = data.data;
        setData(STORAGE_KEYS.CACHE + '_surahs', allSurahs);
        displaySurahs(allSurahs);
    } catch (e) {
        console.error("API Error", e);
        showToast('فشل تحميل السور', 'error');
        const cached = getData(STORAGE_KEYS.CACHE + '_surahs');
        if (cached) {
            allSurahs = cached;
            displaySurahs(allSurahs);
        }
    }
}

function displaySurahs(surahs) {
    const grid = document.getElementById('surahGrid');
    if (!grid) return;
    grid.innerHTML = surahs.map(s => `
        <div class="surah-card" onclick="openSurah(${s.number}, '${s.name}')">
            <div style="font-size:0.8em; color:var(--accent); font-weight:900;">${s.number}</div>
            <div style="font-weight:900;">${s.name}</div>
            <div style="font-size:0.7em; opacity:0.6;">${s.numberOfAyahs} آية</div>
        </div>
    `).join('');
}

function searchSurah() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    if (!term) {
        displaySurahs(allSurahs);
        return;
    }

    const nameResults = allSurahs.filter(s => s.name.includes(term) || s.number == term);

    if (nameResults.length > 0) {
        displaySurahs(nameResults);
    } else {
        smartSearch(term);
    }
}

async function smartSearch(term) {
    if (term.length < 3) return;

    showToast('جاري البحث في الآيات...', 'info');
    try {
        const res = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(term)}/all/ar`);
        const data = await res.json();

        if (data.data && data.data.matches && data.data.matches.length > 0) {
            showSearchResults(data.data.matches);
        } else {
            showToast('لم يتم العثور على نتائج', 'warning');
            displaySurahs(allSurahs);
        }
    } catch (e) {
        showToast('فشل البحث', 'error');
    }
}

function showSearchResults(matches) {
    const modal = document.getElementById('searchModal');
    const resultsDiv = document.getElementById('searchResults');

    resultsDiv.innerHTML = matches.slice(0, 20).map(m => `
        <div class="search-result-item" onclick="openAyah(${m.surah.number}, ${m.numberInSurah}); closeSearchModal();">
            <div class="result-surah">سورة ${m.surah.name} - الآية ${m.numberInSurah}</div>
            <div class="result-text">${m.text}</div>
        </div>
    `).join('');

    modal.classList.remove('hidden');
}

function closeSearchModal() {
    document.getElementById('searchModal').classList.add('hidden');
}

async function openAyah(surahNum, ayahNum) {
    await openSurah(surahNum, allSurahs.find(s => s.number === surahNum)?.name || '');
    setTimeout(() => {
        const ayahElements = document.querySelectorAll('.ayah-box');
        if (ayahElements[ayahNum - 1]) {
            ayahElements[ayahNum - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
            ayahElements[ayahNum - 1].style.background = 'rgba(255, 183, 3, 0.3)';
            setTimeout(() => {
                ayahElements[ayahNum - 1].style.background = '';
            }, 2000);
        }
    }, 500);
}

// ========================================
// PROFESSIONAL MUSHAF READER
// ========================================
async function openSurah(num, name) {
    currentSurahNum = num;
    switchScreen('reader');
    const content = document.getElementById('quranContent');
    document.getElementById('currentSurahName').innerText = name;
    content.innerHTML = `<div style="padding:50px; opacity:0.6;">جاري فتح المصحف...</div>`;

    updateBookmarkButton();

    try {
        const res = await fetch(`https://api.alquran.cloud/v1/surah/${num}/ar.quran-uthmani`);
        const data = await res.json();
        const ayahs = data.data.ayahs;

        const cache = getData(STORAGE_KEYS.CACHE + '_surah_' + num, {});
        cache.ayahs = ayahs;
        cache.name = name;
        setData(STORAGE_KEYS.CACHE + '_surah_' + num, cache);

        setupAudio(num);
        renderProfessionalMushaf(num, name, ayahs);

        recordRead(Math.ceil(ayahs.length / 10));

    } catch (e) {
        const cache = getData(STORAGE_KEYS.CACHE + '_surah_' + num);
        if (cache && cache.ayahs) {
            renderProfessionalMushaf(num, cache.name || name, cache.ayahs);
            showToast('تم تحميل من الذاكرة المحلية', 'info');
        } else {
            content.innerHTML = "فشل في التحميل. تأكد من الاتصال بالإنترنت.";
        }
    }
}

function renderProfessionalMushaf(num, name, ayahs) {
    const content = document.getElementById('quranContent');
    const style = MUSHAF_STYLES[currentMushafStyle] || MUSHAF_STYLES.uthmani;

    // Apply font and line height
    content.style.fontFamily = style.font;
    content.style.lineHeight = style.lineHeight;
    content.style.fontSize = currentFontSize + '%';

    let html = '';

    // Surah Header - Professional
    html += `
        <div class="surah-header">
            <div class="surah-header-decoration">
                <div class="surah-header-line"></div>
                <div class="surah-header-icon">❁</div>
                <div class="surah-header-line"></div>
            </div>
            <div class="surah-header-name">سورة ${name}</div>
            <div class="surah-header-info">${getSurahInfo(num)}</div>
        </div>
    `;

    // Basmala
    const basmala = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
    if (num !== 1 && num !== 9) {
        html += `<div class="basmala-top">${basmala}</div>`;
    }

    // Ayahs - Professional rendering
    html += `<div class="ayahs-container">`;
    html += ayahs.map((a, index) => {
        let text = a.text;
        // Remove basmala from first ayah if present
        if (index === 0 && num !== 1 && num !== 9) {
            if (text.includes(basmala)) {
                text = text.replace(basmala, "").trim();
            }
        }

        // Check for sajda
        const hasSajda = a.text.includes('۩') || (a.sajda && a.sajda.obligatory);
        const sajdaMarker = hasSajda ? '<span class="sajda-marker">۩</span>' : '';

        return `<span class="ayah-box" onclick="showTafsir(${num}, ${a.numberInSurah})" oncontextmenu="showShareMenu(${num}, ${a.numberInSurah}, '${text.replace(/'/g, "\'")}'); return false;">
            ${text} <span class="ayah-num-frame">﴿${a.numberInSurah}﴾</span>${sajdaMarker}
        </span>`;
    }).join(' ');
    html += `</div>`;

    content.innerHTML = html;

    // Update footer
    updateMushafFooter(num);
}

function getSurahInfo(num) {
    const info = {
        1: 'مكية - 7 آيات',
        2: 'مدنية - 286 آية',
        3: 'مدنية - 200 آية',
        4: 'مدنية - 176 آية',
        5: 'مدنية - 120 آية',
        9: 'مدنية - 129 آية',
        112: 'مكية - 4 آيات',
        113: 'مكية - 5 آيات',
        114: 'مكية - 6 آيات'
    };
    return info[num] || '';
}

function updateMushafFooter(num) {
    // Approximate page and juz
    const pageNum = getSurahPage(num);
    const juzNum = getJuzFromPage(pageNum);
    const hizbNum = Math.ceil(juzNum * 2);

    document.getElementById('pageNumber').innerText = `صفحة ${pageNum}`;
    document.getElementById('juzMarker').innerText = `الجزء ${juzNum}`;
    document.getElementById('hizbMarker').innerText = `الحزب ${hizbNum}`;
}

function getSurahPage(num) {
    // Approximate page mapping
    const pages = {
        1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187,
        10: 208, 11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267, 17: 282,
        18: 293, 19: 305, 20: 312, 21: 322, 22: 332, 23: 342, 24: 350, 25: 359,
        26: 367, 27: 377, 28: 385, 29: 396, 30: 404, 31: 411, 32: 415, 33: 418,
        34: 428, 35: 434, 36: 440, 37: 446, 38: 453, 39: 458, 40: 467, 41: 477,
        42: 483, 43: 489, 44: 496, 45: 499, 46: 502, 47: 507, 48: 511, 49: 515,
        50: 518, 51: 520, 52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537,
        58: 542, 59: 545, 60: 549, 61: 551, 62: 553, 63: 554, 64: 556, 65: 558,
        66: 560, 67: 562, 68: 564, 69: 566, 70: 568, 71: 570, 72: 572, 73: 574,
        74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583, 80: 585, 81: 586,
        82: 587, 83: 589, 84: 590, 85: 591, 86: 591, 87: 592, 88: 592, 89: 593,
        90: 594, 91: 595, 92: 595, 93: 596, 94: 596, 95: 597, 96: 597, 97: 598,
        98: 598, 99: 599, 100: 599, 101: 600, 102: 600, 103: 601, 104: 601,
        105: 601, 106: 602, 107: 602, 108: 602, 109: 603, 110: 603, 111: 604,
        112: 604, 113: 604, 114: 604
    };
    return pages[num] || 1;
}

function getJuzFromPage(page) {
    for (let juz = 30; juz >= 1; juz--) {
        if (page >= JUZ_PAGES[juz]) return juz;
    }
    return 1;
}

function setupAudio(num) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    currentAudio = new Audio(`https://cdn.islamic.network/quran/audio-surah/128/${currentReciter}/${num}.mp3`);
    document.getElementById('playBtn').innerHTML = '<i class="fas fa-play-circle"></i>';

    currentAudio.onended = () => {
        document.getElementById('playBtn').innerHTML = '<i class="fas fa-play-circle"></i>';
        if (autoPlayNext && num < 114) {
            const nextSurah = allSurahs.find(s => s.number === num + 1);
            if (nextSurah) {
                setTimeout(() => openSurah(num + 1, nextSurah.name), 1000);
            }
        }
    };
}

function changeReciter() {
    currentReciter = document.getElementById('reciterSelect').value;
    localStorage.setItem(STORAGE_KEYS.RECITER, currentReciter);
    if (currentSurahNum) {
        setupAudio(currentSurahNum);
        showToast('تم تغيير القارئ', 'success');
    }
}

function changeFontSize(delta) {
    currentFontSize = Math.max(80, Math.min(150, currentFontSize + delta * 10));
    document.getElementById('fontSizeDisplay').innerText = currentFontSize + '%';
    document.getElementById('quranContent').style.fontSize = currentFontSize + '%';
}

function toggleAutoPlay() {
    autoPlayNext = document.getElementById('autoPlayToggle').checked;
    showToast(autoPlayNext ? 'الانتقال التلقائي مفعل' : 'الانتقال التلقائي معطل', 'info');
}

// ========================================
// Audio
// ========================================
function toggleAudio() {
    if (!currentAudio) return;
    const isPaused = currentAudio.paused;
    if (isPaused) {
        currentAudio.play();
        document.getElementById('playBtn').innerHTML = '<i class="fas fa-pause-circle"></i>';
    } else {
        currentAudio.pause();
        document.getElementById('playBtn').innerHTML = '<i class="fas fa-play-circle"></i>';
    }
}

// ========================================
// Tafsir
// ========================================
async function showTafsir(sNum, aNum) {
    const modal = document.getElementById('tafsirModal');
    modal.classList.remove('hidden');
    document.getElementById('tafsirBody').innerText = "جاري التحميل...";

    try {
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${sNum}:${aNum}/ar.jalalayn`);
        const data = await res.json();
        document.getElementById('tafsirBody').innerText = data.data.text;
        document.getElementById('tafsirTitle').innerText = `تفسير الآية ${aNum}`;
    } catch (e) {
        document.getElementById('tafsirBody').innerText = "فشل جلب التفسير";
    }
}

function closeTafsir() {
    document.getElementById('tafsirModal').classList.add('hidden');
}

// ========================================
// Bookmarks
// ========================================
function getBookmarks() {
    return getData(STORAGE_KEYS.BOOKMARKS, []);
}

function toggleBookmark() {
    if (!currentSurahNum) return;

    let bookmarks = getBookmarks();
    const existingIndex = bookmarks.findIndex(b => b.surah === currentSurahNum);

    if (existingIndex >= 0) {
        bookmarks.splice(existingIndex, 1);
        showToast('تم إزالة العلامة المرجعية', 'info');
    } else {
        bookmarks.unshift({
            surah: currentSurahNum,
            name: document.getElementById('currentSurahName').innerText,
            date: new Date().toISOString()
        });
        showToast('تمت إضافة العلامة المرجعية', 'success');
        addXP(5);
    }

    setData(STORAGE_KEYS.BOOKMARKS, bookmarks);
    updateBookmarkButton();
    checkBadges();
}

function updateBookmarkButton() {
    const btn = document.getElementById('bookmarkBtn');
    if (!btn || !currentSurahNum) return;

    const bookmarks = getBookmarks();
    const isBookmarked = bookmarks.some(b => b.surah === currentSurahNum);
    btn.innerHTML = isBookmarked ? '<i class="fas fa-bookmark"></i>' : '<i class="far fa-bookmark"></i>';
}

function showBookmarksModal() {
    const modal = document.getElementById('bookmarksModal');
    const list = document.getElementById('bookmarksList');
    const bookmarks = getBookmarks();

    if (bookmarks.length === 0) {
        list.innerHTML = '<p style="text-align:center; opacity:0.6; padding:20px;">لا توجد علامات مرجعية</p>';
    } else {
        list.innerHTML = bookmarks.map((b, i) => `
            <div class="bookmark-item" onclick="openSurah(${b.surah}, '${b.name}'); closeBookmarksModal();">
                <div class="bookmark-info">
                    <span class="bookmark-surah">${b.name}</span>
                    <span class="bookmark-date">${new Date(b.date).toLocaleDateString('ar-SA')}</span>
                </div>
                <button class="delete-bookmark" onclick="event.stopPropagation(); deleteBookmark(${i})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    modal.classList.remove('hidden');
}

function closeBookmarksModal() {
    document.getElementById('bookmarksModal').classList.add('hidden');
}

function deleteBookmark(index) {
    let bookmarks = getBookmarks();
    bookmarks.splice(index, 1);
    setData(STORAGE_KEYS.BOOKMARKS, bookmarks);
    showBookmarksModal();
    showToast('تم الحذف', 'info');
}

// ========================================
// Share
// ========================================
let shareAyahData = null;

function showShareMenu(surah, ayah, text) {
    shareAyahData = { surah, ayah, text };
    const modal = document.getElementById('shareModal');
    document.getElementById('sharePreview').innerText = text;
    modal.classList.remove('hidden');
}

function closeShareModal() {
    document.getElementById('shareModal').classList.add('hidden');
}

function copyAyahText() {
    if (!shareAyahData) return;
    navigator.clipboard.writeText(shareAyahData.text).then(() => {
        showToast('تم النسخ!', 'success');
    });
}

function shareAsImage() {
    showToast('ميزة الصورة قيد التطوير', 'info');
}

function shareViaWhatsApp() {
    if (!shareAyahData) return;
    const text = encodeURIComponent(shareAyahData.text + '\n\n- من تطبيق رفيق القرآن');
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

// ========================================
// Quiz System
// ========================================
async function startQuiz() {
    const start = document.getElementById('pageStart').value;
    const end = document.getElementById('pageEnd').value;
    const type = document.getElementById('quizType').value;

    if (!start || !end) return alert("يرجى تحديد الصفحات");

    currentQuizType = type;

    document.getElementById('quizArea').classList.remove('hidden');
    document.getElementById('quizAnswer').classList.add('hidden');
    document.getElementById('quizOptions').classList.add('hidden');
    document.getElementById('scrambledWords').classList.add('hidden');
    document.getElementById('xpReward').classList.add('hidden');
    document.getElementById('speedTimer').classList.add('hidden');
    document.getElementById('quizQuestion').innerText = "جاري الاختيار...";

    if (speedTimerInterval) {
        clearInterval(speedTimerInterval);
        speedTimerInterval = null;
    }

    const randomPage = Math.floor(Math.random() * (end - start + 1)) + parseInt(start);

    try {
        const res = await fetch(`https://api.alquran.cloud/v1/page/${randomPage}/ar.quran-uthmani`);
        const data = await res.json();
        const ayahs = data.data.ayahs;
        const randomAyah = ayahs[Math.floor(Math.random() * ayahs.length)];

        document.getElementById('quizLocation').innerText = `سورة ${randomAyah.surah.name} - صفحة ${randomPage}`;

        switch (type) {
            case 'mcq':
                setupMCQ(randomAyah, ayahs);
                break;
            case 'next':
                await setupNextAyah(randomAyah);
                break;
            case 'prev':
                await setupPrevAyah(randomAyah);
                break;
            case 'fullSurah':
                setupFullSurahQuiz(randomAyah, ayahs);
                break;
            case 'tajweed':
                setupTajweedQuiz(randomAyah);
                break;
            case 'review':
                setupReviewQuiz(randomAyah, ayahs);
                break;
            case 'speed':
                setupSpeedQuiz(randomAyah);
                break;
            default:
                setupRandomQuiz(randomAyah);
        }

        const stats = getStats();
        stats.quizzesTaken++;
        saveStats(stats);

    } catch (e) {
        alert("حدث خطأ في الاتصال بالسيرفر");
    }
}

function setupRandomQuiz(ayah) {
    const words = ayah.text.split(' ');
    const cut = Math.min(4, Math.floor(words.length / 2));
    document.getElementById('quizQuestion').innerText = words.slice(0, cut).join(' ') + " ... (أكمل الآية)";
    currentCorrectAnswer = ayah.text;
    document.getElementById('quizAnswer').innerText = ayah.text;
    document.getElementById('revealBtn').classList.remove('hidden');
}

async function setupNextAyah(ayah) {
    document.getElementById('quizQuestion').innerText = `قال تعالى: "${ayah.text}" \n ما هي الآية التالية؟`;
    try {
        const nRes = await fetch(`https://api.alquran.cloud/v1/ayah/${ayah.number + 1}/ar.quran-uthmani`);
        const nData = await nRes.json();
        currentCorrectAnswer = nData.data.text;
        document.getElementById('quizAnswer').innerText = nData.data.text;
        document.getElementById('revealBtn').classList.remove('hidden');
    } catch {
        document.getElementById('quizQuestion').innerText = "لا توجد آية تالية";
    }
}

async function setupPrevAyah(ayah) {
    document.getElementById('quizQuestion').innerText = `قال تعالى: "${ayah.text}" \n ما هي الآية السابقة؟`;
    try {
        const pRes = await fetch(`https://api.alquran.cloud/v1/ayah/${ayah.number - 1}/ar.quran-uthmani`);
        const pData = await pRes.json();
        currentCorrectAnswer = pData.data.text;
        document.getElementById('quizAnswer').innerText = pData.data.text;
        document.getElementById('revealBtn').classList.remove('hidden');
    } catch {
        document.getElementById('quizQuestion').innerText = "لا توجد آية سابقة";
    }
}

function setupMCQ(correctAyah, allAyahs) {
    const words = correctAyah.text.split(' ');
    const cut = Math.floor(words.length / 2);
    const question = words.slice(0, cut).join(' ');
    const answer = words.slice(cut).join(' ');

    currentCorrectAnswer = answer;
    document.getElementById('quizQuestion').innerText = question + " ...";

    let distractors = allAyahs
        .filter(a => a.number !== correctAyah.number)
        .map(a => a.text.split(' ').slice(-5).join(' '))
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

    const options = [...distractors, answer].sort(() => 0.5 - Math.random());

    const grid = document.getElementById('quizOptions');
    grid.classList.remove('hidden');
    grid.innerHTML = options.map(opt =>
        `<button class="option-btn" onclick="checkMCQ(this, '${opt.replace(/'/g, "\\'")}', '${answer.replace(/'/g, "\\'")}')">${opt}</button>`
    ).join('');

    document.getElementById('revealBtn').classList.add('hidden');
}

function setupFullSurahQuiz(ayah, allAyahs) {
    document.getElementById('quizQuestion').innerText = `"${ayah.text}"\n\nمن أي سورة هذه الآية؟`;

    const correctSurah = ayah.surah.name;
    currentCorrectAnswer = correctSurah;

    const otherSurahs = allSurahs
        .filter(s => s.name !== correctSurah)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(s => s.name);

    const options = [...otherSurahs, correctSurah].sort(() => 0.5 - Math.random());

    const grid = document.getElementById('quizOptions');
    grid.classList.remove('hidden');
    grid.innerHTML = options.map(opt =>
        `<button class="option-btn" onclick="checkMCQ(this, '${opt.replace(/'/g, "\\'")}', '${correctSurah.replace(/'/g, "\\'")}')">${opt}</button>`
    ).join('');

    document.getElementById('revealBtn').classList.add('hidden');
}

function setupTajweedQuiz(ayah) {
    const words = ayah.text.split(' ').filter(w => w.length > 2);
    const shuffled = [...words].sort(() => 0.5 - Math.random());

    currentScrambledWords = shuffled;
    currentScrambledSelected = [];
    currentCorrectAnswer = ayah.text;

    document.getElementById('quizQuestion').innerText = "رتب الكلمات التالية لتكوين الآية:";

    const container = document.getElementById('scrambledWords');
    container.classList.remove('hidden');
    container.innerHTML = shuffled.map((word, i) =>
        `<span class="scramble-word" onclick="selectScrambleWord(${i}, this)">${word}</span>`
    ).join('');

    document.getElementById('quizAnswer').innerText = ayah.text;
    document.getElementById('revealBtn').classList.remove('hidden');
}

function selectScrambleWord(index, el) {
    if (el.classList.contains('selected')) {
        el.classList.remove('selected');
        currentScrambledSelected = currentScrambledSelected.filter(i => i !== index);
    } else {
        el.classList.add('selected');
        currentScrambledSelected.push(index);
    }

    const selectedWords = currentScrambledSelected.map(i => currentScrambledWords[i]).join(' ');
    if (selectedWords === currentCorrectAnswer) {
        document.querySelectorAll('.scramble-word').forEach(w => w.classList.add('correct'));
        showToast('أحسنت! ✨', 'success');
        addXP(15);
        quizStreak++;
        quizCorrect++;
        updateQuizStats();
        document.getElementById('xpReward').classList.remove('hidden');
    }
}

function setupReviewQuiz(ayah, allAyahs) {
    const history = getData(STORAGE_KEYS.HISTORY, []);
    const recentSurahs = [...new Set(history.slice(0, 20).map(h => h.surah))];

    if (recentSurahs.length < 2) {
        setupRandomQuiz(ayah);
        return;
    }

    document.getElementById('quizQuestion').innerText = `"${ayah.text}"\n\n(من السور التي قرأتها مؤخراً)`;
    currentCorrectAnswer = ayah.text;
    document.getElementById('quizAnswer').innerText = ayah.text;
    document.getElementById('revealBtn').classList.remove('hidden');
}

function setupSpeedQuiz(ayah) {
    setupRandomQuiz(ayah);
    document.getElementById('speedTimer').classList.remove('hidden');

    let timeLeft = 30;
    document.getElementById('timerDisplay').innerText = timeLeft;

    speedTimerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timerDisplay').innerText = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(speedTimerInterval);
            speedTimerInterval = null;
            revealAnswer();
            showToast('انتهى الوقت!', 'warning');
            quizStreak = 0;
            quizWrong++;
            updateQuizStats();
        }
    }, 1000);
}

function checkMCQ(btn, sel, cor) {
    const isCorrect = sel === cor;

    if (isCorrect) {
        btn.classList.add('correct');
        showToast('أحسنت! ✨', 'success');
        addXP(10);
        quizStreak++;
        quizCorrect++;
        document.getElementById('xpReward').classList.remove('hidden');

        if (currentQuizType === 'speed') {
            const stats = getStats();
            stats.speedQuizzes++;
            saveStats(stats);
        }

        setTimeout(() => startQuiz(), 1500);
    } else {
        btn.classList.add('wrong');
        showToast('حاول مرة أخرى', 'error');
        quizStreak = 0;
        quizWrong++;
    }

    updateQuizStats();
}

function revealAnswer() {
    document.getElementById('quizAnswer').classList.remove('hidden');
    if (speedTimerInterval) {
        clearInterval(speedTimerInterval);
        speedTimerInterval = null;
    }
}

function updateQuizStats() {
    document.getElementById('quizStreak').innerText = quizStreak;
    document.getElementById('quizCorrect').innerText = quizCorrect;
    document.getElementById('quizWrong').innerText = quizWrong;
}

function shareResult() {
    const text = `حصلت على ${quizCorrect} إجابة صحيحة في اختبار رفيق القرآن! 🏆`;
    if (navigator.share) {
        navigator.share({ title: 'رفيق القرآن', text });
    } else {
        navigator.clipboard.writeText(text).then(() => showToast('تم النسخ!', 'success'));
    }
}

// ========================================
// Plan System
// ========================================
function getPlan() {
    return getData(STORAGE_KEYS.PLAN, null);
}

function startPlan(planId) {
    const template = PLAN_TEMPLATES[planId];
    if (!template) return;

    const plan = {
        ...template,
        id: planId,
        startDate: new Date().toISOString(),
        completedDays: [],
        currentDay: 1
    };

    setData(STORAGE_KEYS.PLAN, plan);
    showToast(`تم بدء ${template.name}!`, 'success');
    renderPlanScreen();
    updateDailyWerd();
}

function startCustomPlan() {
    document.getElementById('customPlanModal').classList.remove('hidden');
}

function closeCustomPlanModal() {
    document.getElementById('customPlanModal').classList.add('hidden');
}

function confirmCustomPlan() {
    const pagesPerDay = parseInt(document.getElementById('customPagesPerDay').value);
    const startPage = parseInt(document.getElementById('customStartPage').value);
    const endPage = parseInt(document.getElementById('customEndPage').value);

    if (!pagesPerDay || !startPage || !endPage) {
        showToast('يرجى ملء جميع الحقول', 'warning');
        return;
    }

    const totalPages = endPage - startPage + 1;
    const totalDays = Math.ceil(totalPages / pagesPerDay);

    const plan = {
        name: 'خطة مخصصة',
        pagesPerDay,
        totalDays,
        startPage,
        endPage,
        id: 'custom',
        startDate: new Date().toISOString(),
        completedDays: [],
        currentDay: 1
    };

    setData(STORAGE_KEYS.PLAN, plan);
    closeCustomPlanModal();
    showToast('تم بدء الخطة المخصصة!', 'success');
    renderPlanScreen();
    updateDailyWerd();
}

function renderPlanScreen() {
    const plan = getPlan();
    const activeCard = document.getElementById('activePlanCard');
    const noPlan = document.getElementById('noPlanState');

    if (!plan) {
        activeCard.classList.add('hidden');
        noPlan.classList.remove('hidden');
        return;
    }

    activeCard.classList.remove('hidden');
    noPlan.classList.add('hidden');

    document.getElementById('activePlanName').innerText = plan.name;

    const progress = (plan.completedDays.length / plan.totalDays) * 100;
    document.getElementById('planProgressFill').style.width = progress + '%';
    document.getElementById('planProgressText').innerText = Math.round(progress) + '%';

    const remaining = plan.totalDays - plan.completedDays.length;
    document.getElementById('planDaysLeft').innerText = `متبقي ${remaining} يوم`;
}

function updateDailyWerd() {
    const plan = getPlan();
    const card = document.getElementById('dailyWerdCard');

    if (!plan) {
        card.classList.add('hidden');
        return;
    }

    card.classList.remove('hidden');

    const today = new Date().toDateString();
    const todayCompleted = plan.completedDays.includes(today);

    const startPage = plan.startPage + ((plan.currentDay - 1) * plan.pagesPerDay);
    const endPage = Math.min(startPage + plan.pagesPerDay - 1, plan.endPage);

    document.getElementById('werdText').innerText =
        todayCompleted
            ? '✅ لقد أكملت ورد اليوم! بارك الله فيك'
            : `اقرأ من صفحة ${startPage} إلى صفحة ${endPage}`;

    const progress = (plan.completedDays.length / plan.totalDays) * 100;
    document.getElementById('werdProgress').innerText = Math.round(progress) + '%';
    document.getElementById('werdProgressFill').style.width = progress + '%';

    const btn = card.querySelector('.werd-action-btn');
    btn.style.display = todayCompleted ? 'none' : 'flex';
}

function markWerdComplete() {
    const plan = getPlan();
    if (!plan) return;

    const today = new Date().toDateString();

    if (!plan.completedDays.includes(today)) {
        plan.completedDays.push(today);
        plan.currentDay = Math.min(plan.currentDay + 1, plan.totalDays);
        setData(STORAGE_KEYS.PLAN, plan);

        showToast('تم تسجيل ورد اليوم! 🎉', 'success');
        addXP(20);

        recordRead(plan.pagesPerDay);

        updateDailyWerd();
        renderPlanScreen();
        checkBadges();
    }
}

function goToDailyWerd() {
    const plan = getPlan();
    if (!plan) return;

    const startPage = plan.startPage + ((plan.currentDay - 1) * plan.pagesPerDay);
    showToast(`انتقل إلى صفحة ${startPage}`, 'info');
}

function showPlanCalendar() {
    const plan = getPlan();
    if (!plan) return;

    const modal = document.getElementById('planCalendarModal');
    const grid = document.getElementById('planCalendarGrid');

    const startDate = new Date(plan.startDate);
    const today = new Date();

    let html = '';
    const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    days.forEach(d => {
        html += `<div class="calendar-day-header">${d}</div>`;
    });

    for (let i = 0; i < plan.totalDays; i++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(startDate.getDate() + i);
        const dayStr = dayDate.toDateString();
        const isCompleted = plan.completedDays.includes(dayStr);
        const isToday = dayStr === today.toDateString();
        const isPast = dayDate < today && !isCompleted;

        let classes = 'calendar-day';
        if (isCompleted) classes += ' completed';
        else if (isPast) classes += ' missed';
        if (isToday) classes += ' today';

        html += `<div class="${classes}">${i + 1}${isToday ? '<div class="day-dot"></div>' : ''}</div>`;
    }

    grid.innerHTML = html;
    modal.classList.remove('hidden');
}

function closePlanCalendar() {
    document.getElementById('planCalendarModal').classList.add('hidden');
}

// ========================================
// Stats Screen
// ========================================
function updateStatsPreview() {
    const stats = getStats();
    document.getElementById('streakCount').innerText = stats.streak;
    document.getElementById('xpCount').innerText = stats.xp;
    document.getElementById('badgeCount').innerText = getBadges().length;
}

function renderStatsScreen() {
    const stats = getStats();

    document.getElementById('statStreak').innerText = stats.streak;
    document.getElementById('statXP').innerText = stats.xp;
    document.getElementById('statCompleted').innerText = stats.completedWerds;
    document.getElementById('statTime').innerText = stats.readTime;

    const chartBars = document.querySelectorAll('.chart-bar .bar-fill');
    const maxActivity = Math.max(...stats.weeklyActivity, 1);
    chartBars.forEach((bar, i) => {
        const height = (stats.weeklyActivity[i] / maxActivity) * 100;
        bar.style.height = Math.max(height, 4) + '%';
    });

    const history = getData(STORAGE_KEYS.HISTORY, []);
    const historyDiv = document.getElementById('readingHistory');

    if (history.length === 0) {
        historyDiv.innerHTML = '<p style="text-align:center; opacity:0.6; padding:20px;">لا يوجد سجل قراءة بعد</p>';
    } else {
        historyDiv.innerHTML = history.slice(0, 20).map(h => {
            const date = new Date(h.date);
            return `
                <div class="history-item">
                    <div class="history-info">
                        <span class="history-pages">${h.pages} صفحة</span>
                        <span class="history-date">${date.toLocaleDateString('ar-SA')}</span>
                    </div>
                    <i class="fas fa-check-circle" style="color:var(--success)"></i>
                </div>
            `;
        }).join('');
    }

    renderBadges();
}

// ========================================
// Data Export/Import
// ========================================
function exportData() {
    const data = {
        plan: getPlan(),
        stats: getStats(),
        badges: getBadges(),
        bookmarks: getBookmarks(),
        history: getData(STORAGE_KEYS.HISTORY, []),
        settings: getData(STORAGE_KEYS.SETTINGS, {}),
        reviews: getReviews(),
        theme: localStorage.getItem(STORAGE_KEYS.THEME),
        colorTheme: localStorage.getItem(STORAGE_KEYS.COLOR_THEME),
        mushafStyle: localStorage.getItem(STORAGE_KEYS.MUSHAF_STYLE),
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quran-companion-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('تم تصدير البيانات!', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                if (data.plan) setData(STORAGE_KEYS.PLAN, data.plan);
                if (data.stats) setData(STORAGE_KEYS.STATS, data.stats);
                if (data.badges) setData(STORAGE_KEYS.BADGES, data.badges);
                if (data.bookmarks) setData(STORAGE_KEYS.BOOKMARKS, data.bookmarks);
                if (data.history) setData(STORAGE_KEYS.HISTORY, data.history);
                if (data.settings) setData(STORAGE_KEYS.SETTINGS, data.settings);
                if (data.reviews) setData(REVIEW_STORAGE_KEY, data.reviews);
                if (data.theme) localStorage.setItem(STORAGE_KEYS.THEME, data.theme);
                if (data.colorTheme) localStorage.setItem(STORAGE_KEYS.COLOR_THEME, data.colorTheme);
                if (data.mushafStyle) localStorage.setItem(STORAGE_KEYS.MUSHAF_STYLE, data.mushafStyle);

                showToast('تم استيراد البيانات بنجاح!', 'success');
                location.reload();
            } catch {
                showToast('ملف غير صالح', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function resetAllData() {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.')) {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        localStorage.removeItem(REVIEW_STORAGE_KEY);
        localStorage.removeItem(REVIEW_PROMPT_KEY);
        localStorage.removeItem(REVIEW_PROMPT_COUNT_KEY);
        showToast('تم مسح جميع البيانات', 'warning');
        setTimeout(() => location.reload(), 1000);
    }
}

// ========================================
// Navigation
// ========================================
function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
    });

    const target = document.getElementById(id + 'Screen');
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.getElementById('nav' + id.charAt(0).toUpperCase() + id.slice(1));
    if (navItem) navItem.classList.add('active');

    const titles = {
        'home': 'المصحف الشريف',
        'quiz': 'اختبار الحفظ',
        'reader': 'قراءة السورة',
        'plan': 'خطة الحفظ',
        'stats': 'إحصائياتي',
        'settings': 'الإعدادات'
    };
    document.getElementById('viewTitle').innerText = titles[id] || 'رفيق القرآن';

    if (id === 'plan') renderPlanScreen();
    if (id === 'stats') renderStatsScreen();
    if (id === 'settings') loadSettings();
}

// ========================================
// Custom Plan Estimate
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    const inputs = ['customPagesPerDay', 'customStartPage', 'customEndPage'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateCustomPlanEstimate);
        }
    });
});

function updateCustomPlanEstimate() {
    const pagesPerDay = parseInt(document.getElementById('customPagesPerDay').value) || 1;
    const startPage = parseInt(document.getElementById('customStartPage').value) || 1;
    const endPage = parseInt(document.getElementById('customEndPage').value) || 604;

    const totalPages = Math.max(0, endPage - startPage + 1);
    const days = Math.ceil(totalPages / pagesPerDay);

    document.getElementById('customPlanEstimate').innerText = `المدة المتوقعة: ${days} يوم`;
}

// ========================================
// Review System
// ========================================
const REVIEW_STORAGE_KEY = 'quran_reviews';
const REVIEW_PROMPT_KEY = 'quran_review_prompt_shown';
const REVIEW_PROMPT_COUNT_KEY = 'quran_app_opens';

let currentReviewRating = 0;
let selectedReviewTags = [];

const RATING_LABELS = {
    0: 'اختر تقييمك',
    1: 'سيء جداً 😞',
    2: 'سيء 😕',
    3: 'مقبول 🙂',
    4: 'جيد جداً 😊',
    5: 'ممتاز! 🤩'
};

const TAG_NAMES = {
    'design': 'التصميم',
    'ease': 'سهولة الاستخدام',
    'quizzes': 'الاختبارات',
    'plan': 'خطط الحفظ',
    'audio': 'التلاوات',
    'offline': 'العمل بدون نت'
};

function getReviews() {
    return getData(REVIEW_STORAGE_KEY, []);
}

function saveReview(review) {
    const reviews = getReviews();
    reviews.unshift(review);
    setData(REVIEW_STORAGE_KEY, reviews);

    localStorage.setItem(REVIEW_PROMPT_KEY, 'true');

    updateAppRating();
    renderReviewsList();
}

function updateAppRating() {
    const reviews = getReviews();
    if (reviews.length === 0) {
        document.getElementById('appRatingValue').innerText = '0.0';
        document.getElementById('appRatingCount').innerText = '(0 تقييم)';
        updateStarsDisplay(0);
        return;
    }

    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    const average = (total / reviews.length).toFixed(1);

    document.getElementById('appRatingValue').innerText = average;
    document.getElementById('appRatingCount').innerText = `(${reviews.length} ${getReviewWord(reviews.length)})`;
    updateStarsDisplay(parseFloat(average));
}

function getReviewWord(count) {
    if (count === 1) return 'تقييم';
    if (count === 2) return 'تقييمان';
    if (count >= 3 && count <= 10) return 'تقييمات';
    return 'تقييم';
}

function updateStarsDisplay(rating) {
    const starsContainer = document.getElementById('appRatingStars');
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.round(rating)) {
            html += '<i class="fas fa-star"></i>';
        } else if (i - 0.5 <= rating) {
            html += '<i class="fas fa-star-half-alt"></i>';
        } else {
            html += '<i class="far fa-star"></i>';
        }
    }
    starsContainer.innerHTML = html;
}

function openReviewModal() {
    const modal = document.getElementById('reviewModal');
    modal.classList.remove('hidden');

    currentReviewRating = 0;
    selectedReviewTags = [];
    document.getElementById('reviewerName').value = '';
    document.getElementById('reviewText').value = '';
    updateStarInputDisplay(0);
    document.querySelectorAll('.review-tag').forEach(t => t.classList.remove('selected'));

    renderReviewsList();
    setupStarHover();
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.add('hidden');
}

function setupStarHover() {
    const stars = document.querySelectorAll('#starRatingInput i');

    stars.forEach(star => {
        star.addEventListener('mouseenter', function () {
            const rating = parseInt(this.dataset.rating);
            updateStarInputDisplay(rating, true);
        });

        star.addEventListener('mouseleave', function () {
            updateStarInputDisplay(currentReviewRating);
        });

        star.addEventListener('click', function () {
            currentReviewRating = parseInt(this.dataset.rating);
            updateStarInputDisplay(currentReviewRating);

            if (navigator.vibrate) navigator.vibrate(20);

            this.style.transform = 'scale(1.4)';
            setTimeout(() => { this.style.transform = ''; }, 200);
        });
    });
}

function updateStarInputDisplay(rating, isHover = false) {
    const stars = document.querySelectorAll('#starRatingInput i');
    const label = document.getElementById('ratingLabel');

    stars.forEach((star, index) => {
        if (index < rating) {
            star.className = 'fas fa-star';
            if (isHover) star.classList.add('hovered');
            else star.classList.add('selected');
        } else {
            star.className = 'far fa-star';
            star.classList.remove('hovered', 'selected');
        }
    });

    label.innerText = RATING_LABELS[rating] || RATING_LABELS[0];
    label.style.color = rating > 0 ? 'var(--primary)' : '';
}

function toggleReviewTag(el) {
    const tag = el.dataset.tag;

    if (selectedReviewTags.includes(tag)) {
        selectedReviewTags = selectedReviewTags.filter(t => t !== tag);
        el.classList.remove('selected');
    } else {
        selectedReviewTags.push(tag);
        el.classList.add('selected');
    }

    if (navigator.vibrate) navigator.vibrate(10);
}

function submitReview() {
    if (currentReviewRating === 0) {
        showToast('يرجى اختيار التقييم أولاً', 'warning');
        return;
    }

    const name = document.getElementById('reviewerName').value.trim() || 'مستخدم مجهول';
    const text = document.getElementById('reviewText').value.trim();

    if (!text) {
        showToast('يرجى كتابة تعليقك', 'warning');
        return;
    }

    const review = {
        id: Date.now(),
        name: name,
        rating: currentReviewRating,
        text: text,
        tags: [...selectedReviewTags],
        date: new Date().toISOString(),
        likes: 0
    };

    saveReview(review);

    showReviewSuccess();

    addXP(5);

    currentReviewRating = 0;
    selectedReviewTags = [];
    document.getElementById('reviewerName').value = '';
    document.getElementById('reviewText').value = '';
    updateStarInputDisplay(0);
    document.querySelectorAll('.review-tag').forEach(t => t.classList.remove('selected'));
}

function showReviewSuccess() {
    const successDiv = document.getElementById('reviewSuccess');
    successDiv.classList.remove('hidden');

    if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);

    setTimeout(() => {
        successDiv.classList.add('hidden');
    }, 2000);
}

function renderReviewsList() {
    const container = document.getElementById('reviewsList');
    const reviews = getReviews();

    if (reviews.length === 0) {
        container.innerHTML = '<p class="no-reviews">لا توجد تقييمات بعد. كن أول من يقيّم!</p>';
        return;
    }

    container.innerHTML = reviews.map(review => {
        const date = new Date(review.date);
        const dateStr = date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const initials = review.name.split(' ').map(n => n[0]).join('').substring(0, 2);

        const starsHtml = Array(5).fill(0).map((_, i) =>
            i < review.rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>'
        ).join('');

        const tagsHtml = (review.tags || []).map(tag =>
            `<span class="review-card-tag">${TAG_NAMES[tag] || tag}</span>`
        ).join('');

        return `
            <div class="review-card">
                <div class="review-card-header">
                    <div class="review-card-user">
                        <div class="review-avatar">${initials}</div>
                        <div class="review-user-info">
                            <span class="review-user-name">${review.name}</span>
                            <span class="review-date">${dateStr}</span>
                        </div>
                    </div>
                    <div class="review-card-stars">${starsHtml}</div>
                </div>
                <p class="review-card-text">${review.text}</p>
                ${tagsHtml ? `<div class="review-card-tags">${tagsHtml}</div>` : ''}
            </div>
        `;
    }).join('');
}

function checkReviewPrompt() {
    if (localStorage.getItem(REVIEW_PROMPT_KEY) === 'true') return;

    let opens = parseInt(localStorage.getItem(REVIEW_PROMPT_COUNT_KEY) || '0');
    opens++;
    localStorage.setItem(REVIEW_PROMPT_COUNT_KEY, opens);

    if (opens === 5 || opens === 15 || opens === 30) {
        setTimeout(showReviewPrompt, 2000);
    }
}

function showReviewPrompt() {
    const lastPrompt = localStorage.getItem('quran_last_prompt_date');
    const today = new Date().toDateString();
    if (lastPrompt === today) return;

    localStorage.setItem('quran_last_prompt_date', today);

    const prompt = document.createElement('div');
    prompt.className = 'review-prompt';
    prompt.id = 'reviewPrompt';
    prompt.innerHTML = `
        <div class="review-prompt-header">
            <h4><i class="fas fa-heart"></i> هل أعجبك رفيق القرآن؟</h4>
            <button class="review-prompt-close" onclick="dismissReviewPrompt()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <p>شاركنا رأيك في التطبيق لنساعد في تحسينه وإضافة مميزات جديدة</p>
        <div class="review-prompt-actions">
            <button class="review-prompt-btn primary" onclick="openReviewFromPrompt()">
                <i class="fas fa-star"></i> قيّم الآن
            </button>
            <button class="review-prompt-btn secondary" onclick="dismissReviewPrompt()">
                لاحقاً
            </button>
        </div>
    `;

    document.body.appendChild(prompt);
}

function dismissReviewPrompt() {
    const prompt = document.getElementById('reviewPrompt');
    if (prompt) {
        prompt.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => prompt.remove(), 300);
    }
}

function openReviewFromPrompt() {
    dismissReviewPrompt();
    openReviewModal();
}

// ========================================
// Initialization
// ========================================
window.onload = () => {
    setTimeout(() => {
        document.getElementById('splashScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
    }, 3500);

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.log("SW registration failed", err));
    }

    // Load theme first
    loadTheme();
    loadMushafStyle();

    if (localStorage.getItem(STORAGE_KEYS.THEME) === 'dark') toggleDarkMode();

    const savedFontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
    if (savedFontSize) currentFontSize = parseInt(savedFontSize);

    const savedReciter = localStorage.getItem(STORAGE_KEYS.RECITER);
    if (savedReciter) currentReciter = savedReciter;

    loadSurahs();
    updateStatsPreview();
    updateDailyWerd();
    renderPlanScreen();
    updateOnlineStatus();
    checkDailyReminder();
    checkReviewPrompt();

    document.querySelectorAll('button, .surah-card, .plan-card, .nav-item').forEach(el => {
        el.addEventListener('click', () => {
            if (navigator.vibrate) navigator.vibrate(15);
        });
    });
};

function checkDailyReminder() {
    const settings = getData(STORAGE_KEYS.SETTINGS, { dailyReminder: false, reminderTime: '05:00' });
    if (!settings.dailyReminder) return;

    const now = new Date();
    const [hours, minutes] = settings.reminderTime.split(':');
    const reminderTime = new Date();
    reminderTime.setHours(parseInt(hours), parseInt(minutes), 0);

    if (now.getHours() === parseInt(hours) && now.getMinutes() === parseInt(minutes)) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('رفيق القرآن', {
                body: 'حان وقت وردك اليومي! 📖',
                icon: 'https://cdn-icons-png.flaticon.com/512/2855/2855140.png'
            });
        }
    }
}