document.addEventListener('DOMContentLoaded', function() {
    
    const loginForm = document.getElementById('loginForm');

    // מוודאים שהטופס קיים לפני שמוסיפים לו מאזין
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault(); // מונע רענון של הדף

            // 1. לוקחים את הערכים שהמשתמש הזין
            const inputEmail = document.getElementById('email').value;
            const inputPassword = document.getElementById('password').value;

            // 2. שולחים בקשה לשרת
            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email: inputEmail, 
                    password: inputPassword 
                })
            })
            .then(response => response.json())
            .then(data => {
                // 3. השרת החזיר תשובה. בואי נבדוק אם ההתחברות הצליחה
                if (data.success) {
                    
                    // שמירת פרטי המשתמש בדפדפן (כדי שנזכור מי מחובר)
                    // --- התיקון כאן: הוספנו את שמירת ה-ID והמנוי ---
                    sessionStorage.setItem('userId', data.user.id); // קריטי להרשמה!
                    sessionStorage.setItem('userFirstName', data.user.firstName);
                    sessionStorage.setItem('userRole', data.user.role); 
                    sessionStorage.setItem('isLoggedIn', 'true');
                    
                    // נשמור גם את סוג המנוי ל-LocalStorage כדי שהמגבלות יעבדו
                    if (data.user.membershipType) {
                        localStorage.setItem('userMembershipType', data.user.membershipType);
                    }
                    // ------------------------------------------------

                    alert('היי ' + data.user.firstName + ', התחברת בהצלחה!');

                    // הפניה לדף הבית
                    window.location.href = "index.html"; 
                } else {
                    // השרת אמר שהסיסמה או האימייל לא נכונים
                    alert(data.message); 
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('שגיאת תקשורת עם השרת');
            });
        });
    }
});