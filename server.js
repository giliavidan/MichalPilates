const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// --- חיבור למסד הנתונים ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'gnGroup3', 
    database: 'michal_pilates',
    dateStrings: true // פותר את בעיית הזזת הימים
});

db.connect((err) => {
    if (err) console.error('Error connecting to MySQL:', err);
    else console.log('Connected to MySQL Database!');
});


// ==========================================
//           ניהול משתמשים (Auth)
// ==========================================

// נשאר בדיוק כמו שביקשת (/registration)
app.post('/registration', (req, res) => {
    const { email, password, firstName, lastName, phone, birthdate, city, trainingHabits, membershipType, comments } = req.body;
    const query = `INSERT INTO users (email, password, first_name, last_name, phone, birthdate, city, training_habit, membership_type, comments, role) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'client')`;

    db.query(query, [email, password, firstName, lastName, phone, birthdate, city, trainingHabits, membershipType, comments], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error registering');
        } else {
            res.status(200).send('Registration successful');
        }
    });
});

// התחברות
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = "SELECT * FROM users WHERE email = ? AND password = ?";
    
    db.query(query, [email, password], (err, results) => {
        if (err) {
            res.status(500).json({ success: false });
        } else if (results.length > 0) {
            const user = results[0];
            res.json({ 
                success: true, 
                message: "Login successful",
                user: {
                    id: user.email, 
                    firstName: user.first_name,
                    role: user.role,
                    membershipType: user.membership_type
                }
            });
        } else {
            res.status(401).json({ success: false, message: "Wrong credentials" });
        }
    });
});

// --- חדש: שליפת כל המשתמשים (עבור הדרופ-דאון של הניהול) ---
app.get('/all-users', (req, res) => {
    const query = "SELECT first_name, last_name, email FROM users ORDER BY first_name ASC";
    db.query(query, (err, results) => {
        if (err) res.status(500).send('Error');
        else res.json(results);
    });
});


// ==========================================
//           ניהול שיעורים (Classes)
// ==========================================

app.post('/add-class', (req, res) => {
    const { className, classDate, dayOfWeek, startTime, endTime, instructor, zoom, maxParticipants } = req.body;
    const query = `INSERT INTO classes (class_name, class_date, day_of_week, start_time, end_time, instructor, zoom, max_participants) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(query, [className, classDate, dayOfWeek, startTime, endTime, instructor, zoom, maxParticipants], (err) => {
        if (err) res.status(500).json({ success: false });
        else res.json({ success: true });
    });
});

app.put('/update-class', (req, res) => {
    const { id, className, classDate, dayOfWeek, startTime, endTime, instructor, zoom, maxParticipants } = req.body;
    const query = `UPDATE classes SET class_name=?, class_date=?, day_of_week=?, start_time=?, end_time=?, instructor=?, zoom=?, max_participants=? WHERE id=?`;
    db.query(query, [className, classDate, dayOfWeek, startTime, endTime, instructor, zoom, maxParticipants, id], (err) => {
        if (err) res.status(500).json({ success: false });
        else res.json({ success: true });
    });
});

app.get('/classes', (req, res) => {
    const userId = req.query.userId || 0; 

    const query = `
        SELECT 
            c.*,
            r.status as user_status,
            (SELECT COUNT(*) + 1 FROM registrations r2 
             WHERE r2.class_id = c.id AND r2.status = 'waitlist' AND r2.id < r.id) as waitlist_position,
            (SELECT COUNT(*) FROM registrations r3 WHERE r3.class_id = c.id AND r3.status = 'waitlist') as total_waitlist
        FROM classes c
        LEFT JOIN registrations r ON c.id = r.class_id AND r.user_id = ?
        ORDER BY c.class_date ASC, c.start_time ASC
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error");
        } else {
            res.json(results);
        }
    });
});

app.delete('/delete-class/:id', (req, res) => {
    db.query('DELETE FROM classes WHERE id = ?', [req.params.id], (err) => {
        if (err) res.status(500).json({ success: false });
        else res.json({ success: true });
    });
});


// ==========================================
//           לוגיקת הרשמה (Registration)
// ==========================================

app.post('/register-class', (req, res) => {
    const { userId, classId } = req.body; 

    const checkQuery = "SELECT * FROM classes WHERE id = ?";
    db.query(checkQuery, [classId], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ success: false, message: 'Class not found' });
        
        const cls = results[0];
        const isFull = cls.current_participants >= cls.max_participants;
        const status = isFull ? 'waitlist' : 'registered';

        const registerQuery = "INSERT INTO registrations (user_id, class_id, status) VALUES (?, ?, ?)";
        db.query(registerQuery, [userId, classId, status], (err, result) => {
            if (err) {
                return res.json({ success: false, message: 'כבר נרשמת לשיעור הזה' });
            }
            if (status === 'registered') {
                db.query("UPDATE classes SET current_participants = current_participants + 1 WHERE id = ?", [classId]);
            }
            res.json({ success: true, status: status, message: isFull ? 'נכנסת לרשימת המתנה' : 'נרשמת בהצלחה!' });
        });
    });
});

app.post('/cancel-registration', (req, res) => {
    const { userId, classId } = req.body;

    db.query("SELECT status FROM registrations WHERE user_id = ? AND class_id = ?", [userId, classId], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false });
        
        const oldStatus = results[0].status;

        db.query("DELETE FROM registrations WHERE user_id = ? AND class_id = ?", [userId, classId], (err, result) => {
            if (err) return res.json({ success: false });

            if (oldStatus === 'registered') {
                db.query("UPDATE classes SET current_participants = current_participants - 1 WHERE id = ?", [classId]);
            }
            res.json({ success: true });
        });
    });
});

// --- חדש: הוספת משתתף ע"י מנהל (עוקף בדיקות רגילות) ---
app.post('/admin-add-user', (req, res) => {
    const { userId, classId } = req.body;
    
    // בדיקה אם המשתמש כבר רשום
    db.query("SELECT * FROM registrations WHERE user_id = ? AND class_id = ?", [userId, classId], (err, results) => {
        if (results.length > 0) return res.json({ success: false, message: 'המשתמשת כבר רשומה לשיעור זה' });

        // הכנסה ישירה לסטטוס 'registered'
        db.query("INSERT INTO registrations (user_id, class_id, status) VALUES (?, ?, 'registered')", [userId, classId], (err) => {
            if (err) return res.json({ success: false, message: 'שגיאה בהוספה' });
            
            // עדכון מונה המשתתפים
            db.query("UPDATE classes SET current_participants = current_participants + 1 WHERE id = ?", [classId]);
            res.json({ success: true, message: 'המשתמשת נוספה בהצלחה' });
        });
    });
});

// --- משודרג: שליפת משתתפים כולל סטטוס ואימייל (תומך גם בניהול וגם בבועה) ---
app.get('/class-participants/:id', (req, res) => {
    const classId = req.params.id;
    // השינוי: הוספנו u.email ו-r.status, והורדנו את הסינון של registered בלבד
    const query = `
        SELECT u.first_name, u.last_name, u.email, r.status
        FROM registrations r
        JOIN users u ON r.user_id = u.email
        WHERE r.class_id = ?
        ORDER BY r.created_at ASC
    `;
    db.query(query, [classId], (err, results) => {
        if (err) res.status(500).send('Error');
        else res.json(results);
    });
});


// ==========================================
//           ניהול הודעות (Messages)
// ==========================================

app.post('/add-message', (req, res) => {
    db.query('INSERT INTO messages (content) VALUES (?)', [req.body.content], (err) => {
        if(err) res.status(500).json({success:false}); else res.json({success:true});
    });
});
app.get('/messages', (req, res) => {
    db.query('SELECT * FROM messages ORDER BY created_at DESC', (err, results) => {
        if(err) res.status(500).send('Error'); else res.json(results);
    });
});
app.delete('/delete-message/:id', (req, res) => {
    db.query('DELETE FROM messages WHERE id = ?', [req.params.id], (err) => {
        if(err) res.status(500).json({success:false}); else res.json({success:true});
    });
});

app.listen(port, () => { console.log(`Server running on http://localhost:${port}`); });