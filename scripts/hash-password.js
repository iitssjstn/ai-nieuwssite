// Eenmalig gebruiken om een bcrypt-hash van je wachtwoord te genereren.
// Gebruik: node scripts/hash-password.js "jouw-wachtwoord"
// De output (niet het wachtwoord zelf) is wat je opslaat als secret/env-var.

const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error("Gebruik: node scripts/hash-password.js \"jouw-wachtwoord\"");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log(hash);
