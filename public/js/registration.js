function containsNumbers(str) {
    return /\d/.test(str);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Function to calculate age based on birthdate
function calculateAge(birthDateString) {
    const today = new Date();
    const birthDate = new Date(birthDateString);

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Check if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Page Load & Initial Settings 
document.addEventListener('DOMContentLoaded', function () {

    // Restrict birth year range
    const birthdateInput = document.getElementById('birthdate');
    if (birthdateInput) {
        const today = new Date().toISOString().split('T')[0]; // Current date in yyyy-mm-dd format
        const minDate = '1925-01-01';
        birthdateInput.setAttribute('min', minDate);
        birthdateInput.setAttribute('max', today);
    }

    // Real-time password validation (Live feedback)
    const passInput = document.getElementById('password');
    const confirmPassInput = document.getElementById('confirmPassword');

    if (passInput && confirmPassInput) {
        confirmPassInput.addEventListener('input', function () {
            const password = passInput.value;
            const confirmPassword = confirmPassInput.value;

            // Reset classes (clear previous state)
            confirmPassInput.classList.remove('input-success', 'input-error');

            // Do nothing if the field is empty
            if (confirmPassword === '') {
                return;
            }

            // Check for match
            if (password === confirmPassword) {
                confirmPassInput.classList.add('input-success');
            } else {
                confirmPassInput.classList.add('input-error');
            }
        });
    }
});

// Main Script

const registrationForm = document.getElementById('registration-Form');

if (registrationForm) {
    registrationForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // Required fields validation (Loop)
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

        // Validate training habits selection
        if (!document.querySelector('input[name="trainingHabits"]:checked')) {
            showMessage('נא לבחור הרגלי אימון');
            return;
        }

        // Validate membership type selection
        const membershipRadio = document.querySelector('input[name="membershipType"]:checked');
        if (!membershipRadio) {
            showMessage('נא לבחור סוג כרטיסייה');
            return;
        }
        const membershipType = membershipRadio.value;

        // Validate birth year is between 1925 and current year
        const birthdateValue = document.getElementById('birthdate').value;
        const birthDateObj = new Date(birthdateValue);
        const selectedYear = birthDateObj.getFullYear();
        const currentYear = new Date().getFullYear();

        if (isNaN(selectedYear) || selectedYear < 1925 || selectedYear > currentYear) {
            showMessage('שנת לידה לא תקינה!');
            return;
        }

        // Age validation 
        const age = calculateAge(birthdateValue);
        if (age < 16) {
            showMessage('רישום לסטודיו מגיל 16 ומעלה');
            return;
        }

        // Email validation
        const email = document.getElementById('email').value;
        if (!isValidEmail(email)) {
            showMessage('כתובת המייל שהוזנה אינה תקינה. נא לוודא שיש @ ונקודה.');
            return;
        }

        const storedEmail = localStorage.getItem('userEmail');

        // check for existing user with same email
        if (storedEmail && storedEmail === email) {
            showMessage('משתמש עם כתובת המייל הזו כבר קיים במערכת! נא לעבור להתחברות או להשתמש במייל אחר.');
            return; // Stop registration    
        }

        // Phone number validation
        const phoneNumber = document.getElementById('phoneNumber').value;
        if (phoneNumber.length !== 7) {
            showMessage('מספר הטלפון חייב להכיל בדיוק 7 ספרות (ללא הקידומת)');
            return;
        }

        // Name validation (ensure no numbers)
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const city = document.getElementById('city').value;

        if (containsNumbers(firstName)) {
            showMessage('שם פרטי לא יכול להכיל מספרים');
            return;
        }
        if (containsNumbers(lastName)) {
            showMessage('שם משפחה לא יכול להכיל מספרים');
            return;
        }
        if (city.length > 0 && containsNumbers(city)) {
            showMessage('שם העיר לא יכול להכיל מספרים');
            return;
        }

        // Password matching validation
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            showMessage('הסיסמאות אינן תואמות!');
            return;
        }

        // Password complexity validation
        const hasLetters = /[a-zA-Z\u0590-\u05FF]/.test(password); // checks for letters He + En
        const hasNumbers = /\d/.test(password);    // checks for numbers

        if (!hasLetters || !hasNumbers) {
            showMessage('הסיסמא חייבת להכיל שילוב של אותיות ומספרים!');
            return;
        }

        // 1. יצירת אובייקט עם כל הנתונים
        const userData = {
            email: email,
            password: password,
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            phone: document.getElementById('phonePrefix').value + '-' + phoneNumber,
            birthdate: birthdateValue,
            city: document.getElementById('city').value,
            trainingHabits: document.querySelector('input[name="trainingHabits"]:checked').value,
            membershipType: membershipRadio.value,
            comments: document.getElementById('comments').value
        };

        // 2. שליחת הבקשה לשרת (fetch)
        fetch('/registration', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })
        .then(response => {
            if (response.ok) {
                // ההרשמה הצליחה!
                showMessage('ההרשמה בוצעה בהצלחה! מועבר להתחברות...');
                // מעבר לדף התחברות אחרי סגירת ההודעה
                const overlay = document.getElementById('global-message-overlay');
                const okBtn   = document.getElementById('global-message-ok');
                if (overlay && okBtn) {
                    okBtn.onclick = function () {
                        overlay.classList.add('msg-hidden');
                        window.location.href = 'login.html';
                    };
                } else {
                    window.location.href = 'login.html';
                }
            } else {
                // הייתה שגיאה בשרת (למשל אימייל כפול)
                return response.text().then(text => { showMessage(text); });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('שגיאת תקשורת עם השרת');
        });
    });
}
