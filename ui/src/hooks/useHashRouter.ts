import { useCallback, useEffect, useState } from "react";

export type Route =
  | { path: "home" }
  | { path: "discover" }
  | { path: "generate" }
  | { path: "chat"; personaId: string }
  | { path: "profile"; personaId: string }
  | { path: "me" }
  | { path: "user"; userId: string }
  | { path: "create" }
  | { path: "edit"; personaId: string }
  | { path: "settings" };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const segs = hash.split("/").filter(Boolean);

  if (segs[0] === "chat" && segs[1]) return { path: "chat", personaId: segs[1] };
  if (segs[0] === "profile" && segs[1]) return { path: "profile", personaId: segs[1] };
  if (segs[0] === "user" && segs[1]) return { path: "user", userId: segs[1] };
  if (segs[0] === "edit" && segs[1]) return { path: "edit", personaId: segs[1] };
  if (segs[0] === "discover") return { path: "discover" };
  if (segs[0] === "generate") return { path: "generate" };
  if (segs[0] === "me") return { path: "me" };
  if (segs[0] === "create") return { path: "create" };
  if (segs[0] === "settings") return { path: "settings" };
  return { path: "home" };
}

export function useHashRouter() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    function onHashChange() {
      setRoute(parseHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((to: Route) => {
    let hash = "#/";
    switch (to.path) {
      case "home": hash = "#/"; break;
      case "discover": hash = "#/discover"; break;
      case "generate": hash = "#/generate"; break;
      case "chat": hash = `#/chat/${to.personaId}`; break;
      case "profile": hash = `#/profile/${to.personaId}`; break;
      case "me": hash = "#/me"; break;
      case "user": hash = `#/user/${to.userId}`; break;
      case "create": hash = "#/create"; break;
      case "edit": hash = `#/edit/${to.personaId}`; break;
      case "settings": hash = "#/settings"; break;
    }
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  }, []);

  return { route, navigate };
}
