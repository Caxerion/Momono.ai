package auth

import (
	"fmt"
	"net/http"
	"strings"
)

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if token == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		userID, err := ValidateSession(token)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		r.Header.Set("X-User-Id", fmt.Sprintf("%d", userID))
		// Header ini khusus backend: selalu dihapus dulu lalu diisi ulang
		// kalau user benar-benar admin, biar nggak bisa dipalsukan client.
		r.Header.Del("X-User-Admin")
		if IsAdmin(userID) {
			r.Header.Set("X-User-Admin", "1")
		}
		next.ServeHTTP(w, r)
	})
}
