const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

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

// Đăng ký tài khoản
exports.register = async (req, res) => {
    try {
        const { username, password, phone, address, role, confirm_restore } = req.body || {};
        const normalizedUsername = typeof username === 'string' ? username.trim() : '';
        const wantsRestore = normalizeRestoreChoice(confirm_restore);

        if (!normalizedUsername || !password) {
            return res.status(400).json({
                message: 'Vui lòng nhập đầy đủ username và password!'
            });
        }

        // Kiểm tra username đã tồn tại, Prisma trả luôn cả xóa mềm (vì không hỗ trợ mặc định như sequelize)
        const existingUser = await prisma.user.findFirst({
            where: { username: normalizedUsername }
        });

        if (existingUser && !existingUser.deletedAt) {
            return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại!' });
        }

        if (existingUser && existingUser.deletedAt && !wantsRestore) {
            return res.status(409).json({
                message: 'Tài khoản đã tồn tại trong danh sách xóa mềm. Bạn có muốn khôi phục không?',
                can_restore: true,
                target: {
                    type: 'user',
                    id_user: existingUser.id_user,
                    username: existingUser.username
                }
            });
        }

        // Mã hóa mật khẩu
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        if (existingUser && existingUser.deletedAt && wantsRestore) {
            const updatedUser = await prisma.user.update({
                where: { id_user: existingUser.id_user },
                data: {
                    username: normalizedUsername,
                    password: hashedPassword,
                    phone: phone || existingUser.phone,
                    address: address || existingUser.address,
                    role: role || existingUser.role || 'Customer',
                    deletedAt: null // Restore
                }
            });

            return res.status(200).json({
                message: 'Khôi phục tài khoản thành công!',
                user: {
                    id_user: updatedUser.id_user,
                    username: updatedUser.username,
                    role: updatedUser.role
                }
            });
        }

        // Tạo user mới
        const newUser = await prisma.user.create({
            data: {
                username: normalizedUsername,
                password: hashedPassword,
                phone,
                address,
                role: role || 'Customer'
            }
        });

        res.status(201).json({
            message: 'Đăng ký thành công!',
            user: {
                id_user: newUser.id_user,
                username: newUser.username,
                role: newUser.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Đăng nhập
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({
                message: 'Vui lòng nhập đầy đủ username và password!'
            });
        }

        // Tìm user theo username
        const user = await prisma.user.findFirst({ 
            where: { 
                username,
                deletedAt: null 
            } 
        });
        if (!user) {
            return res.status(401).json({ message: 'Tên đăng nhập không tồn tại!' });
        }

        // So sánh mật khẩu
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Mật khẩu không đúng!' });
        }

        const token = jwt.sign(
            {
                id_user: user.id_user,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET || 'your_jwt_secret_key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            message: 'Đăng nhập thành công!',
            token,
            user: {
                id_user: user.id_user,
                username: user.username,
                role: user.role,
                phone: user.phone,
                address: user.address
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy thông tin user hiện tại
exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findFirst({
            where: {
                id_user: req.user.id_user,
                deletedAt: null
            },
            select: {
                id_user: true,
                username: true,
                phone: true,
                address: true,
                role: true
            }
        });
        
        if (!user) {
            return res.status(404).json({ message: 'User không tồn tại!' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Lấy toàn bộ danh sách user (không bao gồm user đã xóa mềm)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { deletedAt: null },
            select: {
                id_user: true, 
                username: true, 
                phone: true, 
                address: true, 
                role: true, 
                createdAt: true, 
                updatedAt: true
            },
            orderBy: { id_user: 'asc' }
        });

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin: Lấy thông tin user theo id
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findFirst({
            where: { 
                id_user: parseInt(id),
                deletedAt: null
            },
            select: {
                id_user: true, 
                username: true, 
                phone: true, 
                address: true, 
                role: true, 
                createdAt: true, 
                updatedAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User không tồn tại!' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Route mẫu để test middleware verifyToken end-to-end
exports.protectedExample = async (req, res) => {
    try {
        res.json({
            message: 'Token hợp lệ. Bạn đã truy cập route cần đăng nhập.',
            user: req.user
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin xóa mềm user
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findFirst({ where: { id_user: parseInt(id), deletedAt: null }});

        if (!user) {
            return res.status(404).json({ message: 'User không tồn tại!' });
        }

        await prisma.user.update({
            where: { id_user: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        
        res.json({ message: 'Xóa mềm user thành công!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách user đã xóa mềm
exports.getDeletedUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                deletedAt: {
                    not: null
                }
            },
            select: {
                id_user: true, 
                username: true, 
                phone: true, 
                address: true, 
                role: true, 
                createdAt: true, 
                updatedAt: true, 
                deletedAt: true
            }
        });

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Khôi phục user đã xóa mềm
exports.restoreUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findFirst({ 
            where: { id_user: parseInt(id) } 
        });

        if (!user || !user.deletedAt) {
            return res.status(404).json({ message: 'User không tồn tại hoặc chưa bị xóa mềm!' });
        }

        await prisma.user.update({
            where: { id_user: parseInt(id) },
            data: { deletedAt: null }
        });
        res.json({ message: 'Khôi phục user thành công!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Xóa vĩnh viễn user (chỉ xóa được user đã xóa mềm)
exports.forceDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findFirst({ where: { id_user: parseInt(id) } });

        if (!user) {
            return res.status(404).json({ message: 'User không tồn tại!' });
        }

        if (!user.deletedAt) {
            return res.status(400).json({ message: 'Chỉ có thể xóa vĩnh viễn user đã xóa mềm' });
        }

        await prisma.user.delete({
            where: { id_user: parseInt(id) }
        });
        res.json({ message: 'Xóa vĩnh viễn user thành công!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Cập nhật thông tin user
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const parsedId = parseInt(id);

        if (isNaN(parsedId)) {
            return res.status(400).json({ message: 'ID user không hợp lệ!' });
        }

        const { username, phone, address, role, password } = req.body || {};
        
        // Security check: Only Admin can update other users or change roles
        const isSelf = req.user.id_user === parsedId;
        const isAdmin = req.user.role === 'Admin';

        if (!isSelf && !isAdmin) {
            return res.status(403).json({ message: 'Bạn không có quyền cập nhật thông tin người khác!' });
        }

        const user = await prisma.user.findFirst({
            where: { id_user: parsedId, deletedAt: null }
        });

        if (!user) {
            return res.status(404).json({ message: 'User không tồn tại!' });
        }

        const dataToUpdate = {};

        if (username !== undefined && username.trim() !== '') {
            const normalizedUsername = username.trim();
            if (normalizedUsername !== user.username) {
                const existingUser = await prisma.user.findFirst({
                    where: { username: normalizedUsername }
                });
                if (existingUser) {
                    return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại!' });
                }
            }
            dataToUpdate.username = normalizedUsername;
        }

        if (phone !== undefined) dataToUpdate.phone = phone;
        if (address !== undefined) dataToUpdate.address = address;
        
        if (role !== undefined) {
             if (!isAdmin) {
                 return res.status(403).json({ message: 'Chỉ Admin mới có quyền thay đổi vai trò người dùng!' });
             }
             const validRoles = ['Admin', 'Employee', 'Customer'];
             if (!validRoles.includes(role)) {
                 return res.status(400).json({ message: 'Quyền (role) không hợp lệ! Vui lòng chọn: Admin, Employee, hoặc Customer.' });
             }
             dataToUpdate.role = role;
        }

        if (password) {
             const saltRounds = 10;
             dataToUpdate.password = await bcrypt.hash(password, saltRounds);
        }

        const updatedUser = await prisma.user.update({
            where: { id_user: parsedId },
            data: dataToUpdate,
            select: {
                id_user: true,
                username: true,
                phone: true,
                address: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });

        res.json({
            message: 'Cập nhật user thành công!',
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
