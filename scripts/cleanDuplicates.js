require("dotenv").config();
const { Product, OrderItem } = require("../models");

async function cleanDuplicates() {
  try {
    console.log("=== BẮT ĐẦU QUÉT SẢN PHẨM TRÙNG LẶP TRONG DATABASE ===");

    const allProducts = await Product.findAll({ order: [["id", "ASC"]] });
    console.log(`Tổng số sản phẩm hiện tại trong Database: ${allProducts.length}`);

    const seenMap = new Map();
    const duplicatesToRemove = [];

    for (const product of allProducts) {
      const key = product.name.trim().toLowerCase();
      if (!seenMap.has(key)) {
        seenMap.set(key, product);
      } else {
        duplicatesToRemove.push({
          duplicate: product,
          keep: seenMap.get(key),
        });
      }
    }

    if (duplicatesToRemove.length === 0) {
      console.log("Tuyệt vời! Không phát hiện sản phẩm nào bị trùng lặp.");
      process.exit(0);
    }

    console.log(`Phát hiện ${duplicatesToRemove.length} bản ghi bị trùng lặp. Đang tiến hành dọn dẹp...`);

    for (const item of duplicatesToRemove) {
      const dup = item.duplicate;
      const keep = item.keep;

      console.log(`- Đang xóa bản sao thừa: "${dup.name}" (ID ${dup.id}) -> Giữ lại ID ${keep.id}`);

      // Nếu có chi tiết đơn hàng trỏ vào bản ghi trùng, chuyển sang bản ghi giữ lại
      await OrderItem.update(
        { productId: keep.id },
        { where: { productId: dup.id } }
      );

      // Xóa bản ghi thừa
      await dup.destroy();
    }

    const remainingCount = await Product.count();
    console.log(`\n===> DỌN DẸP HOÀN TẤT THÀNH CÔNG! <===`);
    console.log(`Tổng số sản phẩm sau khi dọn dẹp: ${remainingCount}`);
    process.exit(0);
  } catch (error) {
    console.error("Lỗi khi dọn dẹp sản phẩm trùng lặp:", error);
    process.exit(1);
  }
}

cleanDuplicates();
