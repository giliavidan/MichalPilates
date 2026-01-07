document.addEventListener("DOMContentLoaded", async function () {
    const profileDetailsInner = document.getElementById("profile-details-inner");
    const loginMessage = document.getElementById("profile-login-message");
    const profileClassesContainer = document.getElementById("profile-classes");
    const editBtn = document.getElementById("edit-profile-btn");
    const detailsSection = document.getElementById("profile-details");
    const classesSection = document.getElementById("profile-classes-section");

    // --- מנגנון שחזור חיבור (חדש!) ---
    // אם הדפדפן "שכח" שאת מחוברת, נבדוק מול השרת אם יש עוגייה בתוקף
    if (!sessionStorage.getItem("isLoggedIn")) {
        try {
            const res = await fetch('/api/check-session');
            const data = await res.json();
            if (data.isLoggedIn) {
                // השרת זיהה אותנו! משחזרים את המידע לזיכרון
                sessionStorage.setItem('userId', data.user.id);
                sessionStorage.setItem('userFirstName', data.user.firstName);
                sessionStorage.setItem('userRole', data.user.role);
                sessionStorage.setItem('isLoggedIn', 'true');
            }
        } catch (e) {
            console.log("Session check failed");
        }
    }

    // בדיקת התחברות (אחרי שניסינו לשחזר)
    const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
    const userId = sessionStorage.getItem("userId");

    // משתנים גלובליים
    let currentUserData = {};
    let isEditMode = false;

    if (!isLoggedIn || !userId) {
        if (loginMessage) loginMessage.textContent = "יש להתחבר לחשבון כדי לראות את פרטי הפרופיל והשיעורים.";
        if (detailsSection) detailsSection.style.display = "none";
        if (classesSection) classesSection.style.display = "none";
        return;
    }

    if (detailsSection) detailsSection.style.display = "block";
    if (classesSection) classesSection.style.display = "block";
    if (loginMessage) loginMessage.textContent = "";

    // ==============================================
    //        חלק א': טעינת פרטי משתמש
    // ==============================================
    
    function fetchUserData() {
        fetch(`/api/user-info?userId=${userId}`)
            .then(res => res.json())
            .then(user => {
                if (user.error) return;
                currentUserData = user; 
                renderUserDetails(false); 
            })
            .catch(err => console.error(err));
    }

    fetchUserData();

    function renderUserDetails(editMode) {
        profileDetailsInner.innerHTML = ''; 

        if (!editMode) {
            // --- מצב צפייה ---
            editBtn.textContent = "עריכת פרטים";
            editBtn.className = "btn btn-edit-details"; 
            
            addRow("שם מלא:", (currentUserData.first_name || "") + " " + (currentUserData.last_name || ""));
            addRow("תאריך לידה:", formatDateToIsraeli(currentUserData.birthdate) || "");
            addRow("מקום מגורים:", currentUserData.city || "");
            addRow("טלפון:", currentUserData.phone || "");
            addRow("אימייל:", currentUserData.email || ""); 
            addRow("סוג מנוי:", translateMembership(currentUserData.membership_type));
        } else {
            // --- מצב עריכה ---
            editBtn.textContent = "שמירת שינויים";
            editBtn.className = "btn btn-success"; 

            addInputRow("שם פרטי:", "firstName", currentUserData.first_name);
            addInputRow("שם משפחה:", "lastName", currentUserData.last_name);
            addInputRow("תאריך לידה:", "birthdate", currentUserData.birthdate, "date");
            addInputRow("מקום מגורים:", "city", currentUserData.city);
            addInputRow("טלפון:", "phone", currentUserData.phone);
            
            // שדות שלא ניתנים לעריכה
            addRow("אימייל (לא ניתן לשינוי):", currentUserData.email);
            addRow("סוג מנוי:", translateMembership(currentUserData.membership_type));
        }
    }

    editBtn.addEventListener("click", function () {
        if (!isEditMode) {
            isEditMode = true;
            renderUserDetails(true);
        } else {
            saveUserData();
        }
    });

    function saveUserData() {
        const updatedData = {
            email: userId, 
            firstName: document.getElementById("input-firstName").value,
            lastName: document.getElementById("input-lastName").value,
            birthdate: document.getElementById("input-birthdate").value,
            city: document.getElementById("input-city").value,
            phone: document.getElementById("input-phone").value
        };

        fetch('/api/update-user', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("הפרטים עודכנו בהצלחה!");
                isEditMode = false;
                fetchUserData(); 
                
                // עדכון השם גם בזיכרון הדפדפן
                sessionStorage.setItem('userFirstName', updatedData.firstName);
            } else {
                alert("שגיאה: " + data.message);
            }
        });
    }

    // ==============================================
    //        חלק ב': שיעורים
    // ==============================================

    loadMyClasses(userId);

    function loadMyClasses(uid) {
        fetch(`/api/my-classes?userId=${uid}`)
            .then(res => res.json())
            .then(classes => {
                profileClassesContainer.innerHTML = '';
                
                // עדכון הכותרת ל"שיעורים הקרובים"
                const titleEl = document.querySelector('#profile-classes-section .section-title');
                if(titleEl) titleEl.textContent = "השיעורים הקרובים שלי";

                if (classes.length === 0) {
                    profileClassesContainer.innerHTML = '<p class="text-center text-muted">אין שיעורים קרובים כרגע.</p>';
                    return;
                }
                classes.forEach(cls => createClassCard(cls));
            })
            .catch(err => console.error(err));
    }

    function createClassCard(cls) {
        const card = document.createElement("div");
        card.className = "profile-class-card"; 

        // לחיצה מעבירה לתאריך בלוח השעות
        card.onclick = function() {
            window.location.href = `schedule.html?date=${cls.class_date}`;
        };

        const israeliDate = formatDateToIsraeli(cls.class_date); 
        const startTime = cls.start_time.substring(0, 5);
        const endTime = cls.end_time.substring(0, 5);
        
        const titleDiv = document.createElement("div");
        titleDiv.className = "profile-class-title";
        titleDiv.textContent = cls.class_name;
        if (cls.zoom) titleDiv.innerHTML += ` <span class="badge bg-primary" style="font-size:0.7em;">ZOOM</span>`;

        const metaDiv = document.createElement("div");
        metaDiv.className = "profile-class-meta";
        // עיצוב שעות משמאל לימין ותאריך ישראלי
        metaDiv.innerHTML = `
            ${israeliDate} • 
            <span style="direction: ltr; display: inline-block;">${startTime} - ${endTime}</span>
        `;

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn-cancel-class"; 
        cancelBtn.textContent = "ביטול רישום";
        
        cancelBtn.onclick = function(e) {
            e.stopPropagation(); 
            cancelMyClass(cls.id);
        };

        card.appendChild(titleDiv);
        card.appendChild(metaDiv);
        card.appendChild(cancelBtn);
        
        profileClassesContainer.appendChild(card);
    }

    function cancelMyClass(classId) {
        if(!confirm("האם לבטל את הרישום לשיעור זה?")) return;
        fetch('/cancel-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, classId: classId })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                alert("הרישום בוטל");
                loadMyClasses(userId);
            } else {
                alert("שגיאה בביטול");
            }
        });
    }

    // ==============================================
    //        פונקציות עזר
    // ==============================================

    function formatDateToIsraeli(dateStr) {
        if (!dateStr) return "";
        const parts = dateStr.split('-'); 
        if (parts.length < 3) return dateStr; 
        return `${parts[2]}/${parts[1]}/${parts[0]}`; 
    }

    function addRow(label, value) {
        const row = document.createElement("div");
        row.className = "profile-row";
        row.innerHTML = `<span class="profile-row-label">${label}</span><span class="profile-row-value">${value || ""}</span>`;
        profileDetailsInner.appendChild(row);
    }

    function addInputRow(label, fieldName, value, type = "text") {
        const row = document.createElement("div");
        row.className = "profile-row";
        
        const labelSpan = document.createElement("span");
        labelSpan.className = "profile-row-label";
        labelSpan.textContent = label;

        const input = document.createElement("input");
        input.type = type;
        input.className = "profile-edit-input"; 
        input.value = value || "";
        input.id = "input-" + fieldName; 

        const wrapper = document.createElement("div");
        wrapper.style.flex = "1";
        wrapper.appendChild(input);

        row.appendChild(labelSpan);
        row.appendChild(wrapper);
        profileDetailsInner.appendChild(row);
    }

    function translateMembership(type) {
        if (type === "gym_1perweek") return "מנוי סטודיו (1 בשבוע)";
        if (type === "gym_2perweek") return "מנוי סטודיו (2 בשבוע)";
        if (type && type.includes("zoom")) return "כרטיסיית זום";
        if (type === "guest") return "אורח";
        return type || "לא הוגדר מנוי";
    }
});