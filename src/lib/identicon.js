/** Stable pastel hue from an identity string — poor man's identicon. */
export function hueFromId(id) {
  let h = 0;
  for (const c of String(id ?? "")) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/** The avatar gradient — one formula so identicons match across views. */
export function identiconGradient(id) {
  const hue = hueFromId(id);
  return `radial-gradient(circle at 30% 30%, hsl(${hue} 70% 65%), hsl(${(hue + 40) % 360} 65% 45%))`;
}
