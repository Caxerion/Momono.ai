package auth

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

type credentials struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var creds credentials
	if err := json.NewDecoder(r.Body).Decode(&creds);
	err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	creds.Username = strings.TrimSpace(creds.Username)
	creds.Email = strings.TrimSpace(creds.Email)
	if creds.Username == "" || creds.Email == "" || len(creds.Password) < 8 {
		http.Error(w, "username and email are required, password must be at least 8 characters", http.StatusBadRequest)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(creds.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "failed to process password", http.StatusInternalServerError)
		return
	}

	if _, err := db.Exec(
		"INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
		creds.Username, creds.Email, string(hash),
	); err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			http.Error(w, "username already taken", http.StatusConflict)
			return
		}
		http.Error(w, "failed to save user", http.StatusInternalServerError)
		log.Println("register: failed to insert user:", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "registration successful"})
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var creds credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	creds.Username = strings.TrimSpace(creds.Username)
	creds.Email = strings.TrimSpace(creds.Email)
	if (creds.Username == "" && creds.Email == "") || creds.Password == "" {
		http.Error(w, "username/email and password are required", http.StatusBadRequest)
		return
	}

	var userID int64
	var hash string
	var err error
	if creds.Email != "" {
		err = db.QueryRow(
			"SELECT id, password_hash FROM users WHERE email=?", creds.Email,
		).Scan(&userID, &hash)
		if err == sql.ErrNoRows {
			err = db.QueryRow(
				"SELECT id, password_hash FROM users WHERE username=?", creds.Email,
			).Scan(&userID, &hash)
		}
	} else {
		err = db.QueryRow(
			"SELECT id, password_hash FROM users WHERE username=?", creds.Username,
		).Scan(&userID, &hash)
	}
	if err == sql.ErrNoRows {
		http.Error(w, "invalid username/email or password", http.StatusUnauthorized)
		return
	}
	if err != nil {
		http.Error(w, "failed to process login", http.StatusInternalServerError)
		log.Println("login: query error:", err)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(creds.Password)); err != nil {
		http.Error(w, "invalid username/email or password", http.StatusUnauthorized)
		return
	}

	token, err := CreateSession(userID)
	if err != nil {
		http.Error(w, "failed to create session", http.StatusInternalServerError)
		log.Println("login: create session error:", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")
	if token == "" {
		http.Error(w, "token not found", http.StatusBadRequest)
		return
	}
	_ = DeleteSession(token)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "logout successful"})
}

func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")
	if token == "" {
		http.Error(w, "token not found", http.StatusUnauthorized)
		return
	}
	userID, err := ValidateSession(token)
	if err != nil {
		http.Error(w, "invalid session", http.StatusUnauthorized)
		return
	}
	var username, email, displayName, aboutMe, avatarUrl, gender string
	err = db.QueryRow("SELECT username, COALESCE(email,''), COALESCE(display_name,''), COALESCE(about_me,''), COALESCE(avatar_url,''), COALESCE(gender,'') FROM users WHERE id=?", userID).Scan(&username, &email, &displayName, &aboutMe, &avatarUrl, &gender)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"id":           fmt.Sprintf("%d", userID),
		"username":     username,
		"email":        email,
		"display_name": displayName,
		"about_me":     aboutMe,
		"avatar_url":   avatarUrl,
		"gender":       gender,
		"is_admin":     IsAdmin(userID),
	})
}

func PublicUserProfileHandler(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")
	if token == "" {
		http.Error(w, "token not found", http.StatusUnauthorized)
		return
	}
	if _, err := ValidateSession(token); err != nil {
		http.Error(w, "invalid session", http.StatusUnauthorized)
		return
	}

	userID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}

	var username, displayName, aboutMe, avatarUrl, gender string
	err = db.QueryRow(
		"SELECT username, COALESCE(display_name,''), COALESCE(about_me,''), COALESCE(avatar_url,''), COALESCE(gender,'') FROM users WHERE id=?",
		userID,
	).Scan(&username, &displayName, &aboutMe, &avatarUrl, &gender)
	if err == sql.ErrNoRows {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to load user", http.StatusInternalServerError)
		log.Println("users: query error:", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"id":           fmt.Sprintf("%d", userID),
		"username":     username,
		"display_name": displayName,
		"about_me":     aboutMe,
		"avatar_url":   avatarUrl,
		"gender":       gender,
	})
}

func UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")
	if token == "" {
		http.Error(w, "token not found", http.StatusUnauthorized)
		return
	}
	userID, err := ValidateSession(token)
	if err != nil {
		http.Error(w, "invalid session", http.StatusUnauthorized)
		return
	}
	var body struct {
		Username    string `json:"username"`
		DisplayName string `json:"display_name"`
		AboutMe     string `json:"about_me"`
		Gender      string `json:"gender"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	body.Username = strings.TrimSpace(body.Username)
	if body.Username == "" {
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}
	_, err = db.Exec(
		"UPDATE users SET username=?, display_name=?, about_me=?, gender=? WHERE id=?",
		body.Username, body.DisplayName, body.AboutMe, body.Gender, userID,
	)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			http.Error(w, "username already taken", http.StatusConflict)
			return
		}
		http.Error(w, "failed to update profile", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func AvatarUploadHandler(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")
	if token == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userID, err := ValidateSession(token)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		http.Error(w, "file too large (max 5MB)", http.StatusBadRequest)
		return
	}
	file, header, err := r.FormFile("avatar")
	if err != nil {
		http.Error(w, "no file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
		http.Error(w, "unsupported format (jpg, png, gif, webp only)", http.StatusBadRequest)
		return
	}

	hasher := sha256.New()
	io.Copy(hasher, file)
	file.Seek(0, 0)
	hash := hex.EncodeToString(hasher.Sum(nil))[:12]
	filename := fmt.Sprintf("user_%d_%s%s", userID, hash, ext)

	uploadDir := "../uploads"
	os.MkdirAll(uploadDir, 0755)
	dst, err := os.Create(filepath.Join(uploadDir, filename))
	if err != nil {
		http.Error(w, "failed to save file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()
	io.Copy(dst, file)

	avatarURL := "/uploads/" + filename
	_, err = db.Exec("UPDATE users SET avatar_url=? WHERE id=?", avatarURL, userID)
	if err != nil {
		http.Error(w, "failed to update profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"avatar_url": avatarURL})
}

func AvatarDeleteHandler(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")
	if token == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userID, err := ValidateSession(token)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var avatarUrl string
	err = db.QueryRow("SELECT COALESCE(avatar_url,'') FROM users WHERE id=?", userID).Scan(&avatarUrl)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}
	if avatarUrl != "" {
		os.Remove("." + avatarUrl)
	}
	db.Exec("UPDATE users SET avatar_url=NULL WHERE id=?", userID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
