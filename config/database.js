require('dotenv').config();
const Sequelize = require("sequelize");

const dialect = (process.env.DB_DIALECT || "mysql").toLowerCase();
const logging =
  process.env.NODE_ENV === "development" ? console.log : false;
let sequelize;

if (dialect === "postgres" || dialect === "postgresql") {
  require("pg");

  const databaseUrl = process.env.DATABASE_URL || process.env.DB_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL (or DB_URL) is required when DB_DIALECT=postgres.",
    );
  }

  sequelize = new Sequelize(databaseUrl, {
    dialect: "postgres",
    logging,
    dialectOptions:
      process.env.DB_SSL === "true"
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
  });
} else if (dialect === "mysql") {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      dialect,
      logging,
      port: process.env.DB_PORT,
    },
  );
<<<<<<< HEAD
=======
} else if (dialect === "mssql" || dialect === "sqlserver") {
  // SQL Server is accessed through the `tedious` driver. For a local SQL
  // Server Express installation, set DB_INSTANCE=SQLEXPRESS and leave
  // DB_PORT empty: SQL Server Browser resolves the instance port for us.
  const instanceName = process.env.DB_INSTANCE;
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;

  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST || "localhost",
      dialect: "mssql",
      port,
      logging,
      dialectOptions: {
        options: {
          encrypt: process.env.DB_ENCRYPT === "true",
          trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
          ...(instanceName ? { instanceName } : {}),
        },
      },
    },
  );
>>>>>>> 6996f48 (Initial commit - Phuoc Store)
} else {
  throw new Error(`Unsupported DB_DIALECT: ${dialect}`);
}

module.exports = sequelize;
