const bcrypt = require("bcryptjs");
const { User, Product, Category, Order, OrderItem } = require("../models");
const { Op } = require("sequelize");

// Trang chủ admin
exports.getAdminHomePage = (req, res) => {
  res.redirect("/admin/login");
};

// Trang đăng nhập
exports.getLoginPage = (req, res) => {
  res.render("admin/login", { error: null });
};

// Xử lý đăng nhập
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Tìm user với role admin
    const user = await User.findOne({
      where: {
        username: username,
        role: "admin",
      },
    });

    if (!user) {
      return res.render("admin/login", {
        error: "Invalid username or password",
      });
    }

    // Kiểm tra password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.render("admin/login", {
        error: "Invalid username or password",
      });
    }

    // Lưu thông tin user vào session
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    // Redirect to dashboard
    res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("Login error:", error);
    res.render("admin/login", {
      error: "An error occurred during login",
    });
  }
};

// Đăng xuất
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/login");
  });
};

// Trang dashboard
exports.getDashboard = async (req, res) => {
  try {
    const totalProducts = await Product.count();
    const totalOrders = await Order.count();
    const totalCategories = await Category.count();
    const lowStockItems = await Product.count({
      where: { stock: { [Op.lt]: 10 } },
    });

    res.render("admin/dashboard", {
      totalProducts,
      totalOrders,
      totalCategories,
      lowStockItems,
      user: req.session.user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

// Quản lý danh mục
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.render("admin/categories", { categories, user: req.session.user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

// Quản lý sản phẩm
exports.getProducts = async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = {};

    if (search) {
      whereClause = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { "$category.name$": { [Op.like]: `%${search}%` } },
        ],
      };
    }

    const products = await Product.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: "category",
        },
      ],
    });

    const categories = await Category.findAll();

    res.render("admin/products", {
      products,
      categories,
      user: req.session.user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

// Quản lý tồn kho
exports.getInventory = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [
        {
          model: Category,
          as: "category",
        },
      ],
    });
    res.render("admin/inventory", { products, user: req.session.user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};
