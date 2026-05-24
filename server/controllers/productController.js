const prisma = require("../config/db");
const { uploadToCloudinary } = require("../middleware/upload");

const normalizeRestoreChoice = (value) => {
    if (value === true) return true;
    if (value === false || value === undefined || value === null) return false;
    if (typeof value === 'string') {
        return ['true', '1', 'yes', 'co'].includes(value.trim().toLowerCase());
    }
    if (typeof value === 'number') {
        return value === 1;
    }
    return false;
};

const normalizeStatus = (statusValue) => {
    if (statusValue === undefined) {
        return undefined;
    }

    if (typeof statusValue === 'boolean') {
        return statusValue;
    }

    if (typeof statusValue === 'number') {
        if (statusValue === 1) return true;
        if (statusValue === 0) return false;
    }

    if (typeof statusValue === 'string') {
        const normalized = statusValue.trim().toLowerCase();
        if (['true', '1', 'active', 'on'].includes(normalized)) return true;
        if (['false', '0', 'inactive', 'off'].includes(normalized)) return false;
    }

    return undefined;
};

const buildProductPayload = async (body = {}, file = null) => {
    const payload = {};

    if (body.product_name !== undefined) payload.product_name = body.product_name;
    if (body.product_price !== undefined) payload.product_price = parseInt(body.product_price);
    if (body.id_category !== undefined) payload.id_category = parseInt(body.id_category);

    const normalizedStatus = normalizeStatus(body.product_status ?? body.status);
    if (normalizedStatus !== undefined) {
        payload.product_status = normalizedStatus;
    }

    // Handle image upload
    if (file) {
        const cloudinaryUrl = await uploadToCloudinary(file.path, 'products');
        if (!cloudinaryUrl) {
            throw new Error('Tải ảnh sản phẩm lên Cloudinary thất bại. Vui lòng kiểm tra cấu hình Cloudinary.');
        }
        payload.image_url = cloudinaryUrl;
    } else if (body.image_url !== undefined) {
        payload.image_url = body.image_url;
    }

    return payload;
};

// Lấy tất cả sản phẩm
exports.getAllProducts = async (req, res) => {
    try {
        const { q, search, status, product_status } = req.query;
        const where = { deletedAt: null };
        
        const normalizedStatus = normalizeStatus(status ?? product_status);
        if (normalizedStatus !== undefined) {
            where.product_status = normalizedStatus;
        }

        const searchTerm = q || search;
        if (searchTerm) {
            where.product_name = {
                contains: searchTerm,
            };
        }

        const products = await prisma.product.findMany({
            where,
            include: { category: { select: { category_name: true } }, variants: true }
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server khi lấy sản phẩm" });
    }
};

// Lấy sản phẩm theo ID
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findFirst({
            where: { id_product: parseInt(id), deletedAt: null },
            include: { category: { select: { category_name: true } }, variants: true }
        });
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Tạo sản phẩm mới
exports.createProducts = async (req, res) => {
    try {
        const payload = await buildProductPayload(req.body, req.file);
        const wantsRestore = normalizeRestoreChoice(req.body?.confirm_restore);

        const rawProductName = payload.product_name;
        const productName = typeof rawProductName === 'string' ? rawProductName.trim() : '';
        if (!productName) {
            return res.status(400).json({ message: 'Vui lòng nhập tên sản phẩm' });
        }
        payload.product_name = productName;

        const existingProduct = await prisma.product.findFirst({
            where: { product_name: productName }
        });

        if (existingProduct && !existingProduct.deletedAt) {
            return res.status(400).json({ message: 'Sản phẩm đã tồn tại' });
        }

        if (existingProduct && existingProduct.deletedAt && !wantsRestore) {
            return res.status(409).json({
                message: 'Sản phẩm đã tồn tại trong danh sách xóa mềm. Bạn có muốn khôi phục không?',
                can_restore: true,
                target: {
                    type: 'product',
                    id_product: existingProduct.id_product,
                    product_name: existingProduct.product_name
                }
            });
        }

        if (existingProduct && existingProduct.deletedAt && wantsRestore) {
            payload.deletedAt = null;
            const updatedProduct = await prisma.product.update({
                where: { id_product: existingProduct.id_product },
                data: payload
            });
            return res.status(200).json({
                message: 'Khôi phục sản phẩm thành công!',
                product: updatedProduct
            });
        }

        const newProduct = await prisma.product.create({
            data: payload
        });
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Cập nhật sản phẩm
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = await buildProductPayload(req.body, req.file);

        if (Object.keys(payload).length === 0) {
            return res.status(400).json({ message: "Không có dữ liệu hợp lệ để cập nhật" });
        }

        const product = await prisma.product.findFirst({
            where: { id_product: parseInt(id), deletedAt: null }
        });

        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        const updatedProduct = await prisma.product.update({
            where: { id_product: parseInt(id) },
            data: payload
        });
        
        res.json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Xóa sản phẩm
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findFirst({
            where: { id_product: parseInt(id), deletedAt: null }
        });

        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        await prisma.product.update({
            where: { id_product: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        res.json({ message: "Xóa mềm sản phẩm thành công" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy sản phẩm theo danh mục
exports.getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const where = { id_category: parseInt(categoryId), deletedAt: null };

        const normalizedStatus = normalizeStatus(req.query.status ?? req.query.product_status);
        if (normalizedStatus !== undefined) {
            where.product_status = normalizedStatus;
        }

        const products = await prisma.product.findMany({
            where,
            include: { category: { select: { category_name: true } }, variants: true }
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách sản phẩm đã xóa mềm
exports.getDeletedProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: {
                deletedAt: {
                    not: null
                }
            },
            include: { category: { select: { category_name: true } }, variants: true }
        });

        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ========== Product Variants ==========
exports.getVariants = async (req, res) => {
    try {
        const { id } = req.params;
        const variants = await prisma.productVariant.findMany({
            where: { id_product: parseInt(id) },
            orderBy: { size: 'asc' }
        });
        res.json(variants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.upsertVariants = async (req, res) => {
    try {
        const { id } = req.params;
        const { variants } = req.body; // [{ size, price, stock }, ...]

        const product = await prisma.product.findFirst({
            where: { id_product: parseInt(id), deletedAt: null }
        });
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }

        // Delete old variants and create new ones in a transaction
        await prisma.$transaction([
            prisma.productVariant.deleteMany({ where: { id_product: parseInt(id) } }),
            ...variants.filter(v => v.size && v.price).map(v =>
                prisma.productVariant.create({
                    data: {
                        id_product: parseInt(id),
                        size: v.size.trim(),
                        price: parseInt(v.price),
                        stock: parseInt(v.stock) || 0
                    }
                })
            )
        ]);

        const updated = await prisma.productVariant.findMany({
            where: { id_product: parseInt(id) },
            orderBy: { size: 'asc' }
        });
        res.json({ message: 'Cập nhật biến thể thành công', variants: updated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Khôi phục sản phẩm đã xóa mềm
exports.restoreProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findFirst({
            where: { id_product: parseInt(id) }
        });

        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }

        if (!product.deletedAt) {
            return res.status(400).json({ message: 'Sản phẩm chưa bị xóa mềm' });
        }

        await prisma.product.update({
            where: { id_product: parseInt(id) },
            data: { deletedAt: null }
        });
        res.json({ message: 'Khôi phục sản phẩm thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Xóa vĩnh viễn sản phẩm (chỉ xóa được sản phẩm đã xóa mềm)
exports.forceDeleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findFirst({
            where: { id_product: parseInt(id) }
        });

        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }

        if (!product.deletedAt) {
            return res.status(400).json({ message: 'Chỉ có thể xóa vĩnh viễn sản phẩm đã xóa mềm' });
        }

        await prisma.product.delete({
            where: { id_product: parseInt(id) }
        });
        res.json({ message: 'Xóa vĩnh viễn sản phẩm thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Upload ảnh riêng cho sản phẩm
exports.uploadProductImage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng chọn ảnh để upload!' });
        }

        const product = await prisma.product.findFirst({
            where: { id_product: parseInt(id), deletedAt: null }
        });

        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }

        const cloudinaryUrl = await uploadToCloudinary(req.file.path, 'products');
        if (!cloudinaryUrl) {
            return res.status(400).json({ message: 'Tải ảnh sản phẩm lên Cloudinary thất bại. Vui lòng kiểm tra cấu hình Cloudinary.' });
        }
        const image_url = cloudinaryUrl;

        const updatedProduct = await prisma.product.update({
            where: { id_product: parseInt(id) },
            data: { image_url }
        });

        res.json({ message: 'Upload ảnh thành công!', image_url, product: updatedProduct });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};