require("dotenv").config();
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const session = require("express-session");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const path = require("path");
const sequelize = require("./config/database");
const models = require("./models");
const methodOverride = require("method-override");
const bcrypt = require("bcryptjs");
const flash = require("connect-flash");
const createDefaultAccounts = require("./seeders/createDefaultAccounts");
const seedProductsAndCategories = require("./seeders/seedProductsAndCategories");
const openApiSpec = require("./config/openapi");

const app = express();
const sessionStore = new SequelizeStore({ db: sequelize });

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  "/css",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist/css")),
);
app.use(
  "/js",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist/js")),
);

// Session configuration
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Method override và flash messages
app.use(methodOverride("_method"));
app.use(flash());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

let databaseInitialization;
function initializeDatabase() {
  if (!databaseInitialization) {
    databaseInitialization = (async () => {
      if (process.env.VERCEL) {
        await sequelize.sync();
      } else {
        await sequelize.sync({ alter: true });
      }
      await sessionStore.sync();

      await createDefaultAccounts();
      await seedProductsAndCategories();
    })().catch((error) => {
      databaseInitialization = undefined;
      throw error;
    });
  }

  return databaseInitialization;
}

app.use((req, res, next) => {
  initializeDatabase().then(
    () => next(),
    (error) => {
      console.error("Database initialization failed:", error);
      next(error);
    },
  );
});

// Routes
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/user");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");

// Đăng ký routes
app.use("/admin", adminRoutes);
app.use("/", userRoutes);
app.use("/cart", cartRoutes);
app.use("/", authRoutes);
app.use("/orders", orderRoutes);
app.use("/order", orderRoutes);
app.use("/", profileRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

if (require.main === module && !process.env.VERCEL) {
  initializeDatabase()
    .then(() => {
      app.listen(process.env.PORT || 3000, () => {
        console.log(`Server is running on port ${process.env.PORT || 3000}`);
      });
    })
    .catch((error) => {
      console.error("Database connection failed:", error);
      process.exitCode = 1;
    });
}

module.exports = app;
