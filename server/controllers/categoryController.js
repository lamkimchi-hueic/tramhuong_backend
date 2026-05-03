const prisma = require("../config/db");

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

// Lấy tất cả danh mục(đọc)
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { deletedAt: null }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh mục theo ID
exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findFirst({
            where: { id_category: parseInt(id), deletedAt: null }
        });
        if (!category) {
            return res.status(404).json({ message: "Không tìm thấy danh mục" });
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Tạo danh mục mới(thêm)
exports.createCategory = async (req, res) => {
    try {
        const rawCategoryName = req.body?.category_name;
        const categoryName = typeof rawCategoryName === 'string' ? rawCategoryName.trim() : '';
        const wantsRestore = normalizeRestoreChoice(req.body?.confirm_restore);

        if (!categoryName) {
            return res.status(400).json({ message: 'Vui lòng nhập tên danh mục' });
        }

        const existingCategory = await prisma.category.findFirst({
            where: { category_name: categoryName }
        });

        if (existingCategory && !existingCategory.deletedAt) {
            return res.status(400).json({ message: 'Danh mục đã tồn tại' });
        }

        if (existingCategory && existingCategory.deletedAt && !wantsRestore) {
            return res.status(409).json({
                message: 'Danh mục đã tồn tại trong danh sách xóa mềm. Bạn có muốn khôi phục không?',
                can_restore: true,
                target: {
                    type: 'category',
                    id_category: existingCategory.id_category,
                    category_name: existingCategory.category_name
                }
            });
        }

        if (existingCategory && existingCategory.deletedAt && wantsRestore) {
            const restoreData = { category_name: categoryName, deletedAt: null };
            if (req.file) restoreData.image_url = `/uploads/categories/${req.file.filename}`;
            const updatedCategory = await prisma.category.update({
                where: { id_category: existingCategory.id_category },
                data: restoreData
            });
            return res.status(200).json({
                message: 'Khôi phục danh mục thành công!',
                category: updatedCategory
            });
        }

        const data = { category_name: categoryName };
        if (req.file) data.image_url = `/uploads/categories/${req.file.filename}`;

        const newCategory = await prisma.category.create({ data });
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Cập nhật danh mục(sửa)
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findFirst({ where: { id_category: parseInt(id), deletedAt: null } });
        if (!category) {
            return res.status(404).json({ message: "Không tìm thấy danh mục" });
        }

        const { category_name } = req.body;
        const updateData = {
            category_name: category_name !== undefined ? category_name : category.category_name
        };
        if (req.file) updateData.image_url = `/uploads/categories/${req.file.filename}`;

        const updatedCategory = await prisma.category.update({
            where: { id_category: parseInt(id) },
            data: updateData
        });
        
        res.json(updatedCategory);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Xóa danh mục
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findFirst({ where: { id_category: parseInt(id), deletedAt: null } });
        if (!category) {
            return res.status(404).json({ message: "Không tìm thấy danh mục" });
        }

        await prisma.category.update({
            where: { id_category: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        res.json({ message: "Xóa mềm danh mục thành công" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy sản phẩm theo danh mục
exports.getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const where = { 
            id_category: parseInt(categoryId),
            deletedAt: null
        };

        const normalizedStatus = normalizeStatus(req.query.status ?? req.query.product_status);
        if (normalizedStatus !== undefined) {
            where.product_status = normalizedStatus;
        }

        const products = await prisma.product.findMany({
            where,
            include: { category: { select: { category_name: true } } }
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách danh mục đã xóa mềm
exports.getDeletedCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: {
                deletedAt: {
                    not: null
                }
            }
        });

        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Khôi phục danh mục đã xóa mềm
exports.restoreCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findFirst({ where: { id_category: parseInt(id) }});

        if (!category) {
            return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        }

        if (!category.deletedAt) {
            return res.status(400).json({ message: 'Danh mục chưa bị xóa mềm' });
        }

        await prisma.category.update({
            where: { id_category: parseInt(id) },
            data: { deletedAt: null }
        });
        res.json({ message: 'Khôi phục danh mục thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Xóa vĩnh viễn danh mục (chỉ xóa được danh mục đã xóa mềm)
exports.forceDeleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findFirst({ where: { id_category: parseInt(id) } });

        if (!category) {
            return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        }

        if (!category.deletedAt) {
            return res.status(400).json({ message: 'Chỉ có thể xóa vĩnh viễn danh mục đã xóa mềm' });
        }

        await prisma.category.delete({
            where: { id_category: parseInt(id) }
        });
        res.json({ message: 'Xóa vĩnh viễn danh mục thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};