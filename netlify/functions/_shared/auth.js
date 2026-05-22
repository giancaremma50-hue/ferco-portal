function validatePassword(provided) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return false;
  return provided === secret;
}

module.exports = { validatePassword };
