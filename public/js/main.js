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
        
        // כאן אנחנו מפעילים את השינוי של הכפתור
        updateSingleAuthButton();

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
        
        // 2. ביטול הקישור הרגיל (כדי שלא יעבור לדף התחברות)
        authBtn.href = "#";

        // 3. הוספת אירוע לחיצה: שואל אם להתנתק
        authBtn.onclick = function (event) {
            event.preventDefault(); // עוצר את המעבר לדף אחר
            
            if (confirm('האם ברצונך להתנתק מהמערכת?')) {
                // מחיקת הזיכרון
                sessionStorage.clear();
                alert('התנתקת בהצלחה');
                window.location.href = "index.html"; // רענון הדף
            }
        };

    // === מצב אורח ===
    } else {
        // מחזירים את הכפתור למצב המקורי
        authBtn.textContent = 'הרשמה / התחברות';
        authBtn.href = "login.html";
        authBtn.onclick = null; // מנקים את אירוע ההתנתקות
    }

    // (אופציונלי) הסתרת הכפתור אם אנחנו כבר בתוך דף ההתחברות עצמו
    if (document.body.id === 'page_login') {
        authBtn.style.display = 'none';
    }
}