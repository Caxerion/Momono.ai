package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

var githubOAuth = &oauth2.Config{
	Scopes:   []string{"read:user", "user:email"},
	Endpoint: github.Endpoint,
}

func InitGitHubOAuth() {
	githubOAuth.ClientID = os.Getenv("GITHUB_CLIENT_ID")
	githubOAuth.ClientSecret = os.Getenv("GITHUB_CLIENT_SECRET")
	githubOAuth.RedirectURL = "http://localhost:8000/api/auth/github/callback"
}

func GitHubLoginHandler(w http.ResponseWriter, r *http.Request) {
	url := githubOAuth.AuthCodeURL("state-token", oauth2.AccessTypeOnline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func GitHubCallbackHandler(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "code not found", http.StatusBadRequest)
		return
	}

	token, err := githubOAuth.Exchange(r.Context(), code)
	if err != nil {
		http.Error(w, "failed to exchange code", http.StatusInternalServerError)
		log.Println("github oauth exchange error:", err)
		return
	}

	client := githubOAuth.Client(r.Context(), token)
	resp, err := client.Get("https://api.github.com/user")
	if err != nil {
		http.Error(w, "failed to fetch user data", http.StatusInternalServerError)
		log.Println("github api error:", err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var ghUser struct {
		ID    int    `json:"id"`
		Login string `json:"login"`
		Email string `json:"email"`
	}
	if err := json.Unmarshal(body, &ghUser); err != nil {
		http.Error(w, "failed to parse user data", http.StatusInternalServerError)
		return
	}

	if ghUser.Email == "" {
		emailsResp, err := client.Get("https://api.github.com/user/emails")
		if err == nil {
			defer emailsResp.Body.Close()
			var emails []struct {
				Email   string `json:"email"`
				Primary bool   `json:"primary"`
				Verified bool  `json:"verified"`
			}
			if json.NewDecoder(emailsResp.Body).Decode(&emails) == nil {
				for _, e := range emails {
					if e.Primary && e.Verified {
						ghUser.Email = e.Email
						break
					}
				}
				if ghUser.Email == "" {
					for _, e := range emails {
						if e.Verified {
							ghUser.Email = e.Email
							break
						}
					}
				}
			}
		}
	}

	githubID := strconv.Itoa(ghUser.ID)
	userID, err := FindUserByGithubID(githubID)
	if err != nil {
		userID, err = CreateUserWithGithub(githubID, ghUser.Login, ghUser.Email)
		if err != nil {
			http.Error(w, "failed to create user", http.StatusInternalServerError)
			log.Println("github: create user error:", err)
			return
		}
	}

	sessionToken, err := CreateSession(userID)
	if err != nil {
		http.Error(w, "failed to create session", http.StatusInternalServerError)
		log.Println("github: create session error:", err)
		return
	}

	http.Redirect(w, r,
		fmt.Sprintf("http://localhost:8000?token=%s", sessionToken),
		http.StatusTemporaryRedirect,
	)
}
