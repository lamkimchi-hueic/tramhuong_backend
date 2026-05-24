const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { uploadToCloudinary } = require('../middleware/upload');

// Lấy tất cả cài đặt (public)
exports.getAllSettings = async (req, res) => {
    try {
        const settings = await prisma.siteSetting.findMany({
            orderBy: { key: 'asc' }
        });
        // Chuyển thành object { key: value }
        const result = {};
        settings.forEach(s => {
            result[s.key] = s.value;
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy tất cả cài đặt dạng danh sách (admin)
exports.getAllSettingsList = async (req, res) => {
    try {
        const settings = await prisma.siteSetting.findMany({
            orderBy: { key: 'asc' }
        });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy 1 cài đặt theo key
exports.getSettingByKey = async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await prisma.siteSetting.findUnique({ where: { key } });
        if (!setting) {
            return res.status(404).json({ message: 'Không tìm thấy cài đặt' });
        }
        res.json(setting);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Tạo hoặc cập nhật cài đặt (upsert)
exports.upsertSetting = async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key || value === undefined) {
            return res.status(400).json({ message: 'Key và value là bắt buộc' });
        }

        const setting = await prisma.siteSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
        res.json({ message: 'Cập nhật cài đặt thành công', setting });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Cập nhật nhiều cài đặt cùng lúc
exports.bulkUpsertSettings = async (req, res) => {
    try {
        const { settings } = req.body; // [{ key, value }, ...]
        if (!Array.isArray(settings)) {
            return res.status(400).json({ message: 'settings phải là một mảng' });
        }

        const results = await prisma.$transaction(
            settings.map(({ key, value }) =>
                prisma.siteSetting.upsert({
                    where: { key },
                    update: { value },
                    create: { key, value }
                })
            )
        );
        res.json({ message: 'Cập nhật tất cả cài đặt thành công', settings: results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Upload hero images (hero_image, logo_image, about_image, process_image)
exports.uploadHeroImages = async (req, res) => {
    try {
        const files = req.files || {};
        console.log('📤 uploadHeroImages called');
        console.log('Files received:', Object.keys(files));

        const heroImageFile = files.hero_image?.[0];
        const logoImageFile = files.logo_image?.[0];
        const aboutImageFile = files.about_image?.[0];
        const processImageFile = files.process_image?.[0];

        const updates = [];

        // Xử lý hero image
        if (heroImageFile) {
            const cloudinaryUrl = await uploadToCloudinary(heroImageFile.path, 'hero');
            if (!cloudinaryUrl) {
                return res.status(400).json({ message: 'Tải ảnh hero lên Cloudinary thất bại. Vui lòng kiểm tra cấu hình Cloudinary.' });
            }
            const heroImagePath = cloudinaryUrl;
            console.log('✓ Saving hero_image_url:', heroImagePath);
            updates.push(
                prisma.siteSetting.upsert({
                    where: { key: 'hero_image_url' },
                    update: { value: heroImagePath },
                    create: { key: 'hero_image_url', value: heroImagePath }
                })
            );
        }

        // Xử lý logo image
        if (logoImageFile) {
            const cloudinaryUrl = await uploadToCloudinary(logoImageFile.path, 'hero');
            if (!cloudinaryUrl) {
                return res.status(400).json({ message: 'Tải ảnh logo lên Cloudinary thất bại. Vui lòng kiểm tra cấu hình Cloudinary.' });
            }
            const logoPath = cloudinaryUrl;
            console.log('✓ Saving logo_url:', logoPath);
            updates.push(
                prisma.siteSetting.upsert({
                    where: { key: 'logo_url' },
                    update: { value: logoPath },
                    create: { key: 'logo_url', value: logoPath }
                })
            );
        }

        // Xử lý about image
        if (aboutImageFile) {
            const cloudinaryUrl = await uploadToCloudinary(aboutImageFile.path, 'about');
            if (!cloudinaryUrl) {
                return res.status(400).json({ message: 'Tải ảnh about lên Cloudinary thất bại. Vui lòng kiểm tra cấu hình Cloudinary.' });
            }
            const aboutImagePath = cloudinaryUrl;
            console.log('✓ Saving about_image_url:', aboutImagePath);
            updates.push(
                prisma.siteSetting.upsert({
                    where: { key: 'about_image_url' },
                    update: { value: aboutImagePath },
                    create: { key: 'about_image_url', value: aboutImagePath }
                })
            );
        }

        // Xử lý process image
        if (processImageFile) {
            const cloudinaryUrl = await uploadToCloudinary(processImageFile.path, 'process');
            if (!cloudinaryUrl) {
                return res.status(400).json({ message: 'Tải ảnh process lên Cloudinary thất bại. Vui lòng kiểm tra cấu hình Cloudinary.' });
            }
            const processImagePath = cloudinaryUrl;
            console.log('✓ Saving process_image_url:', processImagePath);
            updates.push(
                prisma.siteSetting.upsert({
                    where: { key: 'process_image_url' },
                    update: { value: processImagePath },
                    create: { key: 'process_image_url', value: processImagePath }
                })
            );
        }

        if (updates.length === 0) {
            console.warn('⚠️  No files to upload');
            return res.status(400).json({ message: 'Không có file nào được upload' });
        }

        const results = await prisma.$transaction(updates);
        console.log('✓ Update successful:', results);
        res.json({ message: 'Upload ảnh thành công', data: results });
    } catch (error) {
        console.error('❌ uploadHeroImages error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Xóa cài đặt
exports.deleteSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await prisma.siteSetting.findUnique({ where: { key } });
        if (!setting) {
            return res.status(404).json({ message: 'Không tìm thấy cài đặt' });
        }

        await prisma.siteSetting.delete({ where: { key } });
        res.json({ message: 'Xóa cài đặt thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Quét và sửa các link local path bị lỗi trên Render
exports.fixLocalPaths = async (req, res) => {
    try {
        console.log('🧹 Starting cleanup of local image paths in database...');
        let updatedSettingsCount = 0;
        let updatedProductsCount = 0;
        let updatedCategoriesCount = 0;

        // 1. Site Settings
        const settings = await prisma.siteSetting.findMany();
        for (const setting of settings) {
            if (setting.value && setting.value.startsWith('/uploads/')) {
                let newValue = '';
                if (setting.key === 'hero_image_url') {
                    newValue = 'https://res.cloudinary.com/dcywlpxwi/image/upload/v1778780041/tramhuong/assets/thac.jpg';
                } else if (setting.key === 'logo_url') {
                    newValue = ''; // Sẽ fallback về logo SVG mặc định trong Header.jsx
                }
                
                await prisma.siteSetting.update({
                    where: { id: setting.id },
                    data: { value: newValue }
                });
                updatedSettingsCount++;
                console.log(`  [setting] Reset ${setting.key} to: "${newValue}"`);
            }
        }

        // 2. Products
        const products = await prisma.product.findMany();
        for (const product of products) {
            if (product.image_url && product.image_url.startsWith('/uploads/')) {
                const placeholder = 'https://images.unsplash.com/photo-1545048702-79362596cdc9?auto=format&fit=crop&w=1200&q=85';
                await prisma.product.update({
                    where: { id_product: product.id_product },
                    data: { image_url: placeholder }
                });
                updatedProductsCount++;
                console.log(`  [product] Reset "${product.product_name}" image to placeholder`);
            }
        }

        // 3. Categories
        const categories = await prisma.category.findMany();
        for (const category of categories) {
            if (category.image_url && category.image_url.startsWith('/uploads/')) {
                const placeholder = 'https://images.unsplash.com/photo-1545048702-79362596cdc9?auto=format&fit=crop&w=1200&q=85';
                await prisma.category.update({
                    where: { id_category: category.id_category },
                    data: { image_url: placeholder }
                });
                updatedCategoriesCount++;
                console.log(`  [category] Reset "${category.category_name}" image to placeholder`);
            }
        }

        res.json({
            message: 'Đã dọn dẹp và sửa tất cả link local path thành công!',
            report: {
                settings_fixed: updatedSettingsCount,
                products_fixed: updatedProductsCount,
                categories_fixed: updatedCategoriesCount
            }
        });
    } catch (error) {
        console.error('❌ fixLocalPaths error:', error);
        res.status(500).json({ message: error.message });
    }
};

