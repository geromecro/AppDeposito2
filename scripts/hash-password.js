#!/usr/bin/env node
'use strict';

const crypto = require('crypto');

const password = process.argv[2];
if (!password) {
  console.error('Uso: node scripts/hash-password.js "tuPassword"');
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
crypto.pbkdf2(password, salt, 100_000, 64, 'sha512', (err, key) => {
  if (err) throw err;
  console.log(`APP_PASSWORD_HASH="${salt}:${key.toString('hex')}"`);
  console.log('\nCopia la linea de arriba a tu archivo .env.local');
});
