export function navLink(href: string, onNavigate: () => void) {
  return {
    onClick: (e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
      } else {
        onNavigate();
      }
    },
    onAuxClick: (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
      } else if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
      }
    },
  };
}