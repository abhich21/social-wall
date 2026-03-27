const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'social_wall.db');

let db = null;

// Google colors palette
const GOOGLE_COLORS = ['#EA4335', '#4285F4', '#34A853', '#FBBC05', '#A142F4'];

function getRandomColor() {
    return GOOGLE_COLORS[Math.floor(Math.random() * GOOGLE_COLORS.length)];
}

async function initDatabase() {
    const SQL = await initSqlJs();

    // Load existing DB file or create new one
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    // Create images table
    db.run(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_path TEXT NOT NULL,
      text TEXT DEFAULT '',
      bg_color TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    saveDatabase();
    return db;
}

// Save database to file (call after every write operation)
function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

// Helper functions
function getAllImages() {
    const stmt = db.prepare('SELECT * FROM images ORDER BY created_at DESC');
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function getActiveImages() {
    const stmt = db.prepare("SELECT * FROM images WHERE status = 'active' ORDER BY created_at DESC");
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function getImageById(id) {
    const stmt = db.prepare('SELECT * FROM images WHERE id = ?');
    stmt.bind([id]);
    let result = null;
    if (stmt.step()) {
        result = stmt.getAsObject();
    }
    stmt.free();
    return result;
}

function addImage(imagePath, text, bgColor) {
    db.run('INSERT INTO images (image_path, text, bg_color) VALUES (?, ?, ?)', [imagePath, text || '', bgColor]);
    saveDatabase();

    // Safely retrieve the newly inserted row to get the actual database ID 
    // instead of relying on last_insert_rowid() which can fail and return 0
    const stmt = db.prepare('SELECT * FROM images ORDER BY id DESC LIMIT 1');
    let newImage = null;
    if (stmt.step()) {
        newImage = stmt.getAsObject();
    }
    stmt.free();

    return newImage;
}

function updateImageText(id, text) {
    db.run('UPDATE images SET text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [text, id]);
    saveDatabase();
    return getImageById(id);
}

function updateImageStatus(id, status) {
    db.run('UPDATE images SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
    saveDatabase();
    return getImageById(id);
}

function deleteImage(id) {
    db.run('DELETE FROM images WHERE id = ?', [id]);
    saveDatabase();
}

function deleteAllImages() {
    db.run('DELETE FROM images');
    db.run('DELETE FROM sqlite_sequence WHERE name="images"'); // Reset auto-increment
    saveDatabase();
}

module.exports = {
    initDatabase,
    getRandomColor,
    GOOGLE_COLORS,
    getAllImages,
    getActiveImages,
    getImageById,
    addImage,
    updateImageText,
    updateImageStatus,
    deleteImage,
    deleteAllImages,
};
