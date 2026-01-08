const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// --- חיבור למסד הנתונים ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'gnGroup3',
    database: 'michal_pilates',
    dateStrings: true
});

db.connect((err) => {
    if (err) console.error('Error connecting to MySQL:', err);
    else console.log('Connected to MySQL Database!');
});

// ==========================================
//           ניהול משתמשים (Auth)
// ==========================================

app.post('/registration', (req, res) => {
    const { email, password, firstName, lastName, phone, birthdate, city, trainingHabits, membershipType, comments } = req.body;
    const query = `INSERT INTO users (email, password, first_name, last_name, phone, birthdate, city, training_habit, membership_type, comments, role) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'client')`;

    db.query(query, [email, password, firstName, lastName, phone, birthdate, city, trainingHabits, membershipType, comments], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('אירעה שגיאה במהלך ההרשמה');
        } else {
            res.status(200).send('ההרשמה בוצעה בהצלחה');
        }
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = "SELECT * FROM users WHERE email = ? AND password = ?";

    db.query(query, [email, password], (err, results) => {
        if (err) {
            res.status(500).json({ success: false, message: 'אירעה שגיאה בעת ההתחברות' });
        } else if (results.length > 0) {
            const user = results[0];
            // עוגייה לשעה אחת
            res.cookie('userSession', user.email, { maxAge: 3600000, httpOnly: true });
            res.json({
                success: true,
                message: "התחברת בהצלחה",
                user: {
                    id: user.email,
                    firstName: user.first_name,
                    role: user.role,
                    membershipType: user.membership_type
                }
            });
        } else {
            res.status(401).json({
                success: false,
                message: "שם משתמש או סיסמה שגויים"
            });
        }
    });
});

app.get('/logout', (req, res) => {
    res.clearCookie('userSession');
    res.json({ success: true, message: 'התנתקת מהמערכת' });
});

// --- בדיקת חיבור לפי העוגייה (למקרה שסגרו את הדפדפן) ---
app.get('/api/check-session', (req, res) => {
    const email = req.cookies.userSession;
    if (!email) {
        return res.json({ isLoggedIn: false });
    }
    const query = "SELECT first_name, email, role, membership_type FROM users WHERE email = ?";
    db.query(query, [email], (err, results) => {
        if (results.length > 0) {
            const user = results[0];
            res.json({
                isLoggedIn: true,
                user: {
                    id: user.email,
                    firstName: user.first_name,
                    role: user.role,
                    membershipType: user.membership_type
                }
            });
        } else {
            res.json({ isLoggedIn: false });
        }
    });
});

app.get('/api/user-info', (req, res) => {
    const userId = req.query.userId;
    const query = "SELECT first_name, last_name, email, phone, city, birthdate, membership_type FROM users WHERE email = ?";
    db.query(query, [userId], (err, results) => {
        if (err || results.length === 0) {
            res.status(500).json({ error: 'המשתמש לא נמצא' });
        } else {
            res.json(results[0]);
        }
    });
});

// עדכון פרטים (ללא אימייל וללא מנוי)
app.put('/api/update-user', (req, res) => {
    const { email, firstName, lastName, phone, city, birthdate } = req.body;
    const query = `UPDATE users SET first_name=?, last_name=?, phone=?, city=?, birthdate=? WHERE email=?`;
    db.query(query, [firstName, lastName, phone, city, birthdate, email], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ success: false, message: "אירעה שגיאה בעדכון הפרטים" });
        } else {
            res.json({ success: true, message: "הפרטים עודכנו בהצלחה" });
        }
    });
});

app.get('/all-users', (req, res) => {
    const query = "SELECT first_name, last_name, email FROM users ORDER BY first_name ASC";
    db.query(query, (err, results) => {
        if (err) res.status(500).send('אירעה שגיאה בטעינת המשתמשים'); 
        else res.json(results);
    });
});

// ==========================================
//           ניהול שיעורים
// ==========================================

app.get('/api/my-classes', (req, res) => {
    const userId = req.query.userId;
    // מחזיר רק 3 שיעורים עתידיים
    const query = `
        SELECT c.id, c.class_name, c.class_date, c.start_time, c.end_time, c.zoom, r.status
        FROM classes c
        JOIN registrations r ON c.id = r.class_id
        WHERE r.user_id = ?
        AND TIMESTAMP(c.class_date, c.end_time) >= NOW()
        ORDER BY c.class_date ASC, c.start_time ASC
        LIMIT 3
    `;
    db.query(query, [userId], (err, results) => {
        if (err) res.status(500).send('אירעה שגיאה בטעינת השיעורים'); 
        else res.json(results);
    });
});

app.post('/add-class', (req, res) => {
    const { className, classDate, dayOfWeek, startTime, endTime, instructor, zoom, maxParticipants } = req.body;
    const query = `INSERT INTO classes (class_name, class_date, day_of_week, start_time, end_time, instructor, zoom, max_participants) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(query, [className, classDate, dayOfWeek, startTime, endTime, instructor, zoom, maxParticipants], (err) => {
        if (err) res.status(500).json({ success: false, message: 'אירעה שגיאה בהוספת השיעור' }); 
        else res.json({ success: true, message: 'השיעור נוסף בהצלחה' });
    });
});

app.put('/update-class', (req, res) => {
    const { id, className, classDate, dayOfWeek, startTime, endTime, instructor, zoom, maxParticipants } = req.body;
    const query = `UPDATE classes SET class_name=?, class_date=?, day_of_week=?, start_time=?, end_time=?, instructor=?, zoom=?, max_participants=? WHERE id=?`;
    db.query(query, [className, classDate, dayOfWeek, startTime, endTime, instructor, zoom, maxParticipants, id], (err) => {
        if (err) res.status(500).json({ success: false, message: 'אירעה שגיאה בעדכון השיעור' }); 
        else res.json({ success: true, message: 'השיעור עודכן בהצלחה' });
    });
});

app.get('/classes', (req, res) => {
    const userId = req.query.userId || 0;
    const query = `
        SELECT c.*, r.status as user_status,
        (SELECT COUNT(*) + 1 FROM registrations r2 WHERE r2.class_id = c.id AND r2.status = 'waitlist' AND r2.id < r.id) as waitlist_position,
        (SELECT COUNT(*) FROM registrations r3 WHERE r3.class_id = c.id AND r3.status = 'waitlist') as total_waitlist
        FROM classes c
        LEFT JOIN registrations r ON c.id = r.class_id AND r.user_id = ?
        ORDER BY c.class_date ASC, c.start_time ASC
    `;
    db.query(query, [userId], (err, results) => {
        if (err) res.status(500).send("אירעה שגיאה בטעינת מערכת השיעורים"); 
        else res.json(results);
    });
});

app.delete('/delete-class/:id', (req, res) => {
    db.query('DELETE FROM classes WHERE id = ?', [req.params.id], (err) => {
        if (err) res.status(500).json({ success: false, message: 'אירעה שגיאה במחיקת השיעור' }); 
        else res.json({ success: true, message: 'השיעור נמחק בהצלחה' });
    });
});

// ==========================================
//           הרשמה וביטול
// ==========================================

app.post('/register-class', (req, res) => {
    const { userId, classId } = req.body;
    const checkQuery = "SELECT * FROM classes WHERE id = ?";
    db.query(checkQuery, [classId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({ success: false, message: 'השיעור לא נמצא' });
        }

        const cls = results[0];
        const isFull = cls.current_participants >= cls.max_participants;
        const status = isFull ? 'waitlist' : 'registered';

        const registerQuery = "INSERT INTO registrations (user_id, class_id, status) VALUES (?, ?, ?)";
        db.query(registerQuery, [userId, classId, status], (err, result) => {
            if (err) return res.json({ success: false, message: 'כבר נרשמת לשיעור הזה' });
            if (status === 'registered') {
                db.query("UPDATE classes SET current_participants = current_participants + 1 WHERE id = ?", [classId]);
            }
            res.json({ 
                success: true, 
                status: status, 
                message: isFull ? 'נכנסת לרשימת ההמתנה' : 'נרשמת לשיעור בהצלחה' 
            });
        });
    });
});

app.post('/cancel-registration', (req, res) => {
    const { userId, classId } = req.body;
    db.query("SELECT status FROM registrations WHERE user_id = ? AND class_id = ?", [userId, classId], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: 'הרישום לשיעור לא נמצא' });
        const oldStatus = results[0].status;
        db.query("DELETE FROM registrations WHERE user_id = ? AND class_id = ?", [userId, classId], (err, result) => {
            if (err) return res.json({ success: false, message: 'אירעה שגיאה בביטול הרישום' });
            if (oldStatus === 'registered') {
                db.query("UPDATE classes SET current_participants = current_participants - 1 WHERE id = ?", [classId]);
            }
            res.json({ success: true, message: 'הרישום לשיעור בוטל בהצלחה' });
        });
    });
});

app.post('/admin-add-user', (req, res) => {
    const { userId, classId } = req.body;
    db.query("SELECT * FROM registrations WHERE user_id = ? AND class_id = ?", [userId, classId], (err, results) => {
        if (results.length > 0) return res.json({ success: false, message: 'המשתמשת כבר רשומה לשיעור' });
        db.query("INSERT INTO registrations (user_id, class_id, status) VALUES (?, ?, 'registered')", [userId, classId], (err) => {
            if (err) return res.json({ success: false, message: 'אירעה שגיאה בהוספת המשתמשת' });
            db.query("UPDATE classes SET current_participants = current_participants + 1 WHERE id = ?", [classId]);
            res.json({ success: true, message: 'המשתמשת נוספה לשיעור בהצלחה' });
        });
    });
});

app.get('/class-participants/:id', (req, res) => {
    const classId = req.params.id;
    const query = `
        SELECT u.first_name, u.last_name, u.email, r.status
        FROM registrations r
        JOIN users u ON r.user_id = u.email
        WHERE r.class_id = ?
        ORDER BY r.created_at ASC
    `;
    db.query(query, [classId], (err, results) => {
        if (err) res.status(500).send('אירעה שגיאה בטעינת המשתתפות בשיעור'); 
        else res.json(results);
    });
});

// ==========================================
//           הודעות
// ==========================================

app.post('/add-message', (req, res) => {
    db.query('INSERT INTO messages (content) VALUES (?)', [req.body.content], (err) => {
        if (err) res.status(500).json({ success:false, message: 'אירעה שגיאה בהוספת ההודעה' }); 
        else res.json({ success:true, message: 'ההודעה נוספה בהצלחה' });
    });
});

app.get('/messages', (req, res) => {
    db.query('SELECT * FROM messages ORDER BY created_at DESC', (err, results) => {
        if (err) res.status(500).send('אירעה שגיאה בטעינת ההודעות'); 
        else res.json(results);
    });
});

app.delete('/delete-message/:id', (req, res) => {
    db.query('DELETE FROM messages WHERE id = ?', [req.params.id], (err) => {
        if (err) res.status(500).json({success:false, message: 'אירעה שגיאה במחיקת ההודעה'}); 
        else res.json({success:true, message: 'ההודעה נמחקה בהצלחה'});
    });
});

app.listen(port, () => { 
    console.log(`Server running on http://localhost:${port}`); 
});
