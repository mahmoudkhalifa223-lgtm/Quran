/* ========================================
   رفيق الحفظ - App Logic v5.0 (Full Features & Self-Assessment)
   ======================================== */

// Global State
let allSurahs = [];
let quizStreak = 0;
let quizCorrect = 0;
let quizWrong = 0;
let speedTimerInterval = null;
let currentQuizType = '';
let currentCorrectAnswer = '';
let currentScrambledWords = [];
let currentScrambledSelected = [];

// Data Storage Keys
const STORAGE_KEYS = {
    THEME: 'quran_theme',
    PLAN: 'quran_plan',
    STATS: 'quran_stats',
    BADGES: 'quran_badges',
    HISTORY: 'quran_history',
    SETTINGS: 'quran_settings',
    CACHE: 'quran_cache'
};

// Themes Mapping
const THEMES = {
    PLAN: 'theme-tajweed',
    QUIZ: 'theme-midnight',
    STATS: 'theme-classic',
    SETTINGS: 'theme-classic'
};

// Badge Definitions
const BADGES = [
    { id: 'first_werd', name: 'بداية الطريق', icon: 'fa-seedling', desc: 'أكمل أول ورد', condition: (s) => s.completedWerds >= 1 },
    { id: 'week_streak', name: 'أسبوع متتالي', icon: 'fa-fire', desc: '7 أيام متتالية', condition: (s) => s.streak >= 7 },
    { id: 'month_streak', name: 'شهر متتالي', icon: 'fa-fire-alt', desc: '30 يوم متتالي', condition: (s) => s.streak >= 30 },
    { id: 'first_quiz', name: 'أول اختبار', icon: 'fa-graduation-cap', desc: 'أكمل أول اختبار', condition: (s) => s.quizzesTaken >= 1 },
    { id: 'quiz_master', name: 'سيد الاختبارات', icon: 'fa-trophy', desc: '50 إجابة صحيحة', condition: (s) => s.correctAnswers >= 50 },
    { id: 'hafiz_1', name: 'حافظ الجزء الأول', icon: 'fa-book-open', desc: 'حفظ الجزء الأول', condition: (s) => s.pagesRead >= 20 },
    { id: 'hafiz_10', name: 'حافظ العشرة', icon: 'fa-star', desc: 'حفظ 10 أجزاء', condition: (s) => s.pagesRead >= 200 },
    { id: 'hafiz_30', name: 'خاتم القرآن', icon: 'fa-crown', desc: 'ختم الحفظ كاملاً', condition: (s) => s.pagesRead >= 604 },
    { id: 'speed_demon', name: 'سريع البديهة', icon: 'fa-bolt', desc: 'أجب بسرعة في 10 اختبارات', condition: (s) => s.speedQuizzes >= 10 }
];

// Plan Templates
const PLAN_TEMPLATES = {
    khatma30: { name: 'مراجعة مكثفة (30 يوم)', pagesPerDay: 20, totalDays: 30, startPage: 1, endPage: 604, type: 'intense' },
    khatma60: { name: 'حفظ متوسط (60 يوم)', pagesPerDay: 10, totalDays: 60, startPage: 1, endPage: 604, type: 'moderate' },
    khatma365: { name: 'حفظ ميسر (سنة)', pagesPerDay: 2, totalDays: 302, startPage: 1, endPage: 604, type: 'light' }
};

// ========================================
// Utilities & Themes
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

function getData(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch { return defaultValue; }
}

function setData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function applyTheme(themeName) {
    document.body.classList.remove('theme-classic', 'theme-midnight', 'theme-tajweed', 'dark-theme');
    document.body.classList.add(themeName);
    localStorage.setItem(STORAGE_KEYS.THEME, themeName);
}

function toggleDarkMode() {
    const isDark = document.body.classList.contains('theme-midnight');
    if (isDark) {
        applyTheme('theme-classic');
    } else {
        applyTheme('theme-midnight');
    }
}

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

    const themeKey = id.toUpperCase();
    if (THEMES[themeKey]) applyTheme(THEMES[themeKey]);

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.getElementById('nav' + id.charAt(0).toUpperCase() + id.slice(1));
    if (navItem) navItem.classList.add('active');

    const titles = {
        'plan': 'خطة الحفظ',
        'quiz': 'الاختبارات',
        'stats': 'الإحصائيات',
        'settings': 'الإعدادات'
    };
    document.getElementById('viewTitle').innerText = titles[id] || 'رفيق الحفظ';

    if (id === 'plan') renderPlanScreen();
    if (id === 'stats') renderStatsScreen();
    if (id === 'settings') loadSettings();
}

// ========================================
// Stats & Data
// ========================================
function getStats() {
    return getData(STORAGE_KEYS.STATS, {
        streak: 0,
        xp: 0,
        completedWerds: 0,
        pagesRead: 0,
        quizzesTaken: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        speedQuizzes: 0,
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

    const dayIndex = new Date().getDay();
    stats.weeklyActivity[dayIndex] += pages;

    saveStats(stats);

    const history = getData(STORAGE_KEYS.HISTORY, []);
    history.unshift({ date: new Date().toISOString(), pages });
    if (history.length > 100) history.pop();
    setData(STORAGE_KEYS.HISTORY, history);

    checkBadges();
}

function updateStatsPreview() {
    const stats = getStats();
    document.getElementById('streakCount').innerText = stats.streak;
    document.getElementById('xpCount').innerText = stats.xp;
    document.getElementById('badgeCount').innerText = getBadges().length;
}

// ========================================
// Badges
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
// Load Data for Quizzes
// ========================================
async function loadSurahs() {
    try {
        const cached = getData(STORAGE_KEYS.CACHE + '_surahs');
        if (cached && cached.length > 0) {
            allSurahs = cached;
            return;
        }

        const res = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await res.json();
        allSurahs = data.data;
        setData(STORAGE_KEYS.CACHE + '_surahs', allSurahs);
    } catch (e) {
        console.error("API Error", e);
    }
}

// ========================================
// Quiz System
// ========================================
async function startQuiz() {
    const start = document.getElementById('pageStart').value || 1;
    const end = document.getElementById('pageEnd').value || 604;
    const type = document.getElementById('quizType').value;

    if (parseInt(start) > parseInt(end)) {
        return showToast("تأكد من صحة الصفحات المحددة", "warning");
    }

    currentQuizType = type;

    document.getElementById('quizArea').classList.remove('hidden');
    document.getElementById('quizAnswer').classList.add('hidden');
    document.getElementById('quizOptions').classList.add('hidden');
    document.getElementById('scrambledWords').classList.add('hidden');
    document.getElementById('xpReward').classList.add('hidden');
    document.getElementById('speedTimer').classList.add('hidden');
    document.getElementById('revealBtn').classList.remove('hidden');

    // إخفاء زراير التقييم الذاتي عند بداية أي سؤال جديد
    const selfAssessment = document.getElementById('selfAssessment');
    if (selfAssessment) selfAssessment.classList.add('hidden');

    document.getElementById('quizQuestion').innerText = "جاري اختيار السؤال...";

    if (speedTimerInterval) {
        clearInterval(speedTimerInterval);
        speedTimerInterval = null;
    }

    const randomPage = Math.floor(Math.random() * (parseInt(end) - parseInt(start) + 1)) + parseInt(start);

    try {
        const res = await fetch(`https://api.alquran.cloud/v1/page/${randomPage}/ar.quran-uthmani`);
        const data = await res.json();
        const ayahs = data.data.ayahs;
        const randomAyah = ayahs[Math.floor(Math.random() * ayahs.length)];

        // حل مشكلة تكرار كلمة "سورة"
        if (type === 'fullSurah') {
            document.getElementById('quizLocation').innerText = `تحديد السورة - صفحة رقم ${randomPage} (الجزء ${randomAyah.juz})`;
        } else {
            document.getElementById('quizLocation').innerText = `${randomAyah.surah.name} - صفحة ${randomPage}`;
        }

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
                setupFullSurahQuiz(randomAyah);
                break;
            case 'tajweed':
                setupTajweedQuiz(randomAyah);
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
        showToast("حدث خطأ في الاتصال بالسيرفر", "error");
    }
}

function setupRandomQuiz(ayah) {
    const words = ayah.text.split(' ');
    const cut = Math.min(4, Math.floor(words.length / 2));
    document.getElementById('quizQuestion').innerText = words.slice(0, cut).join(' ') + " ... (أكمل الآية)";
    currentCorrectAnswer = ayah.text;
    document.getElementById('quizAnswer').innerText = ayah.text;
}

async function setupNextAyah(ayah) {
    document.getElementById('quizQuestion').innerText = `قال تعالى: "${ayah.text}" \n ما هي الآية التالية؟`;
    try {
        const nRes = await fetch(`https://api.alquran.cloud/v1/ayah/${ayah.number + 1}/ar.quran-uthmani`);
        const nData = await nRes.json();
        currentCorrectAnswer = nData.data.text;
        document.getElementById('quizAnswer').innerText = nData.data.text;
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

function setupFullSurahQuiz(ayah) {
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

        const stats = getStats();
        stats.correctAnswers++;
        saveStats(stats);

        addXP(15);
        quizStreak++;
        quizCorrect++;
        updateQuizStats();
        document.getElementById('xpReward').classList.remove('hidden');
    }
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

            const stats = getStats();
            stats.wrongAnswers++;
            saveStats(stats);

            quizStreak = 0;
            quizWrong++;
            updateQuizStats();
        }
    }, 1000);
}

function checkMCQ(btn, sel, cor) {
    const isCorrect = sel === cor;
    const stats = getStats();

    if (isCorrect) {
        btn.classList.add('correct');
        showToast('أحسنت! ✨', 'success');

        quizStreak++;
        quizCorrect++;
        stats.correctAnswers++;

        document.getElementById('xpReward').classList.remove('hidden');

        if (currentQuizType === 'speed') {
            stats.speedQuizzes++;
        }

        saveStats(stats);
        addXP(10);

        setTimeout(() => startQuiz(), 1500);
    } else {
        btn.classList.add('wrong');
        showToast('حاول مرة أخرى', 'error');

        quizStreak = 0;
        quizWrong++;
        stats.wrongAnswers++;

        saveStats(stats);
    }

    updateQuizStats();
}

function revealAnswer() {
    document.getElementById('quizAnswer').classList.remove('hidden');
    document.getElementById('revealBtn').classList.add('hidden');

    // إظهار زراير التقييم الذاتي لأسئلة التسميع فقط
    if (['random', 'next', 'prev', 'speed'].includes(currentQuizType)) {
        const selfAssessment = document.getElementById('selfAssessment');
        if (selfAssessment) selfAssessment.classList.remove('hidden');
    }

    if (speedTimerInterval) {
        clearInterval(speedTimerInterval);
        speedTimerInterval = null;
    }
}

function markSelfAssessment(isCorrect) {
    const stats = getStats();
    const selfAssessment = document.getElementById('selfAssessment');
    if (selfAssessment) selfAssessment.classList.add('hidden');

    if (isCorrect) {
        showToast('أحسنت! استمر ✨', 'success');

        quizStreak++;
        quizCorrect++;
        stats.correctAnswers++;

        document.getElementById('xpReward').classList.remove('hidden');

        if (currentQuizType === 'speed') {
            stats.speedQuizzes++;
        }

        saveStats(stats);
        addXP(10);

        setTimeout(() => startQuiz(), 1500);
    } else {
        showToast('لا بأس، التدريب يجعلك أفضل', 'info');

        quizStreak = 0;
        quizWrong++;
        stats.wrongAnswers++;

        saveStats(stats);
    }

    updateQuizStats();
}

function updateQuizStats() {
    document.getElementById('quizStreak').innerText = quizStreak;
    document.getElementById('quizCorrect').innerText = quizCorrect;
    document.getElementById('quizWrong').innerText = quizWrong;
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
    showToast(`تم بدء خطة ${template.name}!`, 'success');
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
    showToast('تم بدء الخطة المخصصة بنجاح!', 'success');
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
            ? '✅ أتممت حفظ الورد اليوم! بارك الله فيك'
            : `ورد اليوم: من صفحة ${startPage} إلى صفحة ${endPage}`;

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

        showToast('تم تسجيل إنجاز الورد! 🎉', 'success');
        addXP(20);
        recordRead(plan.pagesPerDay);
        updateDailyWerd();
        renderPlanScreen();
    }
}

function goToDailyWerd() {
    const plan = getPlan();
    if (!plan) return;
    const startPage = plan.startPage + ((plan.currentDay - 1) * plan.pagesPerDay);
    const endPage = Math.min(startPage + plan.pagesPerDay - 1, plan.endPage);
    showToast(`افتح مصحفك الورقي واقرأ من صفحة ${startPage} إلى ${endPage}`, 'info', 6000);
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
        const isPast = dayDate < today && !isCompleted && !isToday;

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

document.addEventListener('DOMContentLoaded', () => {
    const inputs = ['customPagesPerDay', 'customStartPage', 'customEndPage'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateCustomPlanEstimate);
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
// Stats Screen & Settings
// ========================================
function renderStatsScreen() {
    const stats = getStats();
    document.getElementById('statStreak').innerText = stats.streak;
    document.getElementById('statXP').innerText = stats.xp;
    document.getElementById('statCompleted').innerText = stats.completedWerds;

    const chartBars = document.querySelectorAll('.chart-bar .bar-fill');
    const maxActivity = Math.max(...stats.weeklyActivity, 1);
    chartBars.forEach((bar, i) => {
        const height = (stats.weeklyActivity[i] / maxActivity) * 100;
        bar.style.height = Math.max(height, 4) + '%';
    });

    renderBadges();
}

function loadSettings() {
    const settings = getData(STORAGE_KEYS.SETTINGS, { dailyReminder: false, reminderTime: '05:00' });
    const reminderToggle = document.getElementById('dailyReminderToggle');
    const reminderTime = document.getElementById('reminderTime');

    if (reminderToggle) reminderToggle.checked = settings.dailyReminder;
    if (reminderTime) reminderTime.value = settings.reminderTime;
}

function saveSettings() {
    const settings = {
        dailyReminder: document.getElementById('dailyReminderToggle')?.checked || false,
        reminderTime: document.getElementById('reminderTime')?.value || '05:00'
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

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ========================================
// Data Management
// ========================================
function exportData() {
    const data = {
        plan: getPlan(),
        stats: getStats(),
        badges: getBadges(),
        history: getData(STORAGE_KEYS.HISTORY, []),
        settings: getData(STORAGE_KEYS.SETTINGS, {}),
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hifz-companion-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير البيانات بنجاح!', 'success');
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
                if (data.history) setData(STORAGE_KEYS.HISTORY, data.history);
                if (data.settings) setData(STORAGE_KEYS.SETTINGS, data.settings);
                showToast('تم استيراد البيانات بنجاح!', 'success');
                setTimeout(() => location.reload(), 1000);
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
        showToast('تم مسح جميع البيانات', 'warning');
        setTimeout(() => location.reload(), 1000);
    }
}

// ========================================
// Initialization
// ========================================
window.onload = () => {
    setTimeout(() => {
        document.getElementById('splashScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
    }, 3500);

    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme) applyTheme(savedTheme);

    loadSurahs();
    updateStatsPreview();
    updateDailyWerd();
    renderPlanScreen();

    switchScreen('plan');

    checkDailyReminder();

    document.querySelectorAll('button, .plan-card, .nav-item').forEach(el => {
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
    if (now.getHours() === parseInt(hours) && now.getMinutes() === parseInt(minutes)) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('رفيق الحفظ', {
                body: 'حان وقت ورد الحفظ اليومي! 📖',
                icon: 'https://cdn-icons-png.flaticon.com/512/2855/2855140.png'
            });
        }
    }
}

// Offline PWA Logic
function updateOnlineStatus() {
    const indicator = document.getElementById('offlineIndicator');
    if (!navigator.onLine) {
        indicator.classList.remove('hidden');
        showToast('أنت في وضع عدم الاتصال', 'warning');
    } else {
        indicator.classList.add('hidden');
    }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

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