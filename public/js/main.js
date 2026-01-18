// מאזין לטעינת הדף ומתחיל את הפעולות רק כשהדף מוכן
document.addEventListener("DOMContentLoaded", function () {

    // הגדרת משתנים למציאת המיקום של התפריט והפוטר בדף
    const navbarPlaceholder = document.getElementById("navbar-placeholder");
    const footerPlaceholder = document.getElementById("footer-placeholder");
    const loadPromises = [];

    // NAVBAR טעינת
    if (navbarPlaceholder) {
        const navPromise = fetch("navbar.html")
            .then(response => response.text())
            .then(data => {
                navbarPlaceholder.innerHTML = data;
            })
            .catch(error => console.error("Error loading navbar:", error));
        loadPromises.push(navPromise);
    }

    // Footer טעינת
    if (footerPlaceholder) {
        const footerPromise = fetch("footer.html")
            .then(response => response.text())
            .then(data => {
                footerPlaceholder.innerHTML = data;
            })
            .catch(error => console.error("Error loading footer:", error));
        loadPromises.push(footerPromise);
    }

    Promise.all(loadPromises).then(() => {
        // בודק מול השרת אם המשתמש כבר מחובר (למשל אם רענן את הדף)
        restoreSessionIfNeeded();

        // גלילה לאלמנט ספציפי אם יש בכתובת # (קישור עוגן)
        if (window.location.hash) {
            setTimeout(() => {
                const element = document.querySelector(window.location.hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }
        document.body.classList.add("page-loaded");
    });
});


// פונקציה שבודקת אם המשתמש מחובר בשרת אך לא בדפדפן
async function restoreSessionIfNeeded() {
    if (!sessionStorage.getItem("isLoggedIn")) {
        try {
            const res = await fetch('/api/check-session');
            const data = await res.json();

            // אם השרת אומר שהמשתמש מחובר, שומרים את הפרטים מחדש בדפדפן
            if (data.isLoggedIn) {
                sessionStorage.setItem('userId', data.user.id);
                sessionStorage.setItem('userFirstName', data.user.firstName);
                sessionStorage.setItem('userRole', data.user.role);
                sessionStorage.setItem('isLoggedIn', 'true');

                if (data.user.membershipType) {
                    localStorage.setItem('userMembershipType', data.user.membershipType);
                }
            }
        } catch (e) {
            // מדפיס הודעה אם לא נמצא חיבור לשחזור
            console.log("No session to restore");
        }
    }

    // מעדכן את כפתור ההתחברות/התנתקות לפי המצב החדש
    updateSingleAuthButton();
}

// פונקציה המנהלת את התצוגה והפעולה של כפתור ההתחברות בתפריט
function updateSingleAuthButton() {
    const authBtn = document.getElementById('authBtn');
    if (!authBtn) return;

    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const firstName = sessionStorage.getItem('userFirstName');

    // מצב מחובר 
    if (isLoggedIn === 'true') {
        authBtn.textContent = 'שלום, ' + firstName;
        authBtn.href = "#";

        // הגדרת פעולה בעת לחיצה על הכפתור כשהמשתמש מחובר
        authBtn.onclick = function (event) {
            event.preventDefault();

            showConfirm('האם את/ה רוצה להתנתק ?', function () {
                // שליחת בקשת התנתקות לשרת
                fetch('/logout')
                    .then(() => {
                        // מחיקת פרטי המשתמש מהזיכרון והעברה לדף הבית
                        sessionStorage.clear();
                        localStorage.removeItem('userMembershipType');
                        window.location.href = "index.html";
                    });
            });
        };

        //  מצב אורח 
        // אם המשתמש לא מחובר, הכפתור מוביל לדף ההתחברות
    } else {
        authBtn.textContent = 'הרשמה / התחברות';
        authBtn.href = "login.html";
        authBtn.onclick = null;
    }

    // מסתיר את כפתור ההתחברות אם המשתמש בדף ההתחברות
    if (document.body.id === 'page_login') {
        authBtn.style.display = 'none';
    }
}

// פונקציה להצגת הודעה מעוצבת על המסך (במקום הודעת מערכת רגילה)
function showMessage(text) {
    const overlay = document.getElementById('global-message-overlay');
    const msgText = document.getElementById('global-message-text');
    const okBtn = document.getElementById('global-message-ok');
    const cancelBtn = document.getElementById('global-message-cancel');

    if (!overlay || !msgText || !okBtn) return;

    // עדכון הטקסט של ההודעה
    msgText.textContent = text;
    if (cancelBtn) cancelBtn.style.display = 'none';
    overlay.classList.remove('msg-hidden');

    // סגירת החלונית בלחיצה על אישור
    okBtn.onclick = function () {
        overlay.classList.add('msg-hidden');
    };
}

// פונקציה להצגת הודעה שדורשת אישור או ביטול מהמשתמש
function showConfirm(text, onConfirm, onCancel) {
    const overlay = document.getElementById('global-message-overlay');
    const msgText = document.getElementById('global-message-text');
    const okBtn = document.getElementById('global-message-ok');
    const cancelBtn = document.getElementById('global-message-cancel');

    if (!overlay || !msgText || !okBtn || !cancelBtn) return;

    msgText.textContent = text;
    // מציג את כפתור הביטול כי זו הודעת אישור
    cancelBtn.style.display = 'inline-block';

    overlay.classList.remove('msg-hidden');

    // מריץ את פונקציית האישור אם המשתמש לחץ "אישור"
    okBtn.onclick = function () {
        overlay.classList.add('msg-hidden');
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    };

    // מריץ את פונקציית הביטול אם המשתמש לחץ "ביטול"
    cancelBtn.onclick = function () {
        overlay.classList.add('msg-hidden');
        if (typeof onCancel === 'function') {
            onCancel();
        }
    };
}

// הופך את הפונקציות לזמינות בכל מקום באפליקציה (גלובליות)
window.showMessage = showMessage;
window.showConfirm = showConfirm;
window.restoreSessionIfNeeded = restoreSessionIfNeeded;