#!/usr/bin/env node
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const { openDatabase, seedMenu, seedNews, seedAdmin } = require("../server/db");

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.error("Задайте TURSO_DATABASE_URL и TURSO_AUTH_TOKEN в файле .env");
    process.exit(1);
  }

  const { db, dbLabel, mode } = await openDatabase();
  await seedMenu(db);
  await seedNews(db);
  await seedAdmin(db, bcrypt);
  console.log(`База инициализирована (${mode}): ${dbLabel}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
