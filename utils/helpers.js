export const CODE_RE = /^[A-Za-z0-9]{6,8}$/;

export function isValidCode(code) {
  return /^[a-zA-Z0-9]{3,10}$/.test(code);}

export function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (e) {
    return false;
  }
}
