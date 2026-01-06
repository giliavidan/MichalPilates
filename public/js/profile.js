
// Cache references to important DOM elements used on the profile page
document.addEventListener("DOMContentLoaded", function () {
    const profileDetailsInner = document.getElementById("profile-details-inner");
    const loginMessage = document.getElementById("profile-login-message");
    const profileClassesContainer = document.getElementById("profile-classes");
    const editBtn = document.getElementById("edit-profile-btn");

    const detailsSection = document.getElementById("profile-details");
    const classesSection = document.getElementById("profile-classes-section");

    // Read login state from localStorage (user is logged in only if the value is "true")
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

    // If the user is logged out, show the message  
    if (!isLoggedIn) {
        loginMessage.textContent = "יש להתחבר לחשבון כדי לראות את פרטי הפרופיל והשיעורים.";

        // Hide the profile details and classes sections when the user is logged out
        if (detailsSection) {
            detailsSection.style.display = "none";
        }
        if (classesSection) {
            classesSection.style.display = "none";
        }
        // Stop here so that the rest of the profile data is not built for logged out users
        return;
    }

    // for user that is logged in: make the sections visible
    if (detailsSection) {
        detailsSection.style.display = "block";
    }
    if (classesSection) {
        classesSection.style.display = "block";
    }
    // Clear the login message for logged-in users
    loginMessage.textContent = "";

    // Example 
    const user = {
        firstName: "ישראל",
        lastName: "ישראלי",
        birthdate: "1995-06-15",
        city: "תל אביב",
        phone: "050-1234567",
        email: "israel@example.com",
        membershipType: "pilates_2perweek"
    }

    // Convert internal membership codes to human‑readable descriptions
    function translateMembership(type) {
        if (type === "pilates_1perweek") return "כניסה פעם בשבוע";
        if (type === "pilates_2perweek") return "כניסה פעמיים בשבוע";
        if (type === "zoom_2perweek") return "זום פעמיים בשבוע";
        return "לא הוגדר מנוי";
    }

    // Create a single row (label + value) inside the profile details section
    function addRow(labelText, valueText) {
        const row = document.createElement("div");
        row.className = "profile-row";

        const labelSpan = document.createElement("span");
        labelSpan.className = "profile-row-label";
        labelSpan.textContent = labelText;

        const valueSpan = document.createElement("span");
        valueSpan.className = "profile-row-value";
        valueSpan.textContent = valueText || "";

        row.appendChild(labelSpan);
        row.appendChild(valueSpan);
        profileDetailsInner.appendChild(row);
    }

    // Build all profile rows from the user object
    addRow("שם מלא:", (user.firstName || "") + " " + (user.lastName || ""));
    addRow("תאריך לידה:", user.birthdate || "");
    addRow("מקום מגורים:", user.city || "");
    addRow("טלפון:", user.phone || "");
    addRow("אימייל:", user.email || "");
    addRow("סוג מנוי:", translateMembership(user.membershipType));


    // When logged in, the edit button just shows a placeholder alert 
    editBtn.addEventListener("click", function () {
        alert("כשיהיה לנו בסיס נתונים נאפשר עריכת פרטים");
    });

    // Example static list of upcoming classes shown on the profile page
    const exampleClasses = [
        { name: "פילאטיס מזרן קלאסי", date: "22.12.2025", time: "08:00 - 09:00" },
        { name: "פילאטיס עם משקולות", date: "24.12.2025", time: "19:00 - 20:00" }
    ]

    // For each class, build a small card with the name and date/time 
    exampleClasses.forEach(function (classItem) {
        const card = document.createElement("div");
        card.className = "profile-class-card";

        const titleDiv = document.createElement("div");
        titleDiv.className = "profile-class-title";
        titleDiv.textContent = classItem.name;

        const metaDiv = document.createElement("div");
        metaDiv.className = "profile-class-meta";
        metaDiv.textContent = classItem.date + " • " + classItem.time;

        card.appendChild(titleDiv);
        card.appendChild(metaDiv);
        profileClassesContainer.appendChild(card);
    })
})
