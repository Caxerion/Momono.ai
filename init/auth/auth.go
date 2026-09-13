package auth

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

var db *sql.DB

// adminUsernames menyimpan daftar username yang dianggap admin.
// Diisi dari env MOMONO_ADMINS (dipisah koma) lewat SetAdmins().
var adminUsernames = map[string]bool{}

const sessionDuration = 7 * 24 * time.Hour // 7 hari

// SetAdmins menerima daftar username admin yang dipisah koma.
func SetAdmins(raw string) {
	adminUsernames = map[string]bool{}
	for _, u := range strings.Split(raw, ",") {
		u = strings.TrimSpace(u)
		if u != "" {
			adminUsernames[u] = true
		}
	}
}

// IsAdmin mengembalikan true jika user dengan id tsb ada di daftar admin.
func IsAdmin(userID int64) bool {
	var username string
	err := db.QueryRow("SELECT username FROM users WHERE id=?", userID).Scan(&username)
	if err != nil {
		return false
	}
	return adminUsernames[username]
}

func Init(path string) error {
	d, err := sql.Open("sqlite", path)
	if err != nil {
		return err
	}

	schema := `
CREATE TABLE IF NOT EXISTS users (
id INTEGER PRIMARY KEY AUTOINCREMENT,
username TEXT UNIQUE NOT NULL,
email TEXT UNIQUE,
password_hash TEXT NOT NULL DEFAULT '',
github_id TEXT UNIQUE,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
token TEXT PRIMARY KEY,
user_id INTEGER NOT NULL REFERENCES users(id),
expires_at DATETIME NOT NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`
	if _, err := d.Exec(schema); err != nil {
		return err
	}

	for _, col := range []string{
		"ALTER TABLE users ADD COLUMN email TEXT",
		"ALTER TABLE users ADD COLUMN github_id TEXT",
		"ALTER TABLE users ADD COLUMN display_name TEXT",
		"ALTER TABLE users ADD COLUMN about_me TEXT",
		"ALTER TABLE users ADD COLUMN avatar_url TEXT",
		"ALTER TABLE users ADD COLUMN gender TEXT",
	} {
		d.Exec(col)
	}

	db = d
	return nil
}

func CreateSession(userID int64) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := hex.EncodeToString(b)
	expires := time.Now().Add(sessionDuration)

	if _, err := db.Exec(
		"INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
		token, userID, expires.Format(time.RFC3339),
	); err != nil {
		return "", err
	}
	return token, nil
}

func ValidateSession(token string) (int64, error) {
	var userID int64
	var expiresAt string
	err := db.QueryRow(
		"SELECT user_id, expires_at FROM sessions WHERE token=?", token,
	).Scan(&userID, &expiresAt)
	if err == sql.ErrNoRows {
		return 0, fmt.Errorf("session not found")
	}
	if err != nil {
		return 0, err
	}
	exp, err := time.Parse(time.RFC3339, expiresAt)
	if err != nil {
		return 0, err
	}
	if time.Now().After(exp) {
		db.Exec("DELETE FROM sessions WHERE token=?", token)
		return 0, fmt.Errorf("session expired")
	}
	return userID, nil
}

func DeleteSession(token string) error {
	_, err := db.Exec("DELETE FROM sessions WHERE token=?", token)
	return err
}

func FindUserByGithubID(githubID string) (int64, error) {
	var userID int64
	err := db.QueryRow("SELECT id FROM users WHERE github_id=?", githubID).Scan(&userID)
	if err != nil {
		return 0, err
	}
	return userID, nil
}

func CreateUserWithGithub(githubID, username, email string) (int64, error) {
	var emailVal interface{}
	if email == "" {
		emailVal = nil
	} else {
		emailVal = email
	}

	insert := func(uname string, mail interface{}) (int64, error) {
		result, err := db.Exec(
			"INSERT INTO users (username, email, github_id, password_hash) VALUES (?, ?, ?, '')",
			uname, mail, githubID,
		)
		if err != nil {
			return 0, err
		}
		return result.LastInsertId()
	}

	userID, err := insert(username, emailVal)
	if err == nil {
		return userID, nil
	}
	if !strings.Contains(err.Error(), "UNIQUE constraint failed") {
		return 0, err
	}

	// Gap pertama gagal karena username atau email sudah dipakai. Urutan retry:
	//  1. username asli tanpa email (kasus email bentrok, username bebas)
	//  2. username unik dengan email asli (kasus username bentrok, email unik)
	//  3. username unik tanpa email (kasus keduanya bentrok)
	type attempt struct {
		uname string
		mail  interface{}
	}
	retries := []attempt{{username, nil}}
	for i := 2; i <= 4; i++ {
		suffix := fmt.Sprintf("%s-%d", username, i)
		retries = append(retries, attempt{suffix, emailVal}, attempt{suffix, nil})
	}
	for _, a := range retries {
		userID, err = insert(a.uname, a.mail)
		if err == nil {
			return userID, nil
		}
		if !strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return 0, err
		}
	}
	return 0, fmt.Errorf("failed to create unique username")
}
