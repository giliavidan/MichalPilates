// משתנים גלובליים לניהול מצב התצוגה 
let currentWeekOffset = 0;
let fetchedClasses = [];
let currentManagingClassId = null;
let maxClassDate = null;
let allUsersGlobal = [];

const role = sessionStorage.getItem('userRole');
const isAdmin = (role === 'admin');

// בודק אם הכתובת מכילה תאריך ספציפי ומכוון את התצוגה לשבוע הרלוונטי
function checkUrlForDate() {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');

    if (dateParam) {
        const targetDate = new Date(dateParam);
        const today = new Date();

        targetDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const targetSunday = new Date(targetDate);
        targetSunday.setDate(targetDate.getDate() - targetDate.getDay());

        const currentSunday = new Date(today);
        currentSunday.setDate(today.getDate() - today.getDay());

        const diffTime = targetSunday - currentSunday;
        const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));

        currentWeekOffset = diffWeeks;
    }
}

checkUrlForDate();

// מאזין לטעינת הדף: טוען נתונים ראשוניים ומגדיר אירועים לכפתורים
document.addEventListener('DOMContentLoaded', function () {
    loadMaxClassDate().then(() => {
        loadData();
    });

    const addBtn = document.getElementById('btn-add-class-mode');
    if (addBtn) addBtn.onclick = () => openModal();

    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    if (startTimeInput && endTimeInput) {
        startTimeInput.addEventListener('change', function () {
            if (!this.value) return;
            const [hours, minutes] = this.value.split(':').map(Number);
            let endHours = (hours + 1) % 24;
            const formattedEnd = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            endTimeInput.value = formattedEnd;
        });
    }
});

// פונקציית עזר לפרמוט תאריך עבור שדות קלט (type="date")
function formatDateForInput(dateData) {
    if (!dateData) return new Date().toISOString().split('T')[0];
    if (typeof dateData === 'string' && dateData.length === 10 && !dateData.includes('T')) return dateData;
    const d = new Date(dateData);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// טוען מהשרת את התאריך הכי רחוק שיש בו שיעורים (כדי למנוע דפדוף אינסופי)
async function loadMaxClassDate() {
    try {
        const res = await fetch('/api/max-class-date');
        const data = await res.json();
        if (data.maxDate) {
            maxClassDate = data.maxDate;
        } else {
            maxClassDate = null;
        }
    } catch (e) {
        maxClassDate = null;
    }
}

// טוען את כל השיעורים וההודעות מהשרת במקביל ומרענן את התצוגה
function loadData() {
    const uId = sessionStorage.getItem('userId') || 0;
    Promise.all([
        fetch(`/classes?userId=${uId}`).then(res => res.json()),
        fetch('/messages').then(res => res.json())
    ]).then(([classesData, messagesData]) => {
        fetchedClasses = classesData;
        renderSchedule(fetchedClasses, messagesData);

        if (isAdmin && currentManagingClassId) {
            loadManagerData(currentManagingClassId);
        }
    }).catch(err => console.error("Error loading data:", err));
}

// פונקציה שמציגה את מערכת השעות בעמוד בהתאם לשיעורים והודעות
function renderSchedule(classes, notices) {
    const noticesContainer = document.getElementById('notices-container');
    if (noticesContainer) {
        noticesContainer.innerHTML = '';
        if (isAdmin) {
            noticesContainer.innerHTML += `
                <div class="admin-notice-controls mb-3">
                    <input type="text" id="newNoticeInput" placeholder="הודעה חדשה..." class="form-control d-inline-block w-75">
                    <button class="btn btn-primary btn-sm" onclick="addNewNotice()">פרסם</button>
                </div>`;
        }
        notices.forEach(notice => {
            let html = `<span>${notice.content}</span>`;
            if (isAdmin) html += `<button class="btn btn-sm btn-danger ms-2" onclick="deleteMessage(${notice.id})">X</button>`;
            const div = document.createElement('div');
            div.className = 'notice-item alert alert-info d-flex justify-content-between align-items-center';
            div.innerHTML = html;
            noticesContainer.appendChild(div);
        });
    }

    const addClassBtn = document.getElementById('btn-add-class-mode');
    if (addClassBtn) addClassBtn.style.display = isAdmin ? 'block' : 'none';

    // לוגיקה לכפתור "צור שבוע הבא" למנהלים
    const genNextWeekBtn = document.getElementById('btn-generate-next-week');
    if (genNextWeekBtn) {
        genNextWeekBtn.style.display = isAdmin ? 'block' : 'none';
        genNextWeekBtn.onclick = () => {
            showConfirm(
                'האם ליצור מערכת שעות לשבוע המוצג כעת?',
                function onConfirm() {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const baseDate = new Date(today);
                    baseDate.setDate(today.getDate() + (currentWeekOffset * 7));
                    const dayIndex = baseDate.getDay();
                    const startOfWeek = new Date(baseDate);
                    startOfWeek.setDate(baseDate.getDate() - dayIndex);

                    const y = startOfWeek.getFullYear();
                    const m = String(startOfWeek.getMonth() + 1).padStart(2, '0');
                    const d = String(startOfWeek.getDate()).padStart(2, '0');
                    const formattedStartDate = `${y}-${m}-${d}`;

                    fetch('/admin/generate-week-range', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            startDate: formattedStartDate
                        })
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                loadMaxClassDate().then(() => loadData());
                            } else {
                                showMessage(data.message || 'שגיאה ביצירת מערכת השעות לשבוע זה');
                            }
                        })
                        .catch(() => {
                            showMessage('שגיאה ביצירת מערכת השעות לשבוע זה');
                        });
                }
            );
        };
    }

    setWeeklyDates();
    updateNextWeekButtonVisibility();

    // ניקוי התוכן הקיים בעמודות הימים
    for (let i = 0; i <= 5; i++) {
        const el = document.getElementById(`day-content-${i}`);
        if (el) {
            el.innerHTML = '';
        }
    }

    const loggedUserId = sessionStorage.getItem('userId');
    const membershipType = localStorage.getItem('userMembershipType') || 'guest';
    const canSeeZoomLink =
        membershipType === 'gym_1perweek' ||
        membershipType === 'gym_2perweek' ||
        membershipType === 'zoom';

    // לולאה ראשית למילוי השיעורים בכל יום
    for (let i = 0; i <= 5; i++) {
        const dayContainer = document.getElementById(`day-content-${i}`);
        if (!dayContainer) continue;

        const columnDayName = dayContainer.getAttribute('data-dayname');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const base = new Date(today);
        base.setDate(today.getDate() + (currentWeekOffset * 7));
        const dayIndexView = base.getDay();
        const startOfWeekView = new Date(base);
        startOfWeekView.setDate(base.getDate() - dayIndexView);

        const endOfWeekView = new Date(startOfWeekView);
        endOfWeekView.setDate(startOfWeekView.getDate() + 6);
        endOfWeekView.setHours(23, 59, 59, 999);

        // סינון השיעורים ששייכים ליום ולשבוע הנוכחי
        const relevantClasses = classes
            .filter(c => {
                const cDate = new Date(c.class_date);
                return (
                    c.day_of_week === columnDayName &&
                    cDate >= startOfWeekView &&
                    cDate <= endOfWeekView
                );
            })
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

        relevantClasses.forEach(cls => {
            const isZoom = !!cls.zoom;
            const userStatus = cls.user_status;
            const currentCount = parseInt(cls.current_participants || 0);
            const maxCount = parseInt(cls.max_participants || 0);
            const isFull = currentCount >= maxCount;

            const waitlistCount = cls.waitlist_count || 0;
            const myPos = cls.waitlist_position || 0;

            //בדיקה האם השיעור בעבר 
            const now = new Date();
            const [y, m, d] = cls.class_date.split('-').map(Number);
            const [h, min] = cls.start_time.split(':').map(Number);
            const classStart = new Date(y, m - 1, d, h, min);
            const isPast = classStart < now;

            let waitlistInfoHtml = '';

            // הצגת מידע על רשימת המתנה אם יש ממתינים
            if (waitlistCount > 0) {
                let displayText = '';
                if (userStatus === 'waitlist') {
                    displayText = `${myPos}/${waitlistCount} ברשימת המתנה`;
                } else {
                    displayText = `${waitlistCount} ברשימת המתנה`;
                }

                waitlistInfoHtml = `
                    <div class="waitlist-status-row participants-tooltip-container" onmouseenter="showWaitlistParticipants(this, ${cls.id})">
                        <i class="far fa-clock"></i> 
                        <span>${displayText}</span>
                        <div class="participants-tooltip">טוען...</div>
                    </div>
                `;
            }

            let actionHtml = '';

            // הגדרת הכפתורים (הרשמה/ביטול/עריכה) לפי סוג משתמש ומצב שיעור
            if (isAdmin) {
                actionHtml = `
                    <div class="admin-actions">
                        <button class="btn-admin-edit" onclick="event.stopPropagation(); openModal(${cls.id})">עריכה</button>
                        <button class="btn-admin-delete" onclick="event.stopPropagation(); deleteClass(${cls.id})">מחיקה</button>
                    </div>`;
            } else {
                if (!loggedUserId) {
                    actionHtml = '';
                } else {
                    // --- לוגיקת כפתורים לשיעורי עבר ---
                    // מגדירים את הפעולות כברירת מחדל
                    let clickCancel = `cancelRegistration(${cls.id})`;
                    let clickRegister = `registerForClass(${cls.id}, false)`;
                    let clickWaitlist = `registerForClass(${cls.id}, true)`;

                    // אם השיעור בעבר - דורסים את הפעולה עם הודעת שגיאה
                    if (isPast) {
                        clickCancel = "showMessage('לא ניתן לבטל שיעור שהסתיים')";
                        clickRegister = "showMessage('לא ניתן להירשם לשיעור שהסתיים')";
                        clickWaitlist = "showMessage('לא ניתן להירשם לשיעור שהסתיים')";
                    }

                    if (userStatus === 'registered') {
                        // כפתור אדום - נשאר, אבל הפעולה משתנה אם זה בעבר
                        actionHtml = `<button class="register-btn registered" onclick="${clickCancel}">רשום ✓ (ביטול)</button>`;
                    } else if (userStatus === 'waitlist') {
                        // כפתור המתנה - נשאר
                        actionHtml = `<button class="register-btn-waitlist" onclick="${clickCancel}">ביטול המתנה</button>`;
                    } else {
                        // כפתור הרשמה
                        if (isFull) {
                            actionHtml = `<button class="register-btn-waitlist" onclick="${clickWaitlist}">הרשמה להמתנה</button>`;
                        } else {
                            actionHtml = `<button class="register-btn" onclick="${clickRegister}">הרשמה לשיעור</button>`;
                        }
                    }
                }
            }

           let zoomHtml = '';
            // בדיקה האם להציג קישור זום
            if (isZoom && loggedUserId && (canSeeZoomLink || isAdmin)) {
                zoomHtml = `
                    <a href="https://us02web.zoom.us/j/3430100607"
                       target="_blank"
                       class="zoom-tag"
                       onclick="event.stopPropagation()">
                       ZOOM
                    </a>`;
            }

            // יצירת התצוגה של כמות המשתתפים
            const countDisplay = `
                <span class="participants-tooltip-container" onmouseenter="showParticipants(this, ${cls.id})">
                    <i class="fas fa-users"></i> ${currentCount}/${maxCount}
                    <div class="participants-tooltip">טוען...</div>
                </span>
            `;

            // יצירת האלמנט הראשי שיכיל את כרטיסיית השיעור
            const card = document.createElement('div');
            card.className = 'class-card';

            // למנהל: הוספת אפקט ריחוף ולחיצה לפתיחת ניהול השיעור
            if (isAdmin) {
                card.classList.add('admin-hover');
                card.style.cursor = 'pointer';
                card.onclick = () => openClassManager(cls.id);
                card.setAttribute('title', 'לחצי לפתיחת ניהול משתתפים');
            }

            // יצירת מחרוזת השעות (התחלה וסיום) בפורמט קצר 
            const timeRange = `${cls.start_time.substring(0, 5)} - ${cls.end_time.substring(0, 5)}`;

            // מילוי תוכן הכרטיסייה
            card.innerHTML = `
                <div class="class-time fw-bold" style="direction:ltr;">${timeRange}</div>
                <div class="class-name">${cls.class_name}</div>
                <div class="class-instructor small text-muted">${cls.instructor}</div>
                
                <div class="class-details mt-1 d-flex flex-column justify-content-center align-items-center">
                    <div class="d-flex justify-content-between w-100 align-items-center">
                        ${countDisplay}
                        ${zoomHtml}
                    </div>
                    ${waitlistInfoHtml}
                </div>

                <div class="class-admin-actions-row">
                    ${actionHtml}
                </div>
            `;
            // הוספת הכרטיסייה בלוח השנה
            dayContainer.appendChild(card);
        });
    }
}

// מנהל

// פותח את ממשק הניהול של שיעור ספציפי (להוספה/הסרה של מתאמנים)
function openClassManager(classId) {
    if (!isAdmin) return;

    currentManagingClassId = classId;
    const cls = fetchedClasses.find(c => c.id === classId);

    let israeliDate = cls.class_date;
    let realDayName = "";

    if (cls.class_date && cls.class_date.includes('-')) {
        const parts = cls.class_date.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);

        israeliDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

        const dateObj = new Date(year, month, day);
        const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        realDayName = days[dateObj.getDay()];
    } else {
        realDayName = cls.day_of_week;
    }

    document.getElementById('manager-class-name').innerText = cls.class_name;
    document.getElementById('manager-class-time').innerText =
        `יום ${realDayName} | ${israeliDate} | ${cls.start_time.substring(0, 5)}`;

    const managerDiv = document.getElementById('admin-class-manager');
    managerDiv.style.display = 'block';
    managerDiv.scrollIntoView({ behavior: 'smooth' });

    const triggerText = document.getElementById('selected-user-text');
    if (triggerText) {
        triggerText.innerText = "-- בחר/י מתאמן להוספה --";
        triggerText.style.fontWeight = 'normal';
        triggerText.style.color = 'inherit';
    }

    fetch('/all-users')
        .then(res => res.json())
        .then(users => {
            allUsersGlobal = users;
            renderUserSelect(users);
        });

    loadManagerData(classId);
}

// טוען את רשימת הנרשמים והממתינים לשיעור הנבחר
function loadManagerData(classId) {
    fetch(`/class-participants/${classId}`)
        .then(res => res.json())
        .then(participants => {
            const regList = document.getElementById('list-registered');
            const waitList = document.getElementById('list-waitlist');
            regList.innerHTML = '';
            waitList.innerHTML = '';

            let regCount = 0;
            let waitCount = 0;

            participants.forEach(p => {
                const li = document.createElement('li');
                li.className = 'list-group-item';

                const deleteBtn = `<button class="btn-remove-user" onclick="adminRemoveUser('${p.email}', ${classId})" title="הסר מהשיעור">X</button>`;

                li.innerHTML = `
                    <span>${p.first_name} ${p.last_name}</span>
                    ${deleteBtn}
                `;

                if (p.status === 'registered') {
                    regList.appendChild(li);
                    regCount++;
                } else {
                    waitList.appendChild(li);
                    waitCount++;
                }
            });

            document.getElementById('count-registered').innerText = regCount;
            document.getElementById('count-waitlist').innerText = waitCount;
        });
}

// מנהל: מסיר מתאמן ספציפי מהשיעור
function adminRemoveUser(userEmail, classId) {
    showConfirm('האם להסיר את המתאמן מהשיעור?', function () {
        fetch('/cancel-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userEmail, classId: classId })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadData();
                } else {
                    showMessage('שגיאה במחיקה');
                }
            });
    });
}

// מתאמן

// מבצע רישום של המשתמש לשיעור (כולל בדיקות מנוי ומגבלות)
function registerForClass(classId, isWaitlist) {
    const uId = sessionStorage.getItem('userId');
    
    // האם המשתמש מחובר? אם לא - מפנה לדף התחברות
    if (!uId) {
        showConfirm('יש להתחבר כדי להירשם. לעבור להתחברות?', function () {
            window.location.href = 'login.html';
        });
        return;
    }

    const classItem = fetchedClasses.find(c => c.id === classId);
    if (!classItem) return;

    const membershipType = localStorage.getItem('userMembershipType') || 'guest';
    const isZoomClass = !!classItem.zoom;

    // טיפול במנויי זום - חסימת רישום 
    if (membershipType === 'zoom') {
        if (isZoomClass) {
            showMessage("מנוי זום לא צריך להירשם לשיעור.\nתיכנס לשיעור 5 דקות לפני שהשיעור מתחיל");
        } else {
            showMessage('המנוי שלך הוא לזום בלבד.');
        }
        return;
    }

    let weeklyLimit = Infinity;
    if (membershipType === 'gym_1perweek') weeklyLimit = 1;
    if (membershipType === 'gym_2perweek') weeklyLimit = 2;

    // בדיקת מכסת שיעורים שבועית (למנויים מוגבלים) - ספירה וחסימה אם חרגו
    if (weeklyLimit !== Infinity) {
        const targetDate = new Date(classItem.class_date);
        const dayOfTarget = targetDate.getDay();
        const startOfWeek = new Date(targetDate);
        startOfWeek.setDate(targetDate.getDate() - dayOfTarget);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        let registeredCount = 0;
        fetchedClasses.forEach(c => {
            if (c.user_status === 'registered') {
                const cDate = new Date(c.class_date);
                if (cDate >= startOfWeek && cDate <= endOfWeek) {
                    registeredCount++;
                }
            }
        });

        if (registeredCount >= weeklyLimit) {
            showMessage(`הגעת למכסת השיעורים השבועית שלך (${weeklyLimit} בשבוע).\nלא ניתן להירשם לשיעור נוסף השבוע.`);
            return;
        }
    }

    // אם כל הבדיקות עברו תקין, שולחים את הבקשה לשרת
    fetch('/register-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uId, classId: classId })
    })
        .then(res => res.json())
        .then(data => {
            showMessage(data.message);
            if (data.success) {
                loadData();
            }
        });
}

// מבטל רישום לשיעור
function cancelRegistration(classId) {
    const uId = sessionStorage.getItem('userId');
    showConfirm('לבטל את הרישום?', function () {
        fetch('/cancel-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uId, classId: classId })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadData();
                } else {
                    showMessage('שגיאה בביטול');
                }
            });
    });
}

// מציג את רשימת המשתתפים בחלונית צפה 
function showParticipants(element, classId) {
    const tooltip = element.querySelector('.participants-tooltip');
    if (tooltip.dataset.loaded === "true") return;

    fetch(`/class-participants/${classId}`)
        .then(res => res.json())
        .then(users => {
            const registeredOnly = users.filter(u => u.status === 'registered');

            if (registeredOnly.length === 0) {
                tooltip.innerHTML = "אין רשומים עדיין";
            } else {
                const names = registeredOnly.map(u => `<div>${u.first_name} ${u.last_name}</div>`).join('');
                tooltip.innerHTML = names;
            }
            tooltip.dataset.loaded = "true";
        })
        .catch(() => {
            tooltip.innerHTML = "שגיאה בטעינה";
        });
}

// מציג את רשימת ההמתנה בחלונית צפה 
function showWaitlistParticipants(element, classId) {
    const tooltip = element.querySelector('.participants-tooltip');
    if (tooltip.dataset.loaded === "true") return;

    fetch(`/class-participants/${classId}`)
        .then(res => res.json())
        .then(users => {
            // מסננים רק את רשימת ההמתנה
            const waitlistOnly = users.filter(u => u.status === 'waitlist');

            if (waitlistOnly.length === 0) {
                tooltip.innerHTML = "רשימת המתנה ריקה";
            } else {
                // מציגים רשימה ממוספרת לפי הסדר
                const names = waitlistOnly.map((u, index) => `<div>${index + 1}. ${u.first_name} ${u.last_name}</div>`).join('');
                tooltip.innerHTML = names;
            }
            tooltip.dataset.loaded = "true";
        })
        .catch(() => {
            tooltip.innerHTML = "שגיאה בטעינה";
        });
}

// חישוב שבוע וציון שם היום לכל עמודה 

// מעדכן את התאריכים המוצגים בכותרות של כל יום בשבוע
function setWeeklyDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentViewDate = new Date(today);
    currentViewDate.setDate(today.getDate() + (currentWeekOffset * 7));

    const dayIndex = currentViewDate.getDay();
    const startOfWeek = new Date(currentViewDate);
    startOfWeek.setDate(currentViewDate.getDate() - dayIndex);

    const daysNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

    for (let i = 0; i < 6; i++) {
        let loopDate = new Date(startOfWeek);
        loopDate.setDate(startOfWeek.getDate() + i);
        let dateStringDisplay = loopDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
        let element = document.getElementById(`date-${i}`);
        if (element) element.textContent = dateStringDisplay;
        const formattedDate = formatDateForInput(loopDate);
        const dayContent = document.getElementById(`day-content-${i}`);
        if (dayContent) {
            dayContent.setAttribute('data-date', formattedDate);
            dayContent.setAttribute('data-dayname', daysNames[i]);
        }
    }
}

// מחליף שבוע קדימה או אחורה ומעדכן את הנתונים
function changeWeek(direction) {
    if (!isAdmin && direction > 0 && maxClassDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const targetViewDate = new Date(today);
        targetViewDate.setDate(today.getDate() + ((currentWeekOffset + direction) * 7));

        const targetStr = formatDateForInput(targetViewDate);
        if (targetStr > maxClassDate) {
            return;
        }
    }

    currentWeekOffset += direction;
    loadData();
}

// מחזיר את התצוגה לשבוע הנוכחי
function goToCurrentWeek() {
    currentWeekOffset = 0;
    loadData();
}

// מסתיר את כפתור "שבוע הבא" למשתמשים אם אין שם שיעורים
function updateNextWeekButtonVisibility() {
    const nextBtn = document.getElementById('btn-next-week');
    if (!nextBtn) return;

    if (isAdmin) {
        nextBtn.style.display = 'inline-block';
        return;
    }

    if (!maxClassDate) {
        nextBtn.style.display = 'none';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentViewDate = new Date(today);
    currentViewDate.setDate(today.getDate() + (currentWeekOffset * 7));

    const dayIndex = currentViewDate.getDay();
    const startOfWeek = new Date(currentViewDate);
    startOfWeek.setDate(currentViewDate.getDate() - dayIndex);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const endOfWeekStr = formatDateForInput(endOfWeek);

    if (endOfWeekStr >= maxClassDate) {
        nextBtn.style.display = 'none';
    } else {
        nextBtn.style.display = 'inline-block';
    }
}

// מנהל

// פותח את המודל להוספה או עריכה של שיעור
function openModal(classId = null) {
    const modalElement = document.getElementById('classModal');
    const modalTitle = document.getElementById('modalTitle');
    const dateInput = document.getElementById('classDate');
    const daySelect = document.getElementById('classDay');
    document.getElementById('formClass').reset();

    if (classId) {
        modalTitle.innerText = "עריכת שיעור";
        const cls = fetchedClasses.find(c => c.id === classId);
        document.getElementById('classId').value = cls.id;
        document.getElementById('className').value = cls.class_name;
        dateInput.value = formatDateForInput(cls.class_date);
        daySelect.value = cls.day_of_week;
        document.getElementById('startTime').value = cls.start_time.substring(0, 5);
        document.getElementById('endTime').value = cls.end_time.substring(0, 5);
        document.getElementById('maxParticipants').value = cls.max_participants;
        document.getElementById('isZoom').checked = cls.zoom;
    } else {
        modalTitle.innerText = "הוספת שיעור חדש";
        document.getElementById('classId').value = "";

        const today = new Date();
        dateInput.value = formatDateForInput(today);

        const daysNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        const todayName = daysNames[today.getDay()];
        daySelect.value = todayName;

        document.getElementById('maxParticipants').value = 8;
    }

    const daysNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    dateInput.onchange = function () {
        if (!this.value) return;
        const d = new Date(this.value);
        const dayName = daysNames[d.getDay()];
        daySelect.value = dayName;
    };

    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// שולח את נתוני הטופס (יצירה/עדכון שיעור) לשרת
function submitClassForm() {
    const classId = document.getElementById('classId').value;
    const classData = {
        id: classId,
        className: document.getElementById('className').value,
        classDate: document.getElementById('classDate').value,
        dayOfWeek: document.getElementById('classDay').value,
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        maxParticipants: document.getElementById('maxParticipants').value,
        instructor: 'מיכל',
        zoom: document.getElementById('isZoom').checked
    };
    const url = classId ? '/update-class' : '/add-class';
    const method = classId ? 'PUT' : 'POST';
    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classData)
    })
        .then(res => res.json()).then(data => {
            if (data.success) {
                const modalEl = document.getElementById('classModal');
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) modalInstance.hide();
                loadData();
            } else {
                showMessage('שגיאה');
            }
        });
}

// מוחק שיעור מהמערכת
function deleteClass(id) {
    showConfirm('האם למחוק את השיעור הזה?', function () {
        fetch(`/delete-class/${id}`, { method: 'DELETE' }).then(res => res.json()).then(data => {
            if (data.success) loadData(); else showMessage('שגיאה');
        });
    });
}

// מוסיף הודעה חדשה ללוח המודעות
function addNewNotice() {
    const content = document.getElementById('newNoticeInput').value;
    if (!content) return;
    fetch('/add-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    }).then(() => {
        document.getElementById('newNoticeInput').value = '';
        loadData();
    });
}

// מוחק הודעה מלוח המודעות
function deleteMessage(id) {
    showConfirm('האם למחוק את ההודעה מהלוח?', function () {
        fetch(`/delete-message/${id}`, { method: 'DELETE' }).then(() => loadData());
    });
}

// פותח/סוגר את תפריט חיפוש המשתמשים בניהול השיעור
function toggleUserDropdown() {
    const container = document.getElementById('custom-dropdown-container');
    const input = document.getElementById('user-search-input');

    if (container.style.display === 'none') {
        container.style.display = 'block';
        input.focus();
        input.value = '';
        filterUsersList();
    } else {
        container.style.display = 'none';
    }
}

// בוחר משתמש מרשימת החיפוש ומציג אותו
function selectUserFromList() {
    const select = document.getElementById('all-users-select');
    const triggerText = document.getElementById('selected-user-text');
    const container = document.getElementById('custom-dropdown-container');

    const selectedOption = select.options[select.selectedIndex];

    if (selectedOption && selectedOption.value) {
        triggerText.innerText = selectedOption.innerText;
        triggerText.style.fontWeight = 'bold';
        triggerText.style.color = '#000';
        container.style.display = 'none';
    }
}

// מוסיף משתמש ידנית לשיעור (מטפל גם בהוספה להמתנה אם מלא)
function adminAddUserToClass(forceWaitlist = false) {
    const select = document.getElementById('all-users-select');
    const userEmail = select.value;

    if (!userEmail) {
        showMessage('יש לבחור מתאמן מהרשימה');
        return;
    }
    if (!currentManagingClassId) return;

    fetch('/admin-add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: userEmail,
            classId: currentManagingClassId,
            asWaitlist: forceWaitlist 
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showMessage(data.message);
                loadData();

                select.value = "";
                const triggerText = document.getElementById('selected-user-text');
                if (triggerText) {
                    triggerText.innerText = "-- בחר/י מתאמן להוספה --";
                    triggerText.style.fontWeight = 'normal';
                }

            } else {
                // זיהוי אם השיעור מלא
                if (data.code === 'CLASS_FULL') {
                    showConfirm(data.message, function () {
                        // אם המנהלת לחצה "אישור" מעבירים להמתנה
                        adminAddUserToClass(true);
                    });
                } else {
                    showMessage(data.message);
                }
            }
        });
}

// בונה את רשימת המשתמשים 
function renderUserSelect(usersList) {
    const select = document.getElementById('all-users-select');
    select.innerHTML = '';

    if (usersList.length === 0) {
        const option = document.createElement('option');
        option.text = "לא נמצאו תוצאות";
        select.add(option);
        return;
    }

    usersList.forEach(u => {
        const option = document.createElement('option');
        option.value = u.email;
        option.innerText = `${u.first_name} ${u.last_name} (${u.phone || u.email})`;
        select.appendChild(option);
    });
}

// מסנן את רשימת המשתמשים לפי טקסט החיפוש
function filterUsersList() {
    const input = document.getElementById('user-search-input');
    const filter = input.value.toLowerCase();

    const filteredUsers = allUsersGlobal.filter(u => {
        const fullName = (u.first_name + ' ' + u.last_name).toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        return fullName.includes(filter) || phone.includes(filter);
    });

    renderUserSelect(filteredUsers);
}

// סוגר את רשימת החיפוש אם לוחצים מחוץ לה
document.addEventListener('click', function (event) {
    const wrapper = document.querySelector('.select-wrapper');
    const container = document.getElementById('custom-dropdown-container');

    if (wrapper && container && container.style.display === 'block' && !wrapper.contains(event.target)) {
        container.style.display = 'none';
    }
});