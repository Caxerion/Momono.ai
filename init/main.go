package main

import (
	"context"
	"fmt"
	"log"
	"momono/init/auth"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"
	"time"

	"github.com/joho/godotenv"
)

const (
	webPort = "8000"
	apiPort = "8001"
)

var (
	serverDir = "../server"
	distDir   = "../ui/dist"
	apiProc   *exec.Cmd
	stopping  = false
)

func main() {
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "build":
			buildUI()
			return
		case "doctor":
			doctor()
			return
		case "help", "-h", "--help":
			fmt.Println("Perintah: go run main.go [start|build|doctor]")
			fmt.Println("  (tanpa argumen = start: jalankan server + buka app)")
			return
		}
	}
	run()
}

func run() {
	godotenv.Load()

	if err := auth.Init("auth.db"); err != nil {
		log.Fatal("Gagal inisialisasi auth.db: ", err)
	}

	auth.InitGitHubOAuth()

	if _, err := exec.LookPath("python"); err != nil {
		if _, err2 := exec.LookPath("python3"); err2 != nil {
			log.Fatal("Python tidak ditemukan. Install Python 3.10+ dulu.")
		}
	}

	if _, err := os.Stat(distDir); os.IsNotExist(err) {
		log.Println("WARNING: ui/dist belum ada. Jalankan `go run main.go build` dulu.")
	}

	startAPI()
	go supervise()

	mux := http.NewServeMux()
	target, _ := url.Parse("http://127.0.0.1:" + apiPort)
	proxy := httputil.NewSingleHostReverseProxy(target)

	mux.HandleFunc("POST /api/auth/register", auth.RegisterHandler)
	mux.HandleFunc("POST /api/auth/login", auth.LoginHandler)
	mux.HandleFunc("POST /api/auth/logout", auth.LogoutHandler)
	mux.HandleFunc("GET /api/auth/me", auth.ProfileHandler)
	mux.HandleFunc("PUT /api/auth/profile", auth.UpdateProfileHandler)
	mux.HandleFunc("POST /api/auth/avatar", auth.AvatarUploadHandler)
	mux.HandleFunc("DELETE /api/auth/avatar", auth.AvatarDeleteHandler)
	mux.HandleFunc("GET /api/auth/github", auth.GitHubLoginHandler)
	mux.HandleFunc("GET /api/auth/github/callback", auth.GitHubCallbackHandler)
	mux.HandleFunc("GET /api/users/{id}", auth.PublicUserProfileHandler)
	mux.Handle("/api/", auth.RequireAuth(proxy))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("../uploads"))))
	mux.Handle("/generated/", http.StripPrefix("/generated/", http.FileServer(http.Dir("../server/generated"))))
	mux.Handle("/", http.FileServer(http.Dir(distDir)))

	srv := &http.Server{Addr: ":" + webPort, Handler: mux}
	go func() {
		log.Printf("Momono web server di http://127.0.0.1:%s", webPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	// buka browser setelah API & web siap
	go func() {
		time.Sleep(3 * time.Second)
		if !stopping {
			openBrowser("http://127.0.0.1:" + webPort)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	<-sig
	log.Println("Shutting down...")
	stopping = true
	if apiProc != nil && apiProc.Process != nil {
		_ = apiProc.Process.Kill()
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}

// supervise: jaga agar proses API (Python) selalu hidup
func supervise() {
	for {
		if stopping {
			return
		}
		if apiProc != nil {
			_ = apiProc.Wait()
		}
		if stopping {
			return
		}
		log.Println("API mati, restart dalam 2 detik...")
		time.Sleep(2 * time.Second)
		if stopping {
			return
		}
		startAPI()
	}
}

func startAPI() {
	cmd := exec.Command("python", "-m", "uvicorn", "main:app",
		"--host", "127.0.0.1", "--port", apiPort)
	cmd.Dir = serverDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		log.Printf("Gagal start API: %v", err)
		return
	}
	apiProc = cmd
	log.Printf("API (uvicorn) jalan di http://127.0.0.1:%s", apiPort)
}

func buildUI() {
	log.Println("Build UI...")
	cmd := exec.Command("npm", "run", "build")
	cmd.Dir = "../ui"
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		log.Fatalf("Gagal build UI: %v", err)
	}
	log.Println("UI selesai di-build (ui/dist).")
}

func doctor() {
	checks := []struct {
		name string
		ok   bool
	}{
		{"python", lookPath("python") || lookPath("python3")},
		{"node/npm", lookPath("npm")},
		{"ui/dist", dirExists(distDir)},
		{"server/.env", fileExists(filepath.Join(serverDir, ".env"))},
	}
	for _, c := range checks {
		status := "OK"
		if !c.ok {
			status = "KURANG"
		}
		fmt.Printf("[%-10s] %s\n", status, c.name)
	}
}

func lookPath(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

func dirExists(p string) bool {
	info, err := os.Stat(p)
	return err == nil && info.IsDir()
}

func fileExists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}

func openBrowser(u string) {
	var err error
	switch runtime.GOOS {
	case "windows":
		err = exec.Command("cmd", "/c", "start", u).Start()
	case "darwin":
		err = exec.Command("open", u).Start()
	default:
		err = exec.Command("xdg-open", u).Start()
	}
	if err != nil {
		log.Printf("Buka browser manual: %s", u)
	}
}
