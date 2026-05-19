const express = require('express');
const router = express.Router();

const authCtrl = require('../controllers/authController');//iport controller
const productCtrl = require('../controllers/productController');
const categoryCtrl = require('../controllers/categoryController');
const orderCtrl = require('../controllers/orderController');
const settingCtrl = require('../controllers/siteSettingController');
const { verifyToken, isAdmin, isEmployee } = require('../middleware/auth');
const { upload, uploadCategory, uploadHero } = require('../middleware/upload');

// ========== Auth Routes ==========
router.post('/register', authCtrl.register);
router.post('/login', authCtrl.login);
router.get('/me', verifyToken, authCtrl.getMe);//trả về in4 của chính ng đn
router.get('/protected', verifyToken, authCtrl.protectedExample);//test token có đúng hay không

// ========== Category Routes ==========
router.get('/categories', categoryCtrl.getAllCategories);
router.get('/categories/deleted', verifyToken, isAdmin, categoryCtrl.getDeletedCategories);//Xem toàn bộ danh mục đã bị xóa mềm
router.get('/categories/:id', categoryCtrl.getCategoryById);
router.get('/category/:categoryId/products', productCtrl.getProductsByCategory);
// router.post('/categories', categoryCtrl.createCategory);
router.post('/categories', verifyToken, isEmployee, uploadCategory.single('image'), categoryCtrl.createCategory);
// router.put('/categories/:id',categoryCtrl.updateCategory);
router.put('/categories/:id', verifyToken, isEmployee, uploadCategory.single('image'), categoryCtrl.updateCategory);
router.patch('/categories/:id/restore', verifyToken, isAdmin, categoryCtrl.restoreCategory);//khôi phục danh mục  đã xoá mềm
// router.delete('/categories/:id', categoryCtrl.deleteCategory);//nên dùng soft delete
router.delete('/categories/:id', verifyToken, isAdmin, categoryCtrl.deleteCategory);//đã chuỷen qua xoá mềm
router.delete('/categories/:id/force', verifyToken, isAdmin, categoryCtrl.forceDeleteCategory);//xoá vĩnh viễn

// ========== Product Routes ==========
router.get('/products', productCtrl.getAllProducts);
router.get('/products/deleted', verifyToken, isAdmin, productCtrl.getDeletedProducts);
router.get('/products/:id', productCtrl.getProductById);
router.post('/products', upload.single('image'), productCtrl.createProducts);
router.put('/products/:id', upload.single('image'), productCtrl.updateProduct);
router.post('/products/:id/upload', upload.single('image'), productCtrl.uploadProductImage);
router.patch('/products/:id/restore', verifyToken, isAdmin, productCtrl.restoreProduct);
router.delete('/products/:id', productCtrl.deleteProduct);
router.delete('/products/:id/force', verifyToken, isAdmin, productCtrl.forceDeleteProduct);//xoá vĩnh viễn
router.get('/products/:id/variants', productCtrl.getVariants); // public
router.put('/products/:id/variants', verifyToken, isEmployee, productCtrl.upsertVariants); // admin/employee

// ========== Order Routes ==========
// User: Lấy đơn hàng của mình
router.get('/orders', orderCtrl.getUserOrders);
// router.get('/orders', verifyToken, orderCtrl.getUserOrders);
// User/Employee: Tạo đơn hàng mới
router.post('/orders', verifyToken, orderCtrl.createOrder);
// Admin/Employee: Lấy tất cả đơn hàng
router.get('/orders/all', orderCtrl.getAllOrders);
router.get('/orders/deleted', verifyToken, isEmployee, orderCtrl.getDeletedOrders);//ds bị xoá mềm
// router.get('/orders/all', verifyToken, isEmployee, orderCtrl.getAllOrders);
// Admin/Employee: Lấy chi tiết đơn hàng theo ID
router.get('/orders/:id', verifyToken, isEmployee, orderCtrl.getOrderById);
// Admin/Employee: Cập nhật trạng thái đơn hàng
router.put('/orders/:id/status', orderCtrl.updateStatus);//ngang này xong
// router.put('/orders/:id/status', verifyToken, isEmployee, orderCtrl.updateStatus);
router.put('/orders/:id', verifyToken, isEmployee, orderCtrl.updateOrder);
router.patch('/orders/:id/restore', verifyToken, isEmployee, orderCtrl.restoreOrder);
router.delete('/orders/:id', verifyToken, isEmployee, orderCtrl.deleteOrder);
router.delete('/orders/:id/force', verifyToken, isEmployee, orderCtrl.forceDeleteOrder);//xoá vĩnh viễn
// Admin: Xem doanh thu
// router.get('/revenue', orderCtrl.getRevenue);
router.get('/revenue', verifyToken, isAdmin, orderCtrl.getRevenue);

// ========== User Routes ==========test pm oki
router.post('/users', verifyToken, isAdmin, authCtrl.register); // thêm user mới
router.get('/users', verifyToken, isEmployee, authCtrl.getAllUsers);//Admin + Employee đọc được để tạo đơn
router.get('/users/deleted', verifyToken, isAdmin, authCtrl.getDeletedUsers);//ds user đã xóa mềm
router.get('/users/:id', verifyToken, isAdmin, authCtrl.getUserById);//lấy user theo id
router.put('/users/:id', verifyToken, authCtrl.updateUser); // Cập nhật thông tin user
router.patch('/users/:id/restore', verifyToken, isAdmin, authCtrl.restoreUser);//khôi phục user đã xoá mềm
router.delete('/users/:id', verifyToken, isAdmin, authCtrl.deleteUser);//xoá mềm user
router.delete('/users/:id/force', verifyToken, isAdmin, authCtrl.forceDeleteUser);//xoá vĩnh viễn user

// ========== Site Settings Routes ==========
router.get('/settings', settingCtrl.getAllSettings); // public
router.get('/settings/list', verifyToken, isAdmin, settingCtrl.getAllSettingsList); // admin - danh sách đầy đủ
router.get('/settings/:key', settingCtrl.getSettingByKey); // public
router.post('/settings', verifyToken, isAdmin, settingCtrl.upsertSetting); // admin - tạo/cập nhật 1
router.post('/settings/hero/upload', verifyToken, isAdmin, uploadHero.fields([
  { name: 'hero_image', maxCount: 1 },
  { name: 'logo_image', maxCount: 1 }
]), settingCtrl.uploadHeroImages); // admin - upload hero images
router.put('/settings/bulk', verifyToken, isAdmin, settingCtrl.bulkUpsertSettings); // admin - cập nhật nhiều
router.delete('/settings/:key', verifyToken, isAdmin, settingCtrl.deleteSetting); // admin - xóa

module.exports = router;