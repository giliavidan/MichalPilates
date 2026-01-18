// פונקציה למניעת מספרים בשם
function containsNumbers(str) {
    return /\d/.test(str);
}

// פונקציה לבדיקת תקינות כתובת אימייל 
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// פונקציה לחישוב הגיל לפי תאריך הלידה
function calculateAge(birthDateString) {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// פונקציה המציגה או מסתירה שדות הרשמה (הרגלים ומנוי) בהתאם לתפקיד שנבחר
function toggleClientFields() {
    const role = document.querySelector('input[name="userRole"]:checked').value;
    const habitsSec = document.getElementById('habitsSection');
    const memberSec = document.getElementById('membershipSection');
    
    // אם המשתמש בחר "מנהל", נסתיר את השדות. אחרת נציג אותם.
    if (role === 'admin') {
        habitsSec.style.display = 'none';
        memberSec.style.display = 'none';
    } else {
        habitsSec.style.display = 'block';
        memberSec.style.display = 'block';
    }
}

// מאזין לטעינת הדף ורק אז מריץ את ההגדרות הראשוניות
document.addEventListener('DOMContentLoaded', function () {
    const birthdateInput = document.getElementById('birthdate');
    
    // הגדרת טווח תאריכים חוקי לשדה תאריך הלידה
    if (birthdateInput) {
        const today = new Date().toISOString().split('T')[0];
        const minDate = '1925-01-01';
        birthdateInput.setAttribute('min', minDate);
        birthdateInput.setAttribute('max', today);
    }

    const passInput = document.getElementById('password');
    const confirmPassInput = document.getElementById('confirmPassword');

    // בדיקה בזמן אמת האם הסיסמאות תואמות (ושינוי צבע המסגרת בהתאם)
    if (passInput && confirmPassInput) {
        confirmPassInput.addEventListener('input', function () {
            const password = passInput.value;
            const confirmPassword = confirmPassInput.value;
            confirmPassInput.classList.remove('input-success', 'input-error');
            if (confirmPassword === '') return;
            if (password === confirmPassword) {
                confirmPassInput.classList.add('input-success');
            } else {
                confirmPassInput.classList.add('input-error');
            }
        });
    }
    
    // הפעלה ראשונית של הסתרת/הצגת שדות למקרה שהדף נטען מחדש
    toggleClientFields();
});

const registrationForm = document.getElementById('registration-Form');

// מאזין לשליחת טופס ההרשמה 
if (registrationForm) {
    registrationForm.addEventListener('submit', function (e) {
        e.preventDefault();

        //  בדיקת שדות חובה כלליים 
        const requiredIds = ['firstName', 'lastName', 'birthdate', 'phoneNumber', 'email', 'password', 'confirmPassword'];
        for (let id of requiredIds) {
            const element = document.getElementById(id);
            if (!element || !element.value) {
                const label = document.querySelector(`label[for="${id}"]`);
                const fieldName = label ? label.innerText.replace(':', '') : id;
                showMessage('נא למלא את כל שדות החובה (' + fieldName + ')');
                return;
            }
        }

        // בדיקת תפקיד נבחר
        const role = document.querySelector('input[name="userRole"]:checked').value;

        // משתנים לשדות המיוחדים
        let selectedHabits = null;
        let selectedMembership = null;

        // אם הנרשם הוא לקוח, בודקים שדות הרגלי אימון ומנוי
        if (role === 'client') {
            const habitsRadio = document.querySelector('input[name="trainingHabits"]:checked');
            if (!habitsRadio) {
                showMessage('נא לבחור הרגלי אימון');
                return;
            }
            selectedHabits = habitsRadio.value;

            const membershipRadio = document.querySelector('input[name="membershipType"]:checked');
            if (!membershipRadio) {
                showMessage('נא לבחור סוג כרטיסייה');
                return;
            }
            selectedMembership = membershipRadio.value;
        } else {
            // אם זה מנהל - נכניס ערכים ריקים או דיפולטיביים
            selectedHabits = "לא רלוונטי (מנהל)";
            selectedMembership = "admin_pass"; // או כל ערך אחר 
        }

        // המשך בדיקות רגילות
        const birthdateValue = document.getElementById('birthdate').value;
        const birthDateObj = new Date(birthdateValue);
        const selectedYear = birthDateObj.getFullYear();
        const currentYear = new Date().getFullYear();

        // בדיקה שהשנה חוקית (בין 1925 להיום)
        if (isNaN(selectedYear) || selectedYear < 1925 || selectedYear > currentYear) {
            showMessage('שנת לידה לא תקינה!');
            return;
        }

        // בדיקת גיל מינימלי (16)
        const age = calculateAge(birthdateValue);
        if (age < 16) {
            showMessage('רישום לסטודיו מגיל 16 ומעלה');
            return;
        }

        // בדיקת תקינות אימייל
        const email = document.getElementById('email').value;
        if (!isValidEmail(email)) {
            showMessage('כתובת המייל שהוזנה אינה תקינה.');
            return;
        }

        // בדיקת אורך מספר טלפון (7 ספרות ללא קידומת)
        const phoneNumber = document.getElementById('phoneNumber').value;
        if (phoneNumber.length !== 7) {
            showMessage('מספר הטלפון חייב להכיל בדיוק 7 ספרות');
            return;
        }

        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const city = document.getElementById('city').value;

        // וידוא שאין מספרים בשם הפרטי או המשפחה
        if (containsNumbers(firstName) || containsNumbers(lastName)) {
            showMessage('שם לא יכול להכיל מספרים');
            return;
        }

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // בדיקה שהסיסמאות זהות
        if (password !== confirmPassword) {
            showMessage('הסיסמאות אינן תואמות!');
            return;
        }

        // בדיקת מורכבות סיסמה (אותיות ומספרים)
        const hasLetters = /[a-zA-Z\u0590-\u05FF]/.test(password);
        const hasNumbers = /\d/.test(password);

        if (!hasLetters || !hasNumbers) {
            showMessage('הסיסמא חייבת להכיל שילוב של אותיות ומספרים!');
            return;
        }

        // יצירת האובייקט עם כל הנתונים לשליחה לשרת
        const userData = {
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName,
            phone: document.getElementById('phonePrefix').value + '-' + phoneNumber,
            birthdate: birthdateValue,
            city: city,
            trainingHabits: selectedHabits,
            membershipType: selectedMembership,
            comments: document.getElementById('comments').value,
            role: role
        };

        // שליחת בקשת הרשמה לשרת
        fetch('/registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        })
            .then(response => {
                // טיפול בתשובה מהשרת - אם ההרשמה הצליחה
                if (response.ok) {
                    showMessage('ההרשמה בוצעה בהצלחה! מועבר להתחברות');
                    const overlay = document.getElementById('global-message-overlay');
                    const okBtn = document.getElementById('global-message-ok');
                    if (overlay && okBtn) {
                        okBtn.onclick = function () {
                            overlay.classList.add('msg-hidden');
                            window.location.href = 'login.html';
                        };
                    } else {
                        window.location.href = 'login.html';
                    }
                } else {
                    // אם הייתה שגיאה בצד השרת, מציג את הודעת השגיאה
                    return response.text().then(text => { showMessage(text); });
                }
            })
            // טיפול בשגיאות תקשורת
            .catch(error => {
                console.error('Error:', error);
                showMessage('שגיאת תקשורת עם השרת');
            });
    });
}