const crypto = require("crypto");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const passwordHash = crypto
    .createHash("sha256")
    .update(`${salt}${password}`)
    .digest("hex");

  return {
    passwordHash,
    salt
  };
}

function verifyPassword(password, salt, expectedHash) {
  const { passwordHash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(
    Buffer.from(passwordHash, "hex"),
    Buffer.from(expectedHash, "hex")
  );
}

module.exports = {
  hashPassword,
  verifyPassword
};
