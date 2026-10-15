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
    const totalUsers = await User.count();
    const lowStockItems = await Product.count({
      where: { stock: { [Op.lt]: 10 } },
    });

    res.render("admin/dashboard", {
      totalProducts,
      totalOrders,
      totalCategories,
      totalUsers,
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

// Quản lý người dùng (Users)
exports.getUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    let whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
      ];
    }

    if (role && (role === "admin" || role === "user")) {
      whereClause.role = role;
    }

    const users = await User.findAll({
      where: whereClause,
      order: [["id", "DESC"]],
      attributes: ["id", "name", "email", "username", "role", "createdAt"],
    });

    res.render("admin/users", {
      users,
      user: req.session.user,
      search: search || "",
      role: role || "",
      error: req.flash ? req.flash("error") : null,
      success: req.flash ? req.flash("success") : null,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).send("Server Error");
  }
};

// Tạo người dùng mới
exports.createUser = async (req, res) => {
  try {
    const { name, email, username, password, role } = req.body;

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, ...(username ? [{ username }] : [])],
      },
    });

    if (existingUser) {
      if (req.flash) req.flash("error", "Email hoặc Username đã tồn tại!");
      return res.redirect("/admin/users");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email,
      username: username || null,
      password: hashedPassword,
      role: role || "user",
    });

    if (req.flash) req.flash("success", "Thêm người dùng thành công!");
    res.redirect("/admin/users");
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).send("Server Error");
  }
};

// Cập nhật người dùng
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, username, password, role } = req.body;

    const targetUser = await User.findByPk(id);
    if (!targetUser) {
      return res.status(404).send("User not found");
    }

    // Kiểm tra email hoặc username trùng với user khác
    const duplicate = await User.findOne({
      where: {
        id: { [Op.ne]: id },
        [Op.or]: [{ email }, ...(username ? [{ username }] : [])],
      },
    });

    if (duplicate) {
      if (req.flash) req.flash("error", "Email hoặc Username đã bị trùng với tài khoản khác!");
      return res.redirect("/admin/users");
    }

    const updateData = {
      name,
      email,
      username: username || null,
      role: role || targetUser.role,
    };

    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await targetUser.update(updateData);

    if (req.flash) req.flash("success", "Cập nhật người dùng thành công!");
    res.redirect("/admin/users");
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).send("Server Error");
  }
};

// Xóa người dùng
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Không cho phép tự xóa tài khoản của chính mình
    if (req.session.user && req.session.user.id === parseInt(id)) {
      return res.status(400).json({ message: "Không thể tự xóa tài khoản đang đăng nhập!" });
    }

    const targetUser = await User.findByPk(id);
    if (targetUser) {
      await targetUser.destroy();
      return res.json({ message: "Đã xóa người dùng thành công" });
    }

    res.status(404).json({ message: "User not found" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
