/**
 * Haptic tap. Android browsers support navigator.vibrate. iOS Safari
 * doesn't — but toggling a native switch control fires the system
 * haptic on iOS 18+, so we do that as a fallback. Costs nothing where
 * unsupported.
 */
export function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(10);
      return;
    } catch {
      /* fall through */
    }
  }

  try {
    const label = document.createElement("label");
    label.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.appendChild(input);
    document.body.appendChild(label);
    label.click();
    requestAnimationFrame(() => label.remove());
  } catch {
    /* silence is an acceptable haptic */
  }
}
