let currentAudio = null;
let allSurahs = [];

// 1. نظام الدارك مود
function toggleDarkMode() {
    const body = document.body;
    const icon = document.querySelector('#themeToggle i');
    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('quran_theme', isDark ? 'dark' : 'light');
}

// 2. تحميل قائمة السور
async function loadSurahs() {
    try {
        const res = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await res.json();
        allSurahs = data.data;
        displaySurahs(allSurahs);
    } catch (e) { console.error("API Error"); }
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
    displaySurahs(allSurahs.filter(s => s.name.includes(term) || s.number == term));
}

// 3. فتح السورة ومعالجة البسملة المكررة
async function openSurah(num, name) {
    switchScreen('reader');
    const content = document.getElementById('quranContent');
    document.getElementById('currentSurahName').innerText = name;
    content.innerHTML = `<div style="padding:50px; opacity:0.6;">جاري فتح المصحف...</div>`;

    try {
        const res = await fetch(`https://api.alquran.cloud/v1/surah/${num}/ar.quran-uthmani`);
        const data = await res.json();
        const ayahs = data.data.ayahs;

        if (currentAudio) currentAudio.pause();
        currentAudio = new Audio(`https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${num}.mp3`);
        document.getElementById('playBtn').innerHTML = '<i class="fas fa-play-circle"></i>';

        let html = "";
        const basmala = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

        // العنوان الذهبي المستقل
        if (num !== 1 && num !== 9) {
            html += `<div class="basmala-top">${basmala}</div>`;
        }

        html += ayahs.map((a, index) => {
            let text = a.text;
            // إزالة البسملة المدمجة من الآية الأولى تقنياً
            if (index === 0 && num !== 1 && num !== 9) {
                if (text.includes(basmala)) {
                    text = text.replace(basmala, "").trim();
                }
            }
            return `<span class="ayah-box" onclick="showTafsir(${num}, ${a.numberInSurah})">
                ${text} <span class="ayah-num-frame">﴿${a.numberInSurah}﴾</span>
            </span>`;
        }).join(' ');

        content.innerHTML = html;
    } catch (e) { content.innerHTML = "فشل في التحميل"; }
}

// 4. التفسير
async function showTafsir(sNum, aNum) {
    const modal = document.getElementById('tafsirModal');
    modal.classList.remove('hidden');
    document.getElementById('tafsirBody').innerText = "جاري التحميل...";
    try {
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${sNum}:${aNum}/ar.jalalayn`);
        const data = await res.json();
        document.getElementById('tafsirBody').innerText = data.data.text;
        document.getElementById('tafsirTitle').innerText = `تفسير الآية ${aNum}`;
    } catch (e) { document.getElementById('tafsirBody').innerText = "فشل جلب التفسير"; }
}

function closeTafsir() { document.getElementById('tafsirModal').classList.add('hidden'); }

// 5. الصوت
function toggleAudio() {
    if (!currentAudio) return;
    const isPaused = currentAudio.paused;
    isPaused ? currentAudio.play() : currentAudio.pause();
    document.getElementById('playBtn').innerHTML = `<i class="fas fa-${isPaused ? 'pause' : 'play'}-circle"></i>`;
}

// 6. نظام الاختبارات
async function startQuiz() {
    const start = document.getElementById('pageStart').value;
    const end = document.getElementById('pageEnd').value;
    const type = document.getElementById('quizType').value;
    if (!start || !end) return alert("يرجى تحديد الصفحات");

    document.getElementById('quizArea').classList.remove('hidden');
    document.getElementById('quizAnswer').classList.add('hidden');
    document.getElementById('quizOptions').classList.add('hidden');
    document.getElementById('quizQuestion').innerText = "جاري الاختيار...";

    const randomPage = Math.floor(Math.random() * (end - start + 1)) + parseInt(start);
    try {
        const res = await fetch(`https://api.alquran.cloud/v1/page/${randomPage}/ar.quran-uthmani`);
        const data = await res.json();
        const ayahs = data.data.ayahs;
        const randomAyah = ayahs[Math.floor(Math.random() * ayahs.length)];

        document.getElementById('quizLocation').innerText = `سورة ${randomAyah.surah.name} - صفحة ${randomPage}`;

        if (type === "mcq") {
            setupMCQ(randomAyah, ayahs);
        } else if (type === "next") {
            document.getElementById('quizQuestion').innerText = `قال تعالى: "${randomAyah.text}" \n ما هي الآية التالية؟`;
            const nRes = await fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah.number + 1}/ar.quran-uthmani`);
            const nData = await nRes.json();
            document.getElementById('quizAnswer').innerText = nData.data.text;
        } else if (type === "prev") {
            document.getElementById('quizQuestion').innerText = `قال تعالى: "${randomAyah.text}" \n ما هي الآية السابقة؟`;
            const pRes = await fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah.number - 1}/ar.quran-uthmani`);
            const pData = await pRes.json();
            document.getElementById('quizAnswer').innerText = pData.data.text;
        } else {
            const words = randomAyah.text.split(' ');
            document.getElementById('quizQuestion').innerText = words.slice(0, 4).join(' ') + " ... (أكمل الآية)";
            document.getElementById('quizAnswer').innerText = randomAyah.text;
        }
    } catch (e) { alert("حدث خطأ في الاتصال بالسيرفر"); }
}

function setupMCQ(correctAyah, allAyahs) {
    const words = correctAyah.text.split(' ');
    const cut = Math.floor(words.length / 2);
    const question = words.slice(0, cut).join(' ');
    const answer = words.slice(cut).join(' ');

    document.getElementById('quizQuestion').innerText = question + " ...";
    let distractors = allAyahs.filter(a => a.number !== correctAyah.number).map(a => a.text.split(' ').slice(-5).join(' ')).sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [...distractors, answer].sort(() => 0.5 - Math.random());

    const grid = document.getElementById('quizOptions');
    grid.classList.remove('hidden');
    grid.innerHTML = options.map(opt => `<button class="option-btn" onclick="checkMCQ('${opt.replace(/'/g, "\\'")}', '${answer.replace(/'/g, "\\'")}')">${opt}</button>`).join('');
}

function checkMCQ(sel, cor) { sel === cor ? (alert("أحسنت! ✨"), startQuiz()) : alert("حاول مرة أخرى"); }
function revealAnswer() { document.getElementById('quizAnswer').classList.remove('hidden'); }

// 7. التنقل المطور
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

    const titles = { 'home': 'المصحف الشريف', 'quiz': 'اختبار الحفظ', 'reader': 'قراءة السورة' };
    document.getElementById('viewTitle').innerText = titles[id] || 'رفيق القرآن';
}

// 8. تهيئة التطبيق وشاشة الدعاء
window.onload = () => {
    // إخفاء Splash بعد 3.5 ثانية
    setTimeout(() => {
        document.getElementById('splashScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
    }, 3500);

    // تسجيل Service Worker للـ PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.log("SW registration failed", err));
    }

    if (localStorage.getItem('quran_theme') === 'dark') toggleDarkMode();
    loadSurahs();
};