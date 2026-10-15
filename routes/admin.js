const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { User, Product, Category, Order, OrderItem } = require("../models");
const { Op } = require("sequelize");
const moment = require("moment");
const isAdmin = require("../middleware/isAdmin");
const adminController = require("../controllers/adminController");

// Cấu hình multer để lưu file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "public/uploads/products";
    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Kiểm tra loại file
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG and GIF are allowed!"),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // giới hạn 5MB
  },
});

// Trang chủ admin
router.get("/", adminController.getAdminHomePage);

// Trang đăng nhập
router.get("/login", adminController.getLoginPage);

// Xử lý đăng nhập
router.post("/login", adminController.login);

// Đăng xuất
router.get("/logout", adminController.logout);

// Dashboard
router.get("/dashboard", isAdmin, adminController.getDashboard);

// Quản lý danh mục
router.get("/categories", isAdmin, adminController.getCategories);

// Quản lý sản phẩm
router.get("/products", isAdmin, adminController.getProducts);

// Quản lý tồn kho
router.get("/inventory", isAdmin, adminController.getInventory);

// Quản lý người dùng (Users)
router.get("/users", isAdmin, adminController.getUsers);
router.post("/users", isAdmin, adminController.createUser);
router.put("/users/:id", isAdmin, adminController.updateUser);
router.delete("/users/:id", isAdmin, adminController.deleteUser);

// Orders management
router.get("/orders", isAdmin, async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount),
      0
    );
    const pendingOrders = orders.filter(
      (order) => order.status === "pending"
    ).length;

    res.render("admin/orders", {
      orders,
      totalOrders,
      totalRevenue,
      pendingOrders,
      user: req.session.user,
      moment: moment,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Get order details (JSON)
router.get("/orders/:id/details", isAdmin, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "image", "price"],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["name", "email"],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Chuyển đổi dữ liệu để tránh lỗi circular JSON
    const orderData = {
      id: order.id,
      fullName: order.fullName,
      email: order.email,
      phone: order.phone,
      address: order.address,
      city: order.city,
      district: order.district,
      ward: order.ward,
      note: order.note,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        product: {
          id: item.product.id,
          name: item.product.name,
          image: item.product.image,
          price: item.product.price,
        },
      })),
      user: order.user
        ? {
            name: order.user.name,
            email: order.user.email,
          }
        : null,
    };

    res.json(orderData);
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
});

// Update order status
router.post("/orders/:id/update-status", isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Validate status
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    await order.update({ status });
    res.json({
      message: "Order status updated successfully",
      status: status,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      message: "Failed to update order status",
      error: error.message,
    });
  }
});

// Category CRUD routes
router.post("/categories", isAdmin, async (req, res) => {
  try {
    await Category.create(req.body);
    res.redirect("/admin/categories");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

router.put("/categories/:id", isAdmin, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (category) {
      await category.update(req.body);
    }
    res.redirect("/admin/categories");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

router.delete("/categories/:id", isAdmin, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (category) {
      await category.destroy();
    }
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Product CRUD routes
router.post("/products", isAdmin, upload.single("image"), async (req, res) => {
  try {
    const productData = {
      ...req.body,
      image: req.file ? `/uploads/products/${req.file.filename}` : null,
    };

    await Product.create(productData);
    res.redirect("/admin/products");
  } catch (error) {
    console.error(error);
    // Xóa file nếu có lỗi xảy ra
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    const products = await Product.findAll({
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
      error: "Error creating product",
    });
  }
});

router.put(
  "/products/:id",
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const product = await Product.findByPk(req.params.id);
      if (product) {
        const updateData = { ...req.body };

        if (req.file) {
          // Xóa ảnh cũ nếu có
          if (product.image) {
            const oldImagePath = path.join("public", product.image);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
          }
          updateData.image = `/uploads/products/${req.file.filename}`;
        }

        await product.update(updateData);
      }
      res.redirect("/admin/products");
    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  }
);

router.delete("/products/:id", isAdmin, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (product) {
      // Xóa file ảnh nếu có
      if (product.image) {
        const imagePath = path.join("public", product.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      await product.destroy();
    }
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Update stock route
router.post("/inventory/update-stock/:id", isAdmin, async (req, res) => {
  try {
    const { quantity, notes } = req.body;
    const product = await Product.findByPk(req.params.id);

    if (product) {
      const newStock = product.stock + parseInt(quantity);
      if (newStock >= 0) {
        await product.update({ stock: newStock });
      }
    }

    res.redirect("/admin/inventory");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
