/** Stable pastel hue from an identity string — poor man's identicon. */
export function hueFromId(id) {
  let h = 0;
  for (const c of String(id ?? "")) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
