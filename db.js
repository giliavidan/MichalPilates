const mysql = require('mysql2');
const dbConfig = require('./db.config.js');

// יוצר חיבור לבסיס נתונים
const db = mysql.createConnection({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  dateStrings: true
});

//פתיחת החיבור
db.connect(error => {
  if (error) { 
    console.log('שגיאת חיבור DB:', error); 
    return; 
  }
  console.log("Successfully connected to the database");
});

module.exports = db;

