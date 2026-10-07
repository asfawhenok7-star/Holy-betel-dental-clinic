const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, ".env")
});

const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "dental_clinic",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || ""
});

async function createAdmin() {
  try {
    const name = "Holy Betel Administrator";
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    console.log("");
    console.log("Checking admin configuration...");
    console.log("Admin email:", email || "MISSING");

    if (!email || !password) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD are missing from backend/.env"
      );
    }

    if (password.length < 12) {
      throw new Error(
        "ADMIN_PASSWORD must be at least 12 characters long"
      );
    }

    console.log("Hashing administrator password...");

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `
      INSERT INTO admins
        (name, email, password_hash, role, active)
      VALUES
        ($1, $2, $3, 'admin', TRUE)
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        active = TRUE,
        updated_at = NOW()
      RETURNING id, name, email, role, active
      `,
      [name, email, passwordHash]
    );

    console.log("");
    console.log("========================================");
    console.log("   HOLY BETEL ADMIN ACCOUNT READY");
    console.log("========================================");
    console.log("");
    console.log(result.rows[0]);
    console.log("");
    console.log("Password securely hashed with bcrypt.");
    console.log("========================================");
    console.log("");

  } catch (error) {
    console.error("");
    console.error("ADMIN CREATION FAILED:");
    console.error(error.message);
    console.error("");
  } finally {
    await pool.end();
  }
}

createAdmin();