// מאזין לטעינת הדף במלואו לפני הרצת הסקריפט
document.addEventListener('DOMContentLoaded', function () {

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // האזנה לאירוע של שליחת הטופס (לחיצה על כפתור התחברות)
        loginForm.addEventListener('submit', function (e) {
            
            e.preventDefault();

            const inputEmail = document.getElementById('email').value;
            const inputPassword = document.getElementById('password').value;

            // שליחת בקשת התחברות לשרת עם הנתונים בפורמט 
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
                    // בדיקה האם ההתחברות הצליחה ושמירת הפרטים
                    if (data.success) {
                        sessionStorage.setItem('userId', data.user.id);
                        sessionStorage.setItem('userFirstName', data.user.firstName);
                        sessionStorage.setItem('userRole', data.user.role);
                        sessionStorage.setItem('isLoggedIn', 'true');

                        // בדיקה אם קיים סוג מנוי למשתמש ושמירתו בזיכרון הקבוע
                        if (data.user.membershipType) {
                            localStorage.setItem('userMembershipType', data.user.membershipType);
                        }

                        // הצגת הודעת הצלחה למשתמש
                        showMessage('היי ' + data.user.firstName + ', התחברת בהצלחה!');

                        // מעבר לדף הבית 
                        setTimeout(() => {
                            window.location.href = "index.html";
                        }, 1200);
                    } else {
                        // הצגת הודעת שגיאה אם הסיסמה או האימייל לא נכונים
                        showMessage(data.message || 'שם משתמש או סיסמה שגויים.');
                    }
                })
                // טיפול במקרה של שגיאת תקשורת עם השרת
                .catch(error => {
                    console.error('Error:', error);
                    showMessage('שגיאת תקשורת עם השרת');
                });
        });
    }
});