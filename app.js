let appData = {
    user: {
        name: '',
        role: '',
        workplace: '',
        profileImage: '',
        projectLabel: ''  // Custom project label like "รายงานการทำงานประจำวัน เข้า Office (ฝ่ายพัฒนาระบบ)"
    },
    projects: [],
    selectedProjects: [],
    reports: [],
    lastReportDate: null,
    onboardingComplete: false,
    morningTemplate: '{name}\nงานประจำวันที่ {date}\n- '  // Default morning template
};

let onboardingProjects = [];
let currentStep = 1;

let editingProjectId = null;
let tasksQuill = null;
let templateQuill = null;
let selectedHeatmapYear = new Date().getFullYear();



// Quill toolbar configuration
const toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
];

function initTasksQuill() {
    if (typeof Quill !== 'undefined') {
        if (!tasksQuill) {
            tasksQuill = new Quill('#tasksEditor', {
                theme: 'snow',
                placeholder: 'เทมเพลตจะปรากฏเมื่อเลือกโครงการ...',
                modules: {
                    toolbar: toolbarOptions
                }
            });
        }
        // Show Quill, hide fallback
        document.getElementById('tasksEditorContainer').style.display = 'block';
        document.getElementById('tasksTextareaFallback').style.display = 'none';
    }
    // If Quill not available, fallback textarea is already visible
}

function initTemplateQuill() {
    if (typeof Quill !== 'undefined') {
        if (!templateQuill) {
            templateQuill = new Quill('#templateEditor', {
                theme: 'snow',
                placeholder: 'โครงการ: {project} ประกอบไปด้วยผลการดำเนินงาน ดังนี้\n1. \n2. \n3.',
                modules: {
                    toolbar: toolbarOptions
                }
            });
        }
        // Show Quill, hide fallback
        document.getElementById('templateEditorContainer').style.display = 'block';
        document.getElementById('templateTextareaFallback').style.display = 'none';
    }
    // If Quill not available, fallback textarea is already visible
}

function init() {
    loadData();
    
    // Initialize router
    initRouter();
}

// Router (Hash-based)
const routes = {
    '': 'landing',
    '#/': 'landing',
    '#/onboarding': 'onboarding',
    '#/app': 'app'
};

function initRouter() {
    // Handle hash changes (browser back/forward)
    window.addEventListener('hashchange', handleRoute);
    
    // Initial route
    handleRoute();
}

function navigate(path, replace = false) {
    // Convert path to hash format
    const hashPath = path.startsWith('#') ? path : '#' + path;
    
    if (replace) {
        history.replaceState(null, '', hashPath);
    } else {
        window.location.hash = hashPath.slice(1); // Remove leading # as location.hash adds it
    }
    handleRoute();
}

function handleRoute() {
    const hash = window.location.hash || '';
    const route = routes[hash] || routes['#' + hash] || 'landing';
    
    // If onboarding complete and trying to access landing/onboarding, redirect to app
    if (appData.onboardingComplete && (route === 'landing' || route === 'onboarding')) {
        navigate('/app', true);
        return;
    }
    
    // If onboarding not complete and trying to access app, redirect to landing
    if (!appData.onboardingComplete && route === 'app') {
        navigate('/', true);
        return;
    }
    
    switch (route) {
        case 'landing':
            showLandingPage();
            break;
        case 'onboarding':
            showOnboarding();
            break;
        case 'app':
            showMainApp();
            break;
        default:
            showLandingPage();
    }
}

function showLandingPage() {
    document.getElementById('landingPage').style.display = 'block';
    document.getElementById('onboardingPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'none';
}

function showOnboarding() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('onboardingPage').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    onboardingProjects = [];
    currentStep = 1;
    
    // Reset step indicators for new design
    document.querySelectorAll('.step-item').forEach((item, index) => {
        const circle = item.querySelector('.step-circle');
        item.classList.remove('active', 'completed');
        circle.classList.remove('active', 'completed');
        if (index === 0) {
            item.classList.add('active');
            circle.classList.add('active');
        }
    });
    
    document.querySelectorAll('.step-connector').forEach(connector => {
        connector.classList.remove('active');
    });
    
    // Reset form fields
    document.getElementById('onboardingName').value = '';
    document.getElementById('onboardingRole').value = '';
    document.getElementById('onboardingWorkplace').value = '';
    document.getElementById('onboardingProjectLabel').value = '';
    
    // Reset profile preview
    const preview = document.getElementById('profilePreview');
    if (preview) {
        preview.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>`;
    }
    
    // Show step 1
    document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
    document.getElementById('step1').classList.add('active');
    
    renderOnboardingProjects();
}

function showImportOption() {
    // Create import overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'importOverlay';
    overlay.innerHTML = `
        <div class="import-modal">
            <button class="modal-close" onclick="closeImportOverlay()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <div class="import-modal-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#194987" stroke-width="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
            </div>
            <h3 class="import-modal-title">นำเข้าข้อมูล</h3>
            <p class="import-modal-description">เลือกไฟล์ JSON ที่เคยส่งออกไว้จาก HurryUp เพื่อกู้คืนข้อมูลของคุณ</p>
            <label class="btn-import-file" for="importFileInput">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                เลือกไฟล์ .json
            </label>
            <input type="file" id="importFileInput" accept=".json" onchange="handleImportFile(event)" style="display:none;">
            <p class="import-modal-hint">หรือลากไฟล์มาวางที่นี่</p>
        </div>
    `;
    document.body.appendChild(overlay);

    // Add drag and drop support
    const modal = overlay.querySelector('.import-modal');
    
    modal.addEventListener('dragover', (e) => {
        e.preventDefault();
        modal.classList.add('drag-over');
    });

    modal.addEventListener('dragleave', () => {
        modal.classList.remove('drag-over');
    });

    modal.addEventListener('drop', (e) => {
        e.preventDefault();
        modal.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.json')) {
            processImportFile(file);
        } else {
            showToast('กรุณาเลือกไฟล์ .json เท่านั้น');
        }
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeImportOverlay();
        }
    });
}

function closeImportOverlay() {
    const overlay = document.getElementById('importOverlay');
    if (overlay) {
        overlay.remove();
    }
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (file) {
        processImportFile(file);
    }
    event.target.value = '';
}

function processImportFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validate the imported data structure
            if (!importedData.data || !importedData.data.user) {
                showToast('ไฟล์ไม่ถูกต้อง กรุณาใช้ไฟล์สำรองจาก HurryUp');
                return;
            }

            // Import the data
            appData = { ...appData, ...importedData.data };
            appData.onboardingComplete = true;
            saveData();

            // Close overlay
            closeImportOverlay();

            // Show success message
            showToast('นำเข้าข้อมูลสำเร็จ! 🎉');

            // Navigate to main app
            setTimeout(() => {
                navigate('/app', true);
            }, 500);

        } catch (error) {
            console.error('Import error:', error);
            showToast('เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
        }
    };
    reader.readAsText(file);
}

let mainAppInitialized = false;

function showMainApp() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('onboardingPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    // Only initialize once
    if (!mainAppInitialized) {
        initTasksQuill();
        updateDateTime();
        updateGreeting();
        updateStats();
        renderProjects();
        updateProfileAvatar();
        initStickyHeader();
        renderHeatmap();
        setInterval(updateDateTime, 1000);
        mainAppInitialized = true;
    } else {
        // Just update dynamic content
        updateDateTime();
        updateGreeting();
        updateStats();
        renderProjects();
        renderHeatmap();
    }
}

function initStickyHeader() {
    const headerWrapper = document.getElementById('headerWrapper');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            headerWrapper.classList.add('scrolled');
        } else {
            headerWrapper.classList.remove('scrolled');
        }
    });
}

function updateProfileAvatar() {
    const avatars = document.querySelectorAll('.blog-avatar, #blogAvatar');
    avatars.forEach(avatar => {
        if (appData.user.profileImage) {
            avatar.innerHTML = `<img src="${appData.user.profileImage}" alt="Profile">`;
        }
    });
    
    // Update navbar profile button
    updateNavProfile();
}

function updateNavProfile() {
    const navAvatar = document.getElementById('navProfileAvatar');
    const navName = document.getElementById('navProfileName');
    
    if (navAvatar && appData.user.profileImage) {
        navAvatar.innerHTML = `<img src="${appData.user.profileImage}" alt="Profile">`;
    }
    
    if (navName && appData.user.name) {
        // Show first name only or truncate if too long
        const displayName = appData.user.name.split(' ')[0] || appData.user.name;
        navName.textContent = displayName;
    }
}

// Onboarding Functions
function goToStep(step) {
    // Validate current step before proceeding
    if (step > currentStep) {
        if (currentStep === 1) {
            const name = document.getElementById('onboardingName').value.trim();
            const role = document.getElementById('onboardingRole').value.trim();
            const workplace = document.getElementById('onboardingWorkplace').value.trim();
            const projectLabel = document.getElementById('onboardingProjectLabel').value.trim();

            if (!name || !role || !workplace || !projectLabel) {
                showToast('กรุณากรอกข้อมูลให้ครบถ้วน');
                return;
            }
        }
    }

    currentStep = step;

    // Update new step indicators
    document.querySelectorAll('.step-item').forEach((item, index) => {
        const circle = item.querySelector('.step-circle');
        item.classList.remove('active', 'completed');
        circle.classList.remove('active', 'completed');
        
        if (index + 1 < step) {
            item.classList.add('completed');
            circle.classList.add('completed');
        } else if (index + 1 === step) {
            item.classList.add('active');
            circle.classList.add('active');
        }
    });

    // Update step connectors
    document.querySelectorAll('.step-connector').forEach((connector, index) => {
        connector.classList.toggle('active', index + 1 < step);
    });

    // Show current step
    document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');

    // Update summary on step 3
    if (step === 3) {
        updateOnboardingSummary();
    }
}

function skipToComplete() {
    // Check if basic info is filled
    const name = document.getElementById('onboardingName').value.trim();
    const role = document.getElementById('onboardingRole').value.trim();
    const workplace = document.getElementById('onboardingWorkplace').value.trim();
    const projectLabel = document.getElementById('onboardingProjectLabel').value.trim();

    if (!name || !role || !workplace || !projectLabel) {
        showToast('กรุณากรอกข้อมูลส่วนตัวก่อน');
        goToStep(1);
        return;
    }
    
    // Skip to complete
    goToStep(3);
}

function handleProfileImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showToast('ขนาดไฟล์ต้องไม่เกิน 2MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        const imageData = e.target.result;
        // Compress profile image (smaller size for profile)
        const compressedImage = await compressImage(imageData, 400, 0.8);
        const preview = document.getElementById('profilePreview');
        if (preview) {
            preview.innerHTML = `<img src="${compressedImage}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
        appData.user.profileImage = compressedImage;
    };
    reader.readAsDataURL(file);
}

function addOnboardingProject() {
    const name = document.getElementById('onboardingProjectName').value.trim();
    const url = document.getElementById('onboardingProjectUrl').value.trim();

    if (!name) {
        showToast('กรุณากรอกชื่อโครงการ');
        return;
    }

    const newId = onboardingProjects.length > 0
        ? Math.max(...onboardingProjects.map(p => p.id)) + 1
        : 1;

    onboardingProjects.push({
        id: newId,
        name: name,
        taigaUrl: url,
        template: DEFAULT_TEMPLATE
    });

    document.getElementById('onboardingProjectName').value = '';
    document.getElementById('onboardingProjectUrl').value = '';

    renderOnboardingProjects();
    showToast(`เพิ่มโครงการ "${name}" แล้ว`);
}

function removeOnboardingProject(id) {
    onboardingProjects = onboardingProjects.filter(p => p.id !== id);
    renderOnboardingProjects();
}

function renderOnboardingProjects() {
    const container = document.getElementById('onboardingProjectsList');
    container.innerHTML = '';

    if (onboardingProjects.length === 0) {
        return;
    }

    onboardingProjects.forEach(project => {
        const item = document.createElement('div');
        item.className = 'project-item-onboarding';
        item.innerHTML = `
                    <div class="project-item-info">
                        <div class="project-item-name">${escapeHtml(project.name)}</div>
                        <div class="project-item-url">${escapeHtml(project.taigaUrl || 'ไม่มี URL')}</div>
                    </div>
                    <button class="btn-remove" onclick="removeOnboardingProject(${project.id})">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                `;
        container.appendChild(item);
    });
}

function updateOnboardingSummary() {
    const name = document.getElementById('onboardingName').value.trim();
    const role = document.getElementById('onboardingRole').value.trim();

    document.getElementById('summaryName').textContent = name || '-';
    document.getElementById('summaryRole').textContent = role || '-';
    document.getElementById('summaryProjectsCount').textContent = onboardingProjects.length;

    // Update avatar
    if (appData.user.profileImage) {
        document.getElementById('summaryAvatar').innerHTML = `<img src="${appData.user.profileImage}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`;
    }
}

function completeOnboarding() {
    const name = document.getElementById('onboardingName').value.trim();
    const role = document.getElementById('onboardingRole').value.trim();
    const workplace = document.getElementById('onboardingWorkplace').value.trim();
    const projectLabel = document.getElementById('onboardingProjectLabel').value.trim();

    appData.user.name = name;
    appData.user.role = role;
    appData.user.workplace = workplace;
    appData.user.projectLabel = projectLabel;
    appData.projects = onboardingProjects;
    appData.onboardingComplete = true;

    saveData();
    navigate('/app', true);
    showToast('ยินดีต้อนรับสู่ HurryUp! 🎉');
}

function loadData() {
    const saved = localStorage.getItem('dailyReportData');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.projects) {
            parsed.projects = parsed.projects.map(p => ({
                ...p,
                template: p.template || DEFAULT_TEMPLATE
            }));
        }
        // Ensure user object has all fields
        if (parsed.user) {
            if (!parsed.user.profileImage) parsed.user.profileImage = '';
            if (!parsed.user.projectLabel) parsed.user.projectLabel = '';
        }
        // Ensure morningTemplate exists
        if (!parsed.morningTemplate) {
            parsed.morningTemplate = '{name}\nงานประจำวันที่ {date}\n- ';
        }
        appData = { ...appData, ...parsed };
    }
}

function saveData() {
    try {
        localStorage.setItem('dailyReportData', JSON.stringify(appData));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            // Try to free up space by removing old report images
            const cleaned = cleanOldReportImages();
            if (cleaned) {
                try {
                    localStorage.setItem('dailyReportData', JSON.stringify(appData));
                    showToast('พื้นที่เก็บข้อมูลเต็ม - ลบรูปภาพเก่าบางส่วนแล้ว');
                    return;
                } catch (e2) {
                    // Still failing, try more aggressive cleanup
                    cleanAllReportImages();
                    try {
                        localStorage.setItem('dailyReportData', JSON.stringify(appData));
                        showToast('พื้นที่เก็บข้อมูลเต็ม - ลบรูปภาพทั้งหมดแล้ว');
                        return;
                    } catch (e3) {
                        showToast('ไม่สามารถบันทึกได้ - พื้นที่เก็บข้อมูลเต็ม กรุณาลบข้อมูลเก่า');
                    }
                }
            } else {
                showToast('ไม่สามารถบันทึกได้ - พื้นที่เก็บข้อมูลเต็ม กรุณาลบข้อมูลเก่า');
            }
        } else {
            console.error('Error saving data:', e);
            showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    }
}

// Clean images from reports older than 30 days
function cleanOldReportImages() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let cleaned = false;
    appData.reports.forEach(report => {
        if (report.images && report.images.length > 0) {
            const reportDate = new Date(report.date);
            if (reportDate < thirtyDaysAgo) {
                report.images = [];
                cleaned = true;
            }
        }
    });
    return cleaned;
}

// Clean all report images as last resort
function cleanAllReportImages() {
    appData.reports.forEach(report => {
        if (report.images) {
            report.images = [];
        }
    });
}

// Compress image to reduce storage size
function compressImage(base64String, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Scale down if larger than maxWidth
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to JPEG for better compression
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64String); // Return original if error
        img.src = base64String;
    });
}

function updateDateTime() {
    const now = new Date();
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const day = now.getDate();
    const month = thaiMonths[now.getMonth()];
    const year = now.getFullYear() + 543;
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    document.getElementById('dateTime').textContent = `${day} ${month} ${year} - ${hours}:${minutes}:${seconds} น.`;
    
    // Update workday progress
    updateWorkdayProgress();
}

function updateWorkdayProgress() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Work hours: 8:30 (510 min) to 17:30 (1050 min)
    const startMinutes = 8 * 60 + 30;  // 8:30 = 510 minutes
    const endMinutes = 17 * 60 + 30;   // 17:30 = 1050 minutes
    const totalWorkMinutes = endMinutes - startMinutes; // 540 minutes (9 hours)
    
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressMessage = document.getElementById('progressMessage');
    
    if (!progressFill) return;
    
    let percent = 0;
    let message = '';
    
    if (currentMinutes < startMinutes) {
        // Before work
        percent = 0;
        message = 'เตรียมตัว! 💪';
    } else if (currentMinutes >= endMinutes) {
        // After work
        percent = 100;
        message = 'เลิกงานแล้ว! 🎉';
    } else {
        // During work hours
        const elapsedMinutes = currentMinutes - startMinutes;
        percent = Math.round((elapsedMinutes / totalWorkMinutes) * 100);
        
        // Encouraging messages based on progress
        if (percent < 25) {
            message = 'เริ่มต้นวันใหม่! ☀️';
        } else if (percent < 50) {
            message = 'สู้ๆ นะ! 💪';
        } else if (percent < 75) {
            message = 'ผ่านครึ่งทางแล้ว! 🌟';
        } else if (percent < 90) {
            message = 'ใกล้ถึงแล้ว! 🚀';
        } else {
            message = 'อีกนิดเดียว! 🏁';
        }
    }
    
    // Update progress bar
    progressFill.style.width = percent + '%';
    progressPercent.textContent = percent + '%';
    progressMessage.textContent = message;
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greetingText = 'สวัสดี';
    if (hour < 12) greetingText = 'สวัสดีตอนเช้า';
    else if (hour < 17) greetingText = 'สวัสดีตอนบ่าย';
    else greetingText = 'สวัสดีตอนเย็น';
    document.getElementById('greeting').textContent = `${greetingText}คุณ, ${appData.user.name}`;
    document.getElementById('userRole').textContent = appData.user.role;
}

function updateStats() {
    document.getElementById('totalProjects').textContent = appData.projects.length;
    const currentYear = new Date().getFullYear();
    const reportsThisYear = appData.reports.filter(r => new Date(r.date).getFullYear() === currentYear).length;
    document.getElementById('totalReports').textContent = reportsThisYear;
    const today = new Date().toDateString();
    const reportedToday = appData.lastReportDate === today;
    document.getElementById('todayStatus').textContent = reportedToday ? 'เรียบร้อย ✓' : 'ยัง';
    document.getElementById('todayStatus').style.color = reportedToday ? '#ffffffff' : '#ffffffff';
}

function renderHeatmap() {
    const grid = document.getElementById('heatmapGrid');
    const monthsContainer = document.getElementById('heatmapMonths');
    grid.innerHTML = '';
    monthsContainer.innerHTML = '';

    // Use selected year
    const year = selectedHeatmapYear;
    const startDate = new Date(year, 0, 1); // Jan 1
    const endDate = new Date(year, 11, 31); // Dec 31
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Include all of today

    // Build report count map by date string
    const reportCountMap = {};
    appData.reports.forEach(report => {
        const reportDate = new Date(report.date);
        const dateKey = `${reportDate.getFullYear()}-${reportDate.getMonth()}-${reportDate.getDate()}`;
        const projectCount = report.projects ? report.projects.length : 1;
        reportCountMap[dateKey] = (reportCountMap[dateKey] || 0) + projectCount;
    });

    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    // Calculate first day of week for the year
    const firstDayOfWeek = startDate.getDay();

    // Calculate total days in year (handle leap year)
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const totalDays = isLeapYear ? 366 : 365;
    const totalWeeks = Math.ceil((totalDays + firstDayOfWeek) / 7);

    // Create weeks
    for (let week = 0; week < totalWeeks; week++) {
        const weekDiv = document.createElement('div');
        weekDiv.className = 'heatmap-week';

        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            const dayIndex = week * 7 + dayOfWeek - firstDayOfWeek;
            const day = document.createElement('div');
            day.className = 'heatmap-day';

            if (dayIndex >= 0 && dayIndex < totalDays) {
                const currentDate = new Date(year, 0, 1 + dayIndex);
                const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
                const count = reportCountMap[dateKey] || 0;

                // Check if this date is in the past or today
                const isPastOrToday = currentDate <= today;

                // Determine level based on count
                // 1 project = level 1, 2 projects = level 2, 3+ projects = level 3
                let level = 0;
                if (count === 1) level = 1;
                else if (count === 2) level = 2;
                else if (count >= 3) level = 3;

                if (isPastOrToday) {
                    day.classList.add(`level-${level}`);
                } else {
                    day.classList.add('future');
                }

                // Create tooltip text
                const thaiDate = `${currentDate.getDate()} ${thaiMonths[currentDate.getMonth()]} ${currentDate.getFullYear() + 543}`;
                const tooltipText = count > 0 ? `${thaiDate}: ${count} โครงการ` : `${thaiDate}: ไม่มีข้อมูล`;
                day.setAttribute('title', tooltipText);
                day.setAttribute('data-date', dateKey);
                day.setAttribute('data-count', count);
                day.setAttribute('data-iso-date', currentDate.toISOString());

                // Add click handler to view report
                if (count > 0) {
                    day.style.cursor = 'pointer';
                    day.addEventListener('click', () => viewReportByDate(currentDate));
                }
            } else {
                // Empty cell before Jan 1 or after Dec 31
                day.classList.add('empty');
            }

            weekDiv.appendChild(day);
        }

        grid.appendChild(weekDiv);
    }

    // Generate month labels
    for (let month = 0; month < 12; month++) {
        const monthStart = new Date(year, month, 1);
        const dayOfYear = Math.floor((monthStart - startDate) / (1000 * 60 * 60 * 24));
        const weekOfMonth = Math.floor((dayOfYear + firstDayOfWeek) / 7);

        const monthLabel = document.createElement('span');
        monthLabel.textContent = thaiMonths[month];
        monthLabel.style.left = (weekOfMonth * 15) + 'px';
        monthsContainer.appendChild(monthLabel);
    }

    // Update year selector UI
    updateYearSelector();
}

// Year selector functions
function changeHeatmapYear(delta) {
    const newYear = selectedHeatmapYear + delta;
    if (newYear >= 2023 && newYear <= 2026) {
        selectedHeatmapYear = newYear;
        renderHeatmap();
    }
}

function setHeatmapYear(year) {
    const yearNum = parseInt(year);
    if (yearNum >= 2023 && yearNum <= 2026) {
        selectedHeatmapYear = yearNum;
        renderHeatmap();
    }
}

function updateYearSelector() {
    const yearButtons = document.querySelectorAll('.year-btn');
    
    yearButtons.forEach(btn => {
        const btnYear = parseInt(btn.getAttribute('data-year'));
        if (btnYear === selectedHeatmapYear) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function viewReportByDate(date) {
    const dateString = date.toDateString();
    const report = appData.reports.find(r => new Date(r.date).toDateString() === dateString);
    
    if (!report) {
        showToast('ไม่พบข้อมูลรายงานของวันนี้');
        return;
    }

    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const reportDate = new Date(report.date);
    const thaiDate = `${reportDate.getDate()} ${thaiMonths[reportDate.getMonth()]} ${reportDate.getFullYear() + 543}`;

    // Build images HTML
    let imagesHtml = '';
    if (report.images && report.images.length > 0) {
        imagesHtml = `
            <div class="report-images-section">
                <p class="report-images-label">รูปภาพแนบ (${report.images.length} รูป)</p>
                <div class="report-images-gallery">
                    ${report.images.map((img, index) => `
                        <div class="report-image-item">
                            <img src="${img}" alt="Image ${index + 1}">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Build projects HTML
    let projectsHtml = '';
    if (report.projects && report.projects.length > 0) {
        const projectNames = report.projects.map(pid => {
            const project = appData.projects.find(p => p.id === pid);
            return project ? project.name : 'โครงการที่ถูกลบ';
        });
        projectsHtml = `<p class="report-projects"><strong>โครงการ:</strong> ${projectNames.join(', ')}</p>`;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'reportViewModal';
    overlay.innerHTML = `
        <div class="modal report-view-modal">
            <div class="modal-header">
                <h3 class="modal-title">รายงานวันที่ ${thaiDate}</h3>
                <button class="modal-close" onclick="closeReportViewModal()">&times;</button>
            </div>
            <div class="report-view-content">
                ${projectsHtml}
                <div class="report-text-content">
                    ${report.contentHtml || '<p class="no-content">ไม่มีเนื้อหารายงาน</p>'}
                </div>
                ${imagesHtml}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeReportViewModal();
    });
}

function closeReportViewModal() {
    const modal = document.getElementById('reportViewModal');
    if (modal) modal.remove();
}

function renderProjects() {
    const container = document.getElementById('projectChips');
    container.innerHTML = '';
    appData.projects.forEach(project => {
        const chip = document.createElement('button');
        chip.className = 'project-chip' + (appData.selectedProjects.includes(project.id) ? ' selected' : '');
        chip.textContent = project.name;
        chip.onclick = () => toggleProject(project.id);
        container.appendChild(chip);
    });
    const addChip = document.createElement('button');
    addChip.className = 'project-chip add-new';
    addChip.textContent = '+ เพิ่มโครงการ';
    addChip.onclick = () => openSettings('projects');
    container.appendChild(addChip);
}

function toggleProject(projectId) {
    const index = appData.selectedProjects.indexOf(projectId);
    if (index > -1) {
        appData.selectedProjects.splice(index, 1);
    } else {
        appData.selectedProjects.push(projectId);
    }
    renderProjects();
    updateTemplate();
    updateSubmitButton();
}

function updateTemplate() {
    if (appData.selectedProjects.length === 0) {
        if (tasksQuill) {
            tasksQuill.setContents([]);
        } else {
            document.getElementById('tasksTextareaFallback').value = '';
        }
        return;
    }

    let combinedHtml = '';
    let combinedText = '';
    appData.selectedProjects.forEach((projectId, index) => {
        const project = appData.projects.find(p => p.id === projectId);
        if (project) {
            if (index > 0) {
                combinedHtml += '<p><br></p>';
                combinedText += '\n\n';
            }
            const projectTemplate = project.template || DEFAULT_TEMPLATE;
            combinedHtml += projectTemplate.replace(/\{project\}/g, project.name);
            combinedText += stripHtml(projectTemplate).replace(/\{project\}/g, project.name);
        }
    });

    if (tasksQuill) {
        tasksQuill.root.innerHTML = combinedHtml;
    } else {
        document.getElementById('tasksTextareaFallback').value = combinedText;
    }
}

function updateSubmitButton() {
    document.getElementById('submitBtn').disabled = appData.selectedProjects.length === 0;
}

function generateSummary() {
    // Get content from Quill or fallback textarea
    let tasksHtml = '';
    let tasksPlainText = '';
    if (tasksQuill && tasksQuill.root) {
        tasksHtml = tasksQuill.root.innerHTML;
        tasksPlainText = stripHtml(tasksHtml);
    } else {
        // Fallback: get from textarea and convert to HTML
        const fallbackText = document.getElementById('tasksTextareaFallback').value;
        tasksHtml = '<p>' + fallbackText.replace(/\n/g, '</p><p>') + '</p>';
        tasksPlainText = fallbackText;
    }

    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear() + 543;

    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    // Set profile avatar
    const blogAvatarEl = document.getElementById('blogAvatar');
    if (appData.user.profileImage) {
        blogAvatarEl.innerHTML = `<img src="${appData.user.profileImage}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
        blogAvatarEl.innerHTML = '';
    }

    // Populate blog header - use projectLabel instead of project names
    document.getElementById('blogAuthor').textContent = `${appData.user.name} (วันที่: ${day} ${thaiMonths[now.getMonth()]} ${year})`;
    document.getElementById('blogMeta').textContent = `ตำแหน่ง: ${appData.user.role}`;
    document.getElementById('blogProject').textContent = `โครงการ: ${appData.user.projectLabel}`;

    // Generate blog content HTML (for display with formatting)
    const blogContentHtml = `<p><strong>โครงการ :</strong> ${escapeHtml(appData.user.projectLabel)}</p>
<p><strong>สถานที่ปฏิบัติงาน :</strong> ${escapeHtml(appData.user.workplace)}</p>
<p><strong>ผู้ปฏิบัติงาน:</strong> ${escapeHtml(appData.user.name)}</p>
<p><strong>ตำแหน่ง:</strong> ${escapeHtml(appData.user.role)}</p>
<p><strong>งานประจำวันที่</strong> ${day}/${month}/${year}</p>
<div style="margin-top: 12px;">${tasksHtml}</div>`;

    // Store plain text version for copying
    const blogContentPlainText = `โครงการ : ${appData.user.projectLabel}
สถานที่ปฏิบัติงาน : ${appData.user.workplace}
ผู้ปฏิบัติงาน: ${appData.user.name}
ตำแหน่ง: ${appData.user.role}
งานประจำวันที่ ${day}/${month}/${year}

${tasksPlainText}`;

    const blogContentEl = document.getElementById('blogContent');
    blogContentEl.innerHTML = blogContentHtml;
    blogContentEl.dataset.plainText = blogContentPlainText;

    // Generate Taiga URLs
    const taigaContainer = document.getElementById('taigaOutput');
    taigaContainer.innerHTML = '';
    appData.selectedProjects.forEach(projectId => {
        const project = appData.projects.find(p => p.id === projectId);
        if (project && project.taigaUrl) {
            const item = document.createElement('div');
            item.className = 'taiga-url-card';
            item.innerHTML = `
                        <div class="taiga-url-info">
                            <div class="taiga-project-name">${escapeHtml(project.name)}</div>
                            <span class="taiga-url-text">${escapeHtml(project.taigaUrl)}</span>
                        </div>
                        <div class="taiga-btn-group">
                            <button class="taiga-copy-btn" onclick="copyTaigaTitle(this, '${escapeHtml(project.name).replace(/'/g, "\\'")}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 7V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <path d="M5 12H1v4h4v-4z"></path>
                                    <path d="M9 14h2"></path>
                                </svg>
                                <span class="copy-text">ชื่อ</span>
                            </button>
                            <button class="taiga-copy-btn" onclick="copyTaigaUrl(this, '${escapeHtml(project.taigaUrl).replace(/'/g, "\\'")}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                </svg>
                                <span class="copy-text">URL</span>
                            </button>
                            <button class="taiga-open-btn" onclick="openTaigaUrl('${escapeHtml(project.taigaUrl).replace(/'/g, "\\'")}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                                <span class="copy-text">เปิด</span>
                            </button>
                        </div>
                    `;
            taigaContainer.appendChild(item);
        }
    });

    // Show summary section
    document.getElementById('inputSection').classList.add('hidden');
    document.getElementById('summarySection').classList.add('active');

    // Show attached images in blog section
    showBlogImages();

    // 1. Toggle visibility
    document.getElementById('inputSection').style.display = 'none';
    document.getElementById('summarySection').style.display = 'block';

    // 2. Scroll to top (Smoothly)
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function htmlToPlainText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Convert lists to text with numbers/bullets
    temp.querySelectorAll('ol').forEach(ol => {
        let index = 1;
        ol.querySelectorAll('li').forEach(li => {
            li.innerHTML = `${index}. ${li.innerHTML}`;
            index++;
        });
    });
    temp.querySelectorAll('ul').forEach(ul => {
        ul.querySelectorAll('li').forEach(li => {
            li.innerHTML = `• ${li.innerHTML}`;
        });
    });

    // Replace <br> and block elements with newlines
    temp.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    temp.querySelectorAll('p, li, div').forEach(el => {
        el.innerHTML = el.innerHTML + '\n';
    });

    return temp.textContent.replace(/\n{3,}/g, '\n\n').trim();
}

function copyBlogContent(button) {
    const blogContentEl = document.getElementById('blogContent');
    
    // Clone the content to modify for copying
    const clonedContent = blogContentEl.cloneNode(true);
    
    // Convert flat list with ql-indent classes to nested lists
    clonedContent.querySelectorAll('ul, ol').forEach(list => {
        const items = Array.from(list.children);
        let currentLevel = 0;
        let listStack = [list];
        
        items.forEach(item => {
            if (item.tagName !== 'LI') return;
            
            // Get indent level from class
            let itemLevel = 0;
            for (let i = 1; i <= 8; i++) {
                if (item.classList.contains(`ql-indent-${i}`)) {
                    itemLevel = i;
                    item.classList.remove(`ql-indent-${i}`);
                    break;
                }
            }
            
            if (itemLevel > currentLevel) {
                // Need to nest deeper
                for (let i = currentLevel; i < itemLevel; i++) {
                    const newList = document.createElement(list.tagName);
                    const lastItem = listStack[listStack.length - 1].lastElementChild;
                    if (lastItem) {
                        lastItem.appendChild(newList);
                        listStack.push(newList);
                    }
                }
            } else if (itemLevel < currentLevel) {
                // Go back up
                for (let i = currentLevel; i > itemLevel; i--) {
                    listStack.pop();
                }
            }
            
            currentLevel = itemLevel;
            listStack[listStack.length - 1].appendChild(item);
        });
    });
    
    const htmlContent = clonedContent.innerHTML;
    const plainText = generatePlainTextWithIndent(clonedContent);

    // Copy as rich text (HTML) so formatting is preserved when pasting
    const clipboardItem = new ClipboardItem({
        'text/html': new Blob([htmlContent], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' })
    });

    navigator.clipboard.write([clipboardItem]).then(() => {
        button.classList.add('copied');
        const textSpan = button.querySelector('.copy-text');
        textSpan.textContent = 'คัดลอกแล้ว';
        setTimeout(() => {
            button.classList.remove('copied');
            textSpan.textContent = 'คัดลอก';
        }, 2000);
    }).catch(err => {
        // Fallback to plain text if rich text copy fails
        navigator.clipboard.writeText(plainText).then(() => {
            button.classList.add('copied');
            const textSpan = button.querySelector('.copy-text');
            textSpan.textContent = 'คัดลอกแล้ว';
            setTimeout(() => {
                button.classList.remove('copied');
                textSpan.textContent = 'คัดลอก';
            }, 2000);
        });
    });
}

function generatePlainTextWithIndent(element) {
    let text = '';
    
    function processNode(node, indent = 0) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName.toLowerCase();
            
            if (tag === 'p' || tag === 'div') {
                Array.from(node.childNodes).forEach(child => processNode(child, indent));
                text += '\n';
            } else if (tag === 'br') {
                text += '\n';
            } else if (tag === 'ul' || tag === 'ol') {
                Array.from(node.children).forEach((li, index) => {
                    const prefix = tag === 'ol' ? `${index + 1}. ` : '• ';
                    text += '    '.repeat(indent) + prefix;
                    Array.from(li.childNodes).forEach(child => {
                        if (child.tagName === 'UL' || child.tagName === 'OL') {
                            text += '\n';
                            processNode(child, indent + 1);
                        } else {
                            processNode(child, indent);
                        }
                    });
                    if (!text.endsWith('\n')) text += '\n';
                });
            } else if (tag === 'li') {
                Array.from(node.childNodes).forEach(child => processNode(child, indent));
            } else {
                Array.from(node.childNodes).forEach(child => processNode(child, indent));
            }
        }
    }
    
    processNode(element);
    return text.trim();
}

function copyTaigaUrl(button, url) {
    navigator.clipboard.writeText(url).then(() => {
        button.classList.add('copied');
        const textSpan = button.querySelector('.copy-text');
        textSpan.textContent = 'คัดลอกแล้ว';
        setTimeout(() => {
            button.classList.remove('copied');
            textSpan.textContent = 'URL';
        }, 2000);
    });
}

function copyTaigaTitle(button, title) {
    navigator.clipboard.writeText(title).then(() => {
        button.classList.add('copied');
        const textSpan = button.querySelector('.copy-text');
        textSpan.textContent = 'คัดลอกแล้ว';
        setTimeout(() => {
            button.classList.remove('copied');
            textSpan.textContent = 'ชื่อ';
        }, 2000);
    });
}

function openTaigaUrl(url) {
    if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

function createConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    const colors = ['#194987', '#0f3260', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FFEB3B'];
    const shapes = ['circle', 'square', 'triangle'];
    const confettiCount = 150;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        confetti.className = `confetti ${shape}`;

        const color = colors[Math.floor(Math.random() * colors.length)];
        if (shape === 'triangle') {
            confetti.style.borderBottomColor = color;
        } else {
            confetti.style.backgroundColor = color;
        }

        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = -20 + 'px';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (2 + Math.random() * 2) + 's';

        const size = 6 + Math.random() * 10;
        if (shape !== 'triangle') {
            confetti.style.width = size + 'px';
            confetti.style.height = size + 'px';
        }

        container.appendChild(confetti);
    }

    // Remove container after animation
    setTimeout(() => {
        container.remove();
    }, 4000);
}

function showConfirmDialog(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
                <div class="confirm-dialog">
                    <div class="confirm-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF9800" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h3 class="confirm-title">${title}</h3>
                    <p class="confirm-message">${message}</p>
                    <div class="confirm-actions">
                        <button class="btn-secondary" id="confirmCancel">ยกเลิก</button>
                        <button class="btn-primary" id="confirmOk">ยืนยัน</button>
                    </div>
                </div>
            `;
    document.body.appendChild(overlay);

    overlay.querySelector('#confirmCancel').onclick = () => overlay.remove();
    overlay.querySelector('#confirmOk').onclick = () => {
        overlay.remove();
        onConfirm();
    };
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
}

function hasAlreadySavedToday() {
    const today = new Date().toDateString();
    return appData.lastReportDate === today;
}

function markAsDone() {
    // Get current blog content
    const blogContentEl = document.getElementById('blogContent');
    const blogContentHtml = blogContentEl.innerHTML;
    const blogContentPlainText = blogContentEl.dataset.plainText || '';

    if (hasAlreadySavedToday()) {
        showConfirmDialog(
            'คุณอัปบล็อกของวันนี้ไปแล้ว',
            'ต้องการยืนยันใหม่อีกครั้งหรือไม่? (จำนวนรายงานจะไม่ถูกเพิ่ม แต่จะอัปเดตเนื้อหา)',
            () => {
                // Update existing report for today
                const today = new Date().toDateString();
                const existingReport = appData.reports.find(r => new Date(r.date).toDateString() === today);
                if (existingReport) {
                    existingReport.contentHtml = blogContentHtml;
                    existingReport.contentText = blogContentPlainText;
                    existingReport.images = taskImages.map(img => img.data);
                    existingReport.projects = [...appData.selectedProjects];
                    saveData();
                }

                appData.selectedProjects = [];
                taskImages = []; // Clear images after saving
                createConfetti();
                goBack(false);

                document.getElementById('summarySection').style.display = 'none';
                document.getElementById('inputSection').style.display = 'block';

                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                showToast('อัปเดตสำเร็จ! ✓');
            }
        );
        return;
    }

    const today = new Date().toDateString();
    appData.lastReportDate = today;
    appData.reports.push({
        date: new Date().toISOString(),
        projects: [...appData.selectedProjects],
        contentHtml: blogContentHtml,
        contentText: blogContentPlainText,
        images: taskImages.map(img => img.data)
    });
    saveData();
    appData.selectedProjects = [];
    taskImages = []; // Clear images after saving

    // Trigger confetti effect
    createConfetti();

    goBack(false);
    updateStats();
    renderHeatmap();
    renderTaskImageGallery(); // Clear the image gallery display
    showToast('บันทึกสำเร็จ! อัปบล็อกแล้ววันนี้ ✓');
}

function exportData() {
    // Create export data object with timestamp
    const exportObj = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0',
        data: appData
    };

    // Convert to JSON string with pretty formatting
    const jsonString = JSON.stringify(exportObj, null, 2);

    // Create blob and download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Generate filename with date and time
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `hurryup-backup-${dateStr}_${timeStr}.json`;

    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up URL object
    URL.revokeObjectURL(url);

    showToast('ส่งออกข้อมูลสำเร็จ');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validate the imported data structure
            if (!importedData.data || !importedData.data.user) {
                showToast('ไฟล์ไม่ถูกต้อง กรุณาใช้ไฟล์สำรองจาก HurryUp');
                return;
            }

            // Import the data
            appData = { ...appData, ...importedData.data };
            appData.onboardingComplete = true;
            saveData();

            // Show success message
            showToast('นำเข้าข้อมูลสำเร็จ!');

            // Navigate to main app
            setTimeout(() => {
                navigate('/app', true);
            }, 1000);

        } catch (error) {
            console.error('Import error:', error);
            showToast('เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
        }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
}

function confirmDeleteAllData() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
                <div class="confirm-dialog">
                    <div class="confirm-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c00" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    </div>
                    <h3 class="confirm-title">ยืนยันการลบข้อมูลทั้งหมด</h3>
                    <p class="confirm-message">ข้อมูลทั้งหมดของคุณจะถูกลบอย่างถาวร รวมถึงโปรไฟล์ โครงการ และประวัติการรายงาน คุณแน่ใจหรือไม่?</p>
                    <div class="confirm-actions">
                        <button class="btn-secondary" id="confirmCancel">ยกเลิก</button>
                        <button class="btn-primary" id="confirmOk" style="background: #c00;">ลบข้อมูล</button>
                    </div>
                </div>
            `;
    document.body.appendChild(overlay);

    overlay.querySelector('#confirmCancel').onclick = () => overlay.remove();
    overlay.querySelector('#confirmOk').onclick = () => {
        overlay.remove();
        deleteAllData();
    };
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
}

function deleteAllData() {
    // Clear localStorage
    localStorage.removeItem('dailyReportData');

    // Reset appData to initial state
    appData = {
        user: {
            name: '',
            role: '',
            workplace: '',
            profileImage: '',
            projectLabel: ''
        },
        projects: [],
        selectedProjects: [],
        reports: [],
        lastReportDate: null,
        onboardingComplete: false
    };

    // Reset main app initialized flag
    mainAppInitialized = false;

    // Close settings modal
    closeSettings();

    // Navigate to landing page
    navigate('/', true);

    showToast('ลบข้อมูลทั้งหมดเรียบร้อยแล้ว');
}

function goBack(shouldFocus = true) {
    document.getElementById('inputSection').classList.remove('hidden');
    document.getElementById('summarySection').classList.remove('active');
    renderProjects();
    updateSubmitButton();

    // 1. Switch visibility
    document.getElementById('summarySection').style.display = 'none';
    document.getElementById('inputSection').style.display = 'block';

    // 2. Scroll to the top of the page
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

    // 3. Focus on the template editor (only when going back to edit)
    if (shouldFocus) {
        setTimeout(() => {
            if (tasksQuill) {
                tasksQuill.focus();
            } else {
                document.getElementById('tasksTextareaFallback').focus();
            }
        }, 300);
    }
}

function handleSettingsProfileImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showToast('ขนาดไฟล์ต้องไม่เกิน 2MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        const imageData = e.target.result;
        // Compress profile image
        const compressedImage = await compressImage(imageData, 400, 0.8);
        document.getElementById('settingsProfilePreview').innerHTML = `<img src="${compressedImage}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`;
        appData.user.profileImage = compressedImage;
        saveData();
        updateNavProfile();
        updateProfileAvatar();
        showToast('อัปเดตรูปโปรไฟล์แล้ว');
    };
    reader.readAsDataURL(file);
}

function openSettings(tab = 'personal') {
    document.getElementById('settingsModal').classList.add('active');
    // Initialize template editor when modal opens
    setTimeout(() => {
        initTemplateQuill();
        resetProjectForm();
    }, 100);
    document.getElementById('settingsUserName').value = appData.user.name;
    document.getElementById('settingsUserRole').value = appData.user.role;
    document.getElementById('settingsWorkplace').value = appData.user.workplace;
    document.getElementById('settingsProjectLabel').value = appData.user.projectLabel || '';

    // Show current profile image
    if (appData.user.profileImage) {
        document.getElementById('settingsProfilePreview').innerHTML = `<img src="${appData.user.profileImage}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`;
    }

    renderProjectList();
    
    // Switch to specified tab
    switchSettingsTab(tab);
    
    // If opening projects tab, scroll to form section
    if (tab === 'projects') {
        setTimeout(() => {
            const formSection = document.getElementById('projectFormSection');
            if (formSection) {
                formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Focus on the first input
                document.getElementById('newProjectName').focus();
            }
        }, 150);
    }
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
    resetProjectForm();
}

function saveUserSettings() {
    appData.user.name = document.getElementById('settingsUserName').value || 'ผู้ใช้';
    appData.user.role = document.getElementById('settingsUserRole').value || 'พนักงาน';
    appData.user.workplace = document.getElementById('settingsWorkplace').value || 'สำนักงาน';
    appData.user.projectLabel = document.getElementById('settingsProjectLabel').value || '';
    saveData();
    updateGreeting();
    updateNavProfile();
    showToast('บันทึกข้อมูลส่วนตัวแล้ว');
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function renderProjectList() {
    const container = document.getElementById('projectList');
    container.innerHTML = '';
    appData.projects.forEach(project => {
        const item = document.createElement('div');
        item.className = 'project-item';
        const templatePreview = stripHtml(project.template || DEFAULT_TEMPLATE).substring(0, 60) + '...';
        item.innerHTML = `
                    <div class="project-info">
                        <div class="project-name">${escapeHtml(project.name)}</div>
                        <div class="project-url">${escapeHtml(project.taigaUrl || '-')}</div>
                        <div class="project-template-preview">เทมเพลต: ${escapeHtml(templatePreview)}</div>
                    </div>
                    <div class="project-actions">
                        <button class="btn-edit" onclick="editProject(${project.id})">แก้ไข</button>
                        <button class="btn-danger" onclick="deleteProject(${project.id})">ลบ</button>
                    </div>
                `;
        container.appendChild(item);
    });
    if (appData.projects.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">ยังไม่มีโครงการ</p>';
    }
}

function resetProjectForm() {
    editingProjectId = null;
    document.getElementById('projectFormTitle').textContent = 'เพิ่มโครงการใหม่';
    document.getElementById('newProjectName').value = '';
    document.getElementById('newProjectUrl').value = '';
    if (templateQuill) {
        templateQuill.setContents([]);
    } else {
        document.getElementById('templateTextareaFallback').value = '';
    }
    document.getElementById('saveProjectBtn').textContent = 'เพิ่มโครงการ';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

function editProject(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;
    editingProjectId = projectId;
    document.getElementById('projectFormTitle').textContent = 'แก้ไขโครงการ';
    document.getElementById('newProjectName').value = project.name;
    document.getElementById('newProjectUrl').value = project.taigaUrl || '';
    if (templateQuill) {
        templateQuill.root.innerHTML = project.template || DEFAULT_TEMPLATE;
    } else {
        document.getElementById('templateTextareaFallback').value = stripHtml(project.template || DEFAULT_TEMPLATE);
    }
    document.getElementById('saveProjectBtn').textContent = 'บันทึกการแก้ไข';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
    document.getElementById('projectFormTitle').scrollIntoView({ behavior: 'smooth' });
}

function cancelEditProject() {
    resetProjectForm();
}

function saveProject() {
    const name = document.getElementById('newProjectName').value.trim();
    const url = document.getElementById('newProjectUrl').value.trim();
    let template;
    if (templateQuill) {
        template = templateQuill.root.innerHTML.trim() || DEFAULT_TEMPLATE;
    } else {
        const fallbackText = document.getElementById('templateTextareaFallback').value.trim();
        template = fallbackText ? ('<p>' + fallbackText.replace(/\n/g, '</p><p>') + '</p>') : DEFAULT_TEMPLATE;
    }

    if (!name) {
        showToast('กรุณากรอกชื่อโครงการ');
        return;
    }

    if (editingProjectId !== null) {
        const projectIndex = appData.projects.findIndex(p => p.id === editingProjectId);
        if (projectIndex > -1) {
            appData.projects[projectIndex] = {
                ...appData.projects[projectIndex],
                name: name,
                taigaUrl: url,
                template: template
            };
            showToast(`แก้ไขโครงการ "${name}" แล้ว`);
        }
    } else {
        const newId = appData.projects.length > 0
            ? Math.max(...appData.projects.map(p => p.id)) + 1
            : 1;
        appData.projects.push({
            id: newId,
            name: name,
            taigaUrl: url,
            template: template
        });
        showToast(`เพิ่มโครงการ "${name}" แล้ว`);
    }

    saveData();
    renderProjectList();
    renderProjects();
    updateStats();
    resetProjectForm();
}

function deleteProject(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) {
        showToast('ไม่พบโครงการ');
        return;
    }
    if (confirm(`ต้องการลบโครงการ "${project.name}" หรือไม่?`)) {
        appData.projects = appData.projects.filter(p => p.id !== projectId);
        appData.selectedProjects = appData.selectedProjects.filter(id => id !== projectId);
        saveData();
        renderProjectList();
        renderProjects();
        updateStats();
        updateTemplate();
        if (editingProjectId === projectId) {
            resetProjectForm();
        }
        showToast('ลบโครงการแล้ว');
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

document.getElementById('settingsModal').addEventListener('click', function (e) {
    if (e.target === this) closeSettings();
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

function copyMorningTemplate(btn) {
    const today = new Date().toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Use the saved template or default
    const template = appData.morningTemplate || '{name}\nงานประจำวันที่ {date}\n- ';
    
    // Replace variables with actual values
    const name = appData.user.name || "{ชื่อ-นามสกุล}";
    const role = appData.user.role || "{ตำแหน่ง}";
    const workplace = appData.user.workplace || "{สถานที่ปฏิบัติงาน}";
    
    const templateText = template
        .replace(/\{name\}/g, name)
        .replace(/\{date\}/g, today)
        .replace(/\{role\}/g, role)
        .replace(/\{workplace\}/g, workplace);

    navigator.clipboard.writeText(templateText).then(() => {
        // Reuse the feedback logic (Change icon and text)
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span class="copy-text">คัดลอกแล้ว!</span>
        `;
        btn.classList.add('copied');

        // Revert back after 2 seconds
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('copied');
        }, 2000);
    });
}

// Morning Template Modal Functions
function openMorningTemplateModal() {
    const modal = document.getElementById('morningTemplateModal');
    modal.classList.add('active');
    
    // Load current template into textarea
    const textarea = document.getElementById('morningTemplateText');
    textarea.value = appData.morningTemplate || '{name}\nงานประจำวันที่ {date}\n- ';
    
    // Update preview
    updateMorningTemplatePreview();
    
    // Add input listener for live preview
    textarea.addEventListener('input', updateMorningTemplatePreview);
}

function closeMorningTemplateModal() {
    const modal = document.getElementById('morningTemplateModal');
    modal.classList.remove('active');
    
    // Remove input listener
    const textarea = document.getElementById('morningTemplateText');
    textarea.removeEventListener('input', updateMorningTemplatePreview);
}

function updateMorningTemplatePreview() {
    const textarea = document.getElementById('morningTemplateText');
    const preview = document.getElementById('morningTemplatePreview');
    const template = textarea.value;
    
    const today = new Date().toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    const name = appData.user.name || "สมชาย ใจดี";
    const role = appData.user.role || "เจ้าหน้าที่พัฒนาโปรแกรม";
    const workplace = appData.user.workplace || "ศูนย์เทคโนโลยีสารสนเทศ";
    
    const previewText = template
        .replace(/\{name\}/g, name)
        .replace(/\{date\}/g, today)
        .replace(/\{role\}/g, role)
        .replace(/\{workplace\}/g, workplace);
    
    preview.textContent = previewText;
}

function insertVariable(variable) {
    const textarea = document.getElementById('morningTemplateText');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const variableText = `{${variable}}`;
    
    textarea.value = text.substring(0, start) + variableText + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + variableText.length;
    
    updateMorningTemplatePreview();
}

function saveMorningTemplate() {
    const textarea = document.getElementById('morningTemplateText');
    appData.morningTemplate = textarea.value;
    saveData();
    closeMorningTemplateModal();
    showToast('บันทึกเทมเพลตรายงานตอนเช้าแล้ว');
}

function resetMorningTemplate() {
    const defaultTemplate = '{name}\nงานประจำวันที่ {date}\n- ';
    document.getElementById('morningTemplateText').value = defaultTemplate;
    updateMorningTemplatePreview();
}

// Close modal when clicking outside
document.getElementById('morningTemplateModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeMorningTemplateModal();
});

// Settings Tab Functions
function switchSettingsTab(tabName) {
    // Update nav items
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    if (tabName === 'personal') {
        document.getElementById('tabPersonal').classList.add('active');
    } else if (tabName === 'projects') {
        document.getElementById('tabProjects').classList.add('active');
    }

    // Scroll content area back to top
    const contentArea = document.querySelector('.settings-content');
    if (contentArea) {
        contentArea.scrollTop = 0;
    }
}

function saveCurrentTab() {
    const activeTab = document.querySelector('.settings-nav-item.active');
    if (activeTab && activeTab.dataset.tab === 'personal') {
        saveUserSettings();
    } else if (activeTab && activeTab.dataset.tab === 'projects') {
        saveProject();
    }
    closeSettings();
}

// ==========================================
// Image Paste/Copy Functions for Task Editor
// ==========================================

let taskImages = []; // Array to store multiple images

// Initialize image paste area
function initTaskImagePaste() {
    const pasteArea = document.getElementById('taskImagePasteArea');
    if (!pasteArea) return;

    // Click to select file
    pasteArea.addEventListener('click', (e) => {
        if (e.target.closest('.image-remove-btn')) return;
        document.getElementById('taskImageInput').click();
    });

    // Drag and drop
    pasteArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        pasteArea.classList.add('dragover');
    });

    pasteArea.addEventListener('dragleave', () => {
        pasteArea.classList.remove('dragover');
    });

    pasteArea.addEventListener('drop', (e) => {
        e.preventDefault();
        pasteArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                processTaskImage(file);
            }
        }
    });

    // Global paste listener for the page
    document.addEventListener('paste', handleGlobalPaste);
}

function handleGlobalPaste(e) {
    // Check if we're in the task editor area or modal is not open
    const settingsModal = document.getElementById('settingsModal');
    const morningModal = document.getElementById('morningTemplateModal');
    
    if (settingsModal.classList.contains('active') || morningModal.classList.contains('active')) {
        return; // Don't handle paste when modals are open
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let item of items) {
        if (item.type.startsWith('image/')) {
            e.preventDefault();
            const file = item.getAsFile();
            processTaskImage(file);
        }
    }
}

function handleTaskImageSelect(event) {
    const files = event.target.files;
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            processTaskImage(file);
        }
    }
    // Reset input so same file can be selected again
    event.target.value = '';
}

function processTaskImage(file) {
    if (file.size > 2 * 1024 * 1024) {
        showToast('ขนาดไฟล์ต้องไม่เกิน 2MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const imageData = e.target.result;
        // Compress image before storing
        const compressedImage = await compressImage(imageData, 800, 0.7);
        const imageId = Date.now() + Math.random().toString(36).substr(2, 9);
        taskImages.push({ id: imageId, data: compressedImage });
        renderTaskImageGallery();
        showToast('เพิ่มรูปภาพแล้ว');
    };
    reader.readAsDataURL(file);
}

function renderTaskImageGallery() {
    const gallery = document.getElementById('taskImageGallery');
    gallery.innerHTML = '';

    taskImages.forEach((image, index) => {
        const item = document.createElement('div');
        item.className = 'image-gallery-item';
        item.innerHTML = `
            <img src="${image.data}" alt="Image ${index + 1}">
            <button class="image-remove-btn" onclick="removeTaskImage('${image.id}')" title="ลบรูปภาพ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <button class="image-copy-btn" onclick="copySingleImage('${image.id}')" title="คัดลอกรูปภาพ">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </button>
        `;
        gallery.appendChild(item);
    });
}

function removeTaskImage(imageId) {
    taskImages = taskImages.filter(img => img.id !== imageId);
    renderTaskImageGallery();
    showToast('ลบรูปภาพแล้ว');
}

async function copySingleImage(imageId) {
    const image = taskImages.find(img => img.id === imageId);
    if (!image) return;

    try {
        const blob = await convertImageToBlob(image.data);
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('คัดลอกรูปภาพแล้ว');
    } catch (err) {
        console.error('Failed to copy image:', err);
        // Fallback: open image in new tab for manual copy
        showToast('ไม่สามารถคัดลอกอัตโนมัติได้ กรุณาคลิกขวาที่รูปเพื่อคัดลอก');
    }
}

// Convert image data to PNG blob for clipboard compatibility
function convertImageToBlob(imageData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to convert image to blob'));
                }
            }, 'image/png');
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageData;
    });
}

// ==========================================
// Image Display in Summary/Blog Section
// ==========================================

function showBlogImages() {
    const blogImageGallery = document.getElementById('blogImageGallery');

    if (taskImages.length > 0) {
        blogImageGallery.style.display = 'flex';
        blogImageGallery.innerHTML = '';
        
        taskImages.forEach((image, index) => {
            const item = document.createElement('div');
            item.className = 'blog-image-item';
            item.innerHTML = `
                <img src="${image.data}" alt="Attached Image ${index + 1}">
                <button class="image-copy-btn" onclick="copyBlogImageById('${image.id}', this)" title="คัดลอกรูปภาพ">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
            `;
            blogImageGallery.appendChild(item);
        });
    } else {
        blogImageGallery.style.display = 'none';
        blogImageGallery.innerHTML = '';
    }
}

async function copyBlogImageById(imageId, btn) {
    const image = taskImages.find(img => img.id === imageId);
    if (!image) return;

    try {
        const blob = await convertImageToBlob(image.data);
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);

        // Show feedback
        btn.classList.add('copied');
        setTimeout(() => {
            btn.classList.remove('copied');
        }, 1500);
        
        showToast('คัดลอกรูปภาพแล้ว');
    } catch (err) {
        console.error('Failed to copy image:', err);
        showToast('ไม่สามารถคัดลอกรูปภาพได้');
    }
}

async function copyAllBlogImages(btn) {
    if (taskImages.length === 0) {
        showToast('ไม่มีรูปภาพให้คัดลอก');
        return;
    }

    // Copy first image (clipboard API limitation - can only copy one image at a time)
    try {
        const blob = await convertImageToBlob(taskImages[0].data);
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);

        // Show feedback
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span class="copy-text">คัดลอกแล้ว!</span>
        `;
        btn.classList.add('copied');

        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('copied');
        }, 2000);

        if (taskImages.length > 1) {
            showToast(`คัดลอกรูปแรกแล้ว (คลิกที่รูปอื่นเพื่อคัดลอกทีละรูป)`);
        } else {
            showToast('คัดลอกรูปภาพแล้ว');
        }
    } catch (err) {
        console.error('Failed to copy image:', err);
        showToast('ไม่สามารถคัดลอกรูปภาพได้');
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initTaskImagePaste();
});