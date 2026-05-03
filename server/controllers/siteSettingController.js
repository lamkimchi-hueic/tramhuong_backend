const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
