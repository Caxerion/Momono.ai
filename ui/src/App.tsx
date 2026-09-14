import { useEffect, useRef, useState } from "react";
import { useHashRouter } from "./hooks/useHashRouter";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import CreateCharacter from "./components/CreateCharacter";
import CharacterProfile from "./components/CharacterProfile";
import CharacterSidebar from "./components/CharacterSidebar";
import Discover from "./components/Discover";
import Generate from "./components/Generate";
import Settings from "./components/Settings";
import Admin from "./components/Admin";
import AdminSidebar, { type AdminTab } from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import UserProfilePage from "./components/UserProfile";
import Login from "./components/Login";
import WelcomeModal from "./components/WelcomeModal";
import type { Conversation, Message, Persona, UserProfile } from "./types";

const DEFAULT_PROMPT =
  "You MUST reply in roleplay format. " +
  "Every response MUST contain actions in asterisks *like this*. " +
  "CORRECT example: *he walks closer and sits beside you* Hey, what are you doing? " +
  "WRONG example: Hey, what are you doing? (no action, DO NOT do this). " +
  "Use *asterisks* for: actions, body movements, facial expressions, feelings, sounds, situation descriptions. " +
  "Mix actions and dialogue in one paragraph naturally. " +
  "Never start a response without an asterisk action first.";

// Ganti placeholder {user} di teks karakter (greeting/about/personality)
// dengan nama user yang sedang ngobrol. Pakai display name kalau ada,
// fallback ke username, kalau kosong pakai "user".
function resolveUserVars(text: string | undefined | null, profile: UserProfile | null): string {
  if (!text) return text ?? "";
  const name = profile?.display_name?.trim() || profile?.username?.trim() || "user";
  return text.replace(/\{user\}/gi, name);
}

export default function App() {
  const { route, navigate } = useHashRouter();
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("token")
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [dark, setDark] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [showCharacterSidebar, setShowCharacterSidebar] = useState(false);
  const [regenView, setRegenView] = useState<Record<number, number>>({});
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileConversationCount, setProfileConversationCount] = useState(0);
  const [favoritePersonas, setFavoritePersonas] = useState<Persona[]>([]);
  const [allPersonas, setAllPersonas] = useState<Persona[]>([]);
  const [viewUserProfile, setViewUserProfile] = useState<UserProfile | null>(null);
  const [viewUserPersonas, setViewUserPersonas] = useState<Persona[]>([]);
  const [viewUserFavorites, setViewUserFavorites] = useState<Persona[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [adminCollapsed, setAdminCollapsed] = useState(false);

  const selectingRef = useRef<string | null>(null);
  const triedRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      handleLogin(urlToken);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  function authHeaders(): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function getJSON(url: string, init?: RequestInit): Promise<any> {
    try {
      const r = await fetch(url, {
        ...init,
        headers: { ...authHeaders(), ...init?.headers },
      });
      if (r.status === 401) {
        setToken(null);
        localStorage.removeItem("token");
        return null;
      }
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  async function loadConversations(pid?: string | null) {
    const target = pid !== undefined ? pid : route.path === "chat" ? route.personaId : null;
    const url = target ? `/api/conversations?persona_id=${target}` : "/api/conversations";
    const data = await getJSON(url);
    if (data) setConversations(data);
  }

  async function loadAllConversations() {
    const data = await getJSON("/api/conversations");
    if (data) setAllConversations(data);
  }

  async function loadPersonas() {
    const data = await getJSON("/api/personas?mine=true");
    if (data) setPersonas(data);
  }

  async function loadProfile() {
    const data = await getJSON("/api/auth/me");
    if (data) {
      setUserProfile(data);
      if (!data.display_name && !data.gender) {
        setShowWelcome(true);
      }
    }
  }

  async function loadFavorites() {
    const data = await getJSON("/api/user/favorites");
    if (data) setFavoritePersonas(data);
  }

  async function loadAllPersonas() {
    const data = await getJSON("/api/personas");
    if (data) setAllPersonas(data);
  }

  useEffect(() => {
    if (token) {
      loadProfile();
      loadConversations();
      loadAllConversations();
      loadPersonas();
      loadFavorites();
      loadAllPersonas();
    } else {
      setUserProfile(null);
      setFavoritePersonas([]);
    }
  }, [token]);

  function findPersona(id: string): Persona | null {
    return (
      personas.find((p) => p.id === id) ??
      allPersonas.find((p) => p.id === id) ??
      favoritePersonas.find((p) => p.id === id) ??
      null
    );
  }

  useEffect(() => {
    if (
      route.path === "chat" &&
      route.personaId &&
      messages.length === 0 &&
      !selectingRef.current &&
      triedRef.current !== route.personaId
    ) {
      const known = [personas, allPersonas, favoritePersonas].some((list) =>
        list.some((p) => p.id === route.personaId)
      );
      if (known) handleSelectPersona(route.personaId);
    }
  }, [route, personas, allPersonas, favoritePersonas, messages.length]);

  useEffect(() => {
    if (route.path === "chat" && route.personaId && !findPersona(route.personaId) && token) {
      getJSON(`/api/personas/${route.personaId}`).then((data) => {
        if (data && !data.error) {
          setAllPersonas((prev) =>
            prev.some((p) => p.id === data.id) ? prev : [...prev, data]
          );
        }
      });
    }
  }, [route, token, personas, allPersonas, favoritePersonas]);

  useEffect(() => {
    if (route.path === "profile" && token) {
      const pid = route.personaId;
      let cancelled = false;

      setProfileConversationCount(0);

      getJSON(`/api/conversations?persona_id=${pid}`).then((data) => {
        if (!cancelled) setProfileConversationCount(data?.length ?? 0);
      });

      return () => {
        cancelled = true;
      };
    }
  }, [route, token]);

  useEffect(() => {
    if (route.path === "me" && token) {
      loadFavorites();
      loadPersonas();
    }
  }, [route, token]);

  useEffect(() => {
    if (route.path === "user" && token) {
      let cancelled = false;
      const uid = route.userId;
      setViewUserPersonas([]);
      setViewUserFavorites([]);
      getJSON(`/api/users/${uid}`).then((data) => {
        if (cancelled || !data || data.error) return;
        setViewUserProfile(data);
      });
      getJSON(`/api/personas?user_id=${uid}`).then((data) => {
        if (!cancelled && data) setViewUserPersonas(data);
      });
      getJSON(`/api/user/favorites?user_id=${uid}`).then((data) => {
        if (!cancelled && data) setViewUserFavorites(data);
      });
      return () => {
        cancelled = true;
      };
    }
  }, [route, token]);

  useEffect(() => {
    if (route.path === "discover" && token) {
      loadAllPersonas();
      loadFavorites();
    }
  }, [route, token]);

  useEffect(() => {
    if (route.path === "admin" && !userProfile?.is_admin) {
      navigate({ path: "home" });
    }
  }, [route, userProfile, navigate]);

  async function handleToggleFavorite(persona: Persona, favorite: boolean) {
    const r = await getJSON(`/api/personas/${persona.id}/favorite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite }),
    });
    if (r) loadFavorites();
  }

  function handleViewUser(userId: number | string) {
    if (userId === undefined || userId === null) return;
    navigate({ path: "user", userId: String(userId) });
  }

  async function handleSelectPersona(pid: string) {
    if (selectingRef.current === pid) return;
    selectingRef.current = pid;
    triedRef.current = pid;
    navigate({ path: "chat", personaId: pid });
    setConversationId(null);
    setMessages([]);
    setShowCharacterSidebar(false);
    try {
      const persona = findPersona(pid);
      const data = await getJSON(`/api/conversations?persona_id=${pid}`);
      if (data && data.length > 0) {
        const latest = data[0];
        setConversationId(latest.id);
        const msgs = await getJSON(`/api/conversations/${latest.id}/messages`);
        if (msgs) {
          const mapped = msgs.map((m: { role: string; content: string; regenerate_index?: number }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            regenerate_index: m.regenerate_index ?? 0,
          }));
          const hasGreeting = persona?.greeting && mapped.some((m: { role: string; content: string }) => m.content === resolveUserVars(persona.greeting, userProfile));
          if (!hasGreeting && persona?.greeting) {
            mapped.unshift({ role: "assistant", content: resolveUserVars(persona.greeting, userProfile) });
          }
          setMessages(mapped);
          setRegenView({});
        }
      } else if (persona?.greeting) {
        setMessages([{ role: "assistant", content: resolveUserVars(persona.greeting, userProfile) }]);
      }
      setConversations(data || []);
    } finally {
      selectingRef.current = null;
    }
  }

  function handleBackToDefault() {
    navigate({ path: "home" });
    setConversationId(null);
    setMessages([]);
    setShowCharacterSidebar(false);
    loadConversations(null);
  }

  async function handleSelectConversation(id: string) {
    setConversationId(id);
    setShowCharacterSidebar(false);
    const d = await getJSON(`/api/conversations/${id}/messages`);
    if (!d) return;
    const mapped = d.map((m: { role: string; content: string; regenerate_index?: number }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      regenerate_index: m.regenerate_index ?? 0,
    }));
    const persona = personas.find((p) => p.id === (route.path === "chat" ? route.personaId : null));
    const hasGreeting = persona?.greeting && mapped.some((m: { role: string; content: string }) => m.content === resolveUserVars(persona.greeting, userProfile));
    if (!hasGreeting && persona?.greeting) {
      mapped.unshift({ role: "assistant", content: resolveUserVars(persona.greeting, userProfile) });
    }
    setMessages(mapped);
    setRegenView({});
  }

  function handleNewChat() {
    setConversationId(null);
    setShowCharacterSidebar(false);
    setRegenView({});
    const persona = personas.find((p) => p.id === (route.path === "chat" ? route.personaId : null));
    if (persona?.greeting) {
      setMessages([{ role: "assistant", content: resolveUserVars(persona.greeting, userProfile) }]);
    } else {
      setMessages([]);
    }
  }

  async function handleDeleteHistory(pid: string) {
    await getJSON(`/api/conversations/persona/${pid}`, { method: "DELETE" });
    setConversations([]);
    setConversationId(null);
    setMessages([]);
    setShowCharacterSidebar(false);
    loadAllConversations();
  }

  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId;
    const pid = route.path === "chat" ? route.personaId : null;
    const d = await getJSON("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Chat", persona_id: pid }),
    });
    if (!d) return "";
    setConversationId(d.id);
    const persona = personas.find((p) => p.id === pid);
    if (persona?.greeting) {
      await fetch(`/api/conversations/${d.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "assistant", content: resolveUserVars(persona.greeting, userProfile) }),
      });
    }
    loadConversations();
    loadAllConversations();
    return d.id;
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setRegenView({});
    const cid = await ensureConversation();
    const pid = route.path === "chat" ? route.personaId : null;
    setMessages((m) => [
      ...m,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setBusy(true);
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        conversation_id: cid || null,
        message: text,
        persona_id: pid,
        system_prompt: DEFAULT_PROMPT,
        user_name: userProfile?.display_name || "",
      }),
    });
    if (r.status === 401) {
      setToken(null);
      localStorage.removeItem("token");
      setBusy(false);
      return;
    }
    const reader = r.body!.getReader();
    const dec = new TextDecoder();
    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += dec.decode(value, { stream: true });
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: acc };
        return c;
      });
    }
    setBusy(false);
    loadConversations();
    loadAllConversations();
  }

  async function regenerate() {
    if (busy || !conversationId) return;
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) return;
    const lastUserMsg = messages[lastUserIdx];

    let maxIdx = 0;
    for (let i = lastUserIdx + 1; i < messages.length; i++) {
      if (messages[i].role !== "assistant") break;
      if ((messages[i].regenerate_index ?? 0) >= maxIdx) maxIdx = (messages[i].regenerate_index ?? 0) + 1;
    }
    if (maxIdx >= 25) return;
    const nextIdx = maxIdx;

    setBusy(true);
    setMessages((m) => [...m, { role: "assistant", content: "", regenerate_index: nextIdx }]);
    setRegenView((v) => ({ ...v, [lastUserIdx]: nextIdx }));

    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        conversation_id: conversationId,
        message: lastUserMsg.content,
        persona_id: route.path === "chat" ? route.personaId : null,
        system_prompt: DEFAULT_PROMPT,
        user_name: userProfile?.display_name || "",
        is_regenerate: true,
        regenerate_index: nextIdx,
      }),
    });
    if (r.status === 401) {
      setToken(null);
      localStorage.removeItem("token");
      setBusy(false);
      return;
    }
    const reader = r.body!.getReader();
    const dec = new TextDecoder();
    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += dec.decode(value, { stream: true });
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: acc, regenerate_index: nextIdx };
        return c;
      });
    }
    setBusy(false);
  }

  function prevRegen(groupIdx: number) {
    setRegenView((v) => {
      const cur = v[groupIdx] ?? 0;
      return { ...v, [groupIdx]: Math.max(0, cur - 1) };
    });
  }

  function nextRegen(groupIdx: number, max: number) {
    setRegenView((v) => {
      const cur = v[groupIdx] ?? 0;
      return { ...v, [groupIdx]: Math.min(max, cur + 1) };
    });
  }

  function handleLogin(newToken: string) {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    navigate({ path: "discover" });
  }

  function handleLogout() {
    fetch("/api/auth/logout", {
      method: "POST",
      headers: authHeaders(),
    }).finally(() => {
      localStorage.removeItem("token");
      setToken(null);
      setMessages([]);
      setConversations([]);
      setConversationId(null);
    });
  }

  async function handleWelcomeComplete(data: { displayName: string; gender: string }) {
    if (!userProfile) return;
    const r = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        username: userProfile.username,
        display_name: data.displayName,
        about_me: userProfile.about_me || "",
        gender: data.gender,
      }),
    });
    if (r.ok) {
      setShowWelcome(false);
      loadProfile();
    } else {
      throw new Error("Failed to save");
    }
  }

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  const currentPersona =
    route.path === "chat" || route.path === "profile" || route.path === "edit"
      ? findPersona(route.personaId)
      : null;

  const chattedIds = new Set(
    allConversations.map((c) => c.persona_id).filter((id): id is string => Boolean(id))
  );
  const personaOrder = new Map<string, number>();
  allConversations.forEach((c, i) => {
    if (c.persona_id && !personaOrder.has(c.persona_id)) {
      personaOrder.set(c.persona_id, i);
    }
  });
  const sidebarPersonas = Array.from(
    new Map(
      [...allPersonas, ...personas, ...favoritePersonas]
        .filter((ps) => chattedIds.has(ps.id))
        .map((ps) => [ps.id, ps])
    ).values()
  ).sort(
    (a, b) => (personaOrder.get(a.id) ?? Infinity) - (personaOrder.get(b.id) ?? Infinity)
  );

  const favoriteIds = new Set(favoritePersonas.map((f) => f.id));

  return (
    <div className={`${dark ? "dark" : ""} flex h-screen overflow-hidden`}>
      {route.path === "admin" && userProfile?.is_admin ? (
        <AdminSidebar
          collapsed={adminCollapsed}
          tab={adminTab}
          userProfile={userProfile}
          onToggleCollapse={() => setAdminCollapsed((x) => !x)}
          onSelectTab={setAdminTab}
          onBackToUser={() => navigate({ path: "home" })}
          onLogout={handleLogout}
        />
      ) : (
        <Sidebar
        conversations={conversations}
        personas={sidebarPersonas}
        createdPersonas={personas}
        personaId={route.path === "chat" ? route.personaId : null}
        userProfile={userProfile}
        isAdmin={userProfile?.is_admin ?? false}
        onOpenDiscover={() => navigate({ path: "discover" })}
        onOpenGenerate={() => navigate({ path: "generate" })}
        onOpenAdmin={() => navigate({ path: "admin" })}
        onSelectPersona={handleSelectPersona}
        onNewPersona={() => { setEditingPersona(null); navigate({ path: "create" }); }}
        onEditPersona={(p) => { setEditingPersona(p); navigate({ path: "edit", personaId: p.id }); }}
        onDeleteHistory={handleDeleteHistory}
        onOpenProfile={() => navigate({ path: "me" })}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={handleLogout}
      />
      )}
      <div className="flex-1 flex flex-col relative min-h-0">
        {route.path === "create" || route.path === "edit" ? (
          <CreateCharacter
            persona={route.path === "edit" ? editingPersona : null}
            token={token}
            createdBy={userProfile?.username ?? ""}
            onBack={() => {
              setEditingPersona(null);
              if (route.path === "edit" && editingPersona) {
                navigate({ path: "chat", personaId: editingPersona.id });
              } else {
                navigate({ path: "home" });
              }
            }}
            onSaved={loadPersonas}
          />
        ) : route.path === "me" && userProfile ? (
          <UserProfilePage
            profile={userProfile}
            token={token}
            onBack={() => navigate({ path: "home" })}
            onSaved={(updated) => {
              setUserProfile(updated);
              loadProfile();
            }}
            createdPersonas={personas.filter(
              (p) => p.created_by === userProfile.username
            )}
            favoritedPersonas={favoritePersonas}
            onSelectPersona={(pid) => handleSelectPersona(pid)}
            onEditPersona={(p) => {
              setEditingPersona(p);
              navigate({ path: "edit", personaId: p.id });
            }}
            onViewUser={handleViewUser}
          />
        ) : route.path === "user" && viewUserProfile ? (
          <UserProfilePage
            profile={viewUserProfile}
            token={token}
            editable={Boolean(userProfile && viewUserProfile.username === userProfile.username)}
            onBack={() => navigate({ path: "home" })}
            createdPersonas={viewUserPersonas}
            favoritedPersonas={viewUserFavorites}
            onSelectPersona={(pid) => handleSelectPersona(pid)}
            onViewUser={handleViewUser}
          />
        ) : route.path === "profile" && currentPersona ? (
          <CharacterProfile
            persona={currentPersona}
            onBack={() => navigate({ path: "chat", personaId: currentPersona.id })}
            onEdit={
              currentPersona.user_id && userProfile?.id !== undefined && Number(userProfile.id) === currentPersona.user_id
                ? (p) => { setEditingPersona(p); navigate({ path: "edit", personaId: p.id }); }
                : undefined
            }
            onChat={(pid) => handleSelectPersona(pid)}
            onViewUser={handleViewUser}
            conversationCount={profileConversationCount}
          />
        ) : route.path === "discover" ? (
          <Discover
            personas={allPersonas}
            favorites={favoriteIds}
            userProfile={userProfile}
            dark={dark}
            onToggleDark={() => setDark(!dark)}
            onOpenProfile={() => navigate({ path: "me" })}
            onOpenSettings={() => setSettingsOpen(true)}
            onLogout={handleLogout}
            onChat={(pid) => handleSelectPersona(pid)}
            onToggleFavorite={handleToggleFavorite}
            onViewUser={handleViewUser}
          />
        ) : route.path === "generate" ? (
          <Generate token={token} />
        ) : route.path === "admin" && userProfile?.is_admin ? (
          <div className="flex-1 flex flex-col min-h-0">
            <AdminNavbar
              userProfile={userProfile}
              collapsed={adminCollapsed}
              onToggleCollapse={() => setAdminCollapsed((x) => !x)}
              onBack={() => navigate({ path: "home" })}
              onLogout={handleLogout}
            />
            <Admin
              token={token}
              tab={adminTab}
              onChangeTab={setAdminTab}
              onBack={() => navigate({ path: "home" })}
              onViewUser={handleViewUser}
            />
          </div>
        ) : route.path === "chat" && currentPersona ? (
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
                <ChatArea
                  persona={currentPersona}
                  messages={messages}
                  input={input}
                  setInput={setInput}
                  onSend={send}
                  onRegenerate={regenerate}
                  regenView={regenView}
                  onPrevRegen={prevRegen}
                  onNextRegen={nextRegen}
                  busy={busy}
                  userProfile={userProfile}
                  onViewUser={handleViewUser}
                  onBack={handleBackToDefault}
                  onOpenProfile={() => navigate({ path: "me" })}
                  onOpenPersonaProfile={() => navigate({ path: "profile", personaId: currentPersona.id })}
                  onToggleSidebar={() => setShowCharacterSidebar(!showCharacterSidebar)}
                  sidebarOpen={showCharacterSidebar}
                  dark={dark}
                  onToggleDark={() => setDark(!dark)}
                  onOpenSettings={() => setSettingsOpen(true)}
                  onLogout={handleLogout}
                />
              </div>
            <CharacterSidebar
              persona={currentPersona}
              conversations={conversations}
              conversationId={conversationId}
              visible={showCharacterSidebar}
              token={token}
              onNewChat={handleNewChat}
              onSelectConversation={handleSelectConversation}
              onViewProfile={(p) => navigate({ path: "profile", personaId: p.id })}
              onViewUser={handleViewUser}
            />
          </div>
        ) : (
          <>
            <ChatArea
              persona={currentPersona}
              messages={messages}
              input={input}
              setInput={setInput}
              onSend={send}
              onRegenerate={regenerate}
              regenView={regenView}
              onPrevRegen={prevRegen}
              onNextRegen={nextRegen}
              busy={busy}
              userProfile={userProfile}
              onBack={handleBackToDefault}
              onOpenProfile={() => navigate({ path: "me" })}
              onOpenPersonaProfile={() =>
                currentPersona && navigate({ path: "profile", personaId: currentPersona.id })
              }
              onToggleSidebar={() => setShowCharacterSidebar(!showCharacterSidebar)}
              sidebarOpen={showCharacterSidebar}
              dark={dark}
              onToggleDark={() => setDark(!dark)}
              onOpenSettings={() => setSettingsOpen(true)}
              onLogout={handleLogout}
            />
          </>
        )}
      </div>

      {settingsOpen && userProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          style={{ animation: "fade-in 0.15s ease-out" }}
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-[440px] max-w-[92vw] max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl"
            style={{ animation: "pop-in 0.2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Settings
              profile={userProfile}
              token={token}
              onBack={() => setSettingsOpen(false)}
              onSaved={(updated) => {
                setUserProfile(updated);
                loadProfile();
              }}
            />
          </div>
        </div>
      )}

      <WelcomeModal
        isOpen={showWelcome}
        onComplete={handleWelcomeComplete}
      />

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pop-in {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
