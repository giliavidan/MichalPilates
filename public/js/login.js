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
                    
                    // שמירת פרטי המשתמש ב-SessionStorage (נשמר כל עוד הדפדפן פתוח)
                    sessionStorage.setItem('userId', data.user.id); // זה המזהה שאיתו נרשמים לשיעורים (האימייל)
                    sessionStorage.setItem('userFirstName', data.user.firstName);
                    sessionStorage.setItem('userRole', data.user.role); 
                    sessionStorage.setItem('isLoggedIn', 'true');
                    
                    // שמירת סוג המנוי ב-LocalStorage (כדי שמגבלות הרישום יעבדו גם אם סוגרים את הדפדפן וחוזרים)
                    if (data.user.membershipType) {
                        localStorage.setItem('userMembershipType', data.user.membershipType);
                    }
                    
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