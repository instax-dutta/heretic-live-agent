const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{1,96}$/;

export function normalizeUsername(value) {
  return String(value || "").trim().replace(/^@/, "");
}

export function isValidUsername(value) {
  return USERNAME_PATTERN.test(normalizeUsername(value));
}
