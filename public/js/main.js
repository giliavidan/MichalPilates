document.addEventListener("DOMContentLoaded", function () {

    // הגדרת משתנים לטעינת התפריט והפוטר
    const navbarPlaceholder = document.getElementById("navbar-placeholder");
    const footerPlaceholder = document.getElementById("footer-placeholder");
    const loadPromises = [];

    // --- 1. טעינת ה-Navbar ---
    if (navbarPlaceholder) {
        const navPromise = fetch("navbar.html")
            .then(response => response.text())
            .then(data => {
                navbarPlaceholder.innerHTML = data;
            })
            .catch(error => console.error("Error loading navbar:", error));
        loadPromises.push(navPromise);
    }

    // --- 2. טעינת ה-Footer ---
    if (footerPlaceholder) {
        const footerPromise = fetch("footer.html")
            .then(response => response.text())
            .then(data => {
                footerPlaceholder.innerHTML = data;
            })
            .catch(error => console.error("Error loading footer:", error));
        loadPromises.push(footerPromise);
    }

    // --- 3. סיום הטעינה ---
    Promise.all(loadPromises).then(() => {
        
        // --- השינוי הגדול: בדיקת חיבור לפני עדכון הכפתור ---
        restoreSessionIfNeeded(); 
        // ---------------------------------------------------

        // גלילה לאלמנט ספציפי אם יש בכתובת #
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

/**
 * פונקציה חדשה: משחזרת את החיבור מהשרת אם צריך
 */
async function restoreSessionIfNeeded() {
    // אם אין לנו מידע בזיכרון, ננסה לבקש מהשרת (אולי יש עוגייה)
    if (!sessionStorage.getItem("isLoggedIn")) {
        try {
            const res = await fetch('/api/check-session');
            const data = await res.json();
            
            if (data.isLoggedIn) {
                // שחזור הנתונים לזיכרון הדפדפן
                sessionStorage.setItem('userId', data.user.id);
                sessionStorage.setItem('userFirstName', data.user.firstName);
                sessionStorage.setItem('userRole', data.user.role);
                sessionStorage.setItem('isLoggedIn', 'true');
                
                if (data.user.membershipType) {
                    localStorage.setItem('userMembershipType', data.user.membershipType);
                }
            }
        } catch (e) {
            console.log("No session to restore");
        }
    }
    
    // אחרי שסיימנו לבדוק (הצלחנו או נכשלנו) - מעדכנים את הכפתור
    updateSingleAuthButton();
}

/**
 * פונקציה שמטפלת בכפתור האחד והיחיד: authBtn
 */
function updateSingleAuthButton() {
    const authBtn = document.getElementById('authBtn');
    
    // אם הכפתור לא קיים (אולי הייתה שגיאה בטעינה), נעצור
    if (!authBtn) return;

    // בדיקת נתונים בזיכרון
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const firstName = sessionStorage.getItem('userFirstName');

    // === מצב מחובר ===
    if (isLoggedIn === 'true') {
        // 1. שינוי הטקסט
        authBtn.textContent = 'שלום, ' + firstName;
        
        // 2. ביטול הקישור הרגיל
        authBtn.href = "#";

        // 3. הוספת אירוע לחיצה: שואל ומתנתק מיד
        authBtn.onclick = function (event) {
            event.preventDefault(); 
            
            // השאלה היחידה שמופיעה
            if (confirm('האם אתה רוצה להתנתק מהמשתמש ?')) {
                
                // שליחת בקשה לשרת למחיקת העוגייה
                fetch('/logout')
                    .then(() => {
                        // מחיקת הזיכרון (session + local)
                        sessionStorage.clear();
                        localStorage.removeItem('userMembershipType'); 
                        
                        // מעבר מיידי לדף ההתחברות או הבית
                        window.location.href = "index.html"; 
                    });
            }
        };

    // === מצב אורח ===
    } else {
        // מחזירים את הכפתור למצב המקורי
        authBtn.textContent = 'הרשמה / התחברות';
        authBtn.href = "login.html";
        authBtn.onclick = null; 
    }

    // (אופציונלי) הסתרת הכפתור אם אנחנו כבר בתוך דף ההתחברות עצמו
    if (document.body.id === 'page_login') {
        authBtn.style.display = 'none';
    }
}