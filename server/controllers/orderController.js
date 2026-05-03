const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

exports.createOrder = async (req, res) => {
    try {
        const { id_user, total_amount, items, shipping_address, shipping_phone } = req.body;
        
        // Nested create allows automatically wrapping in a transaction in Prisma
        const order = await prisma.order.create({
            data: {
                id_user: id_user ? parseInt(id_user) : null,
                total_amount: parseInt(total_amount),
                shipping_address,
                shipping_phone,
                productOrders: {
                    create: items.map(item => ({
                        id_product: parseInt(item.id_product),
                        product_quantity: parseInt(item.quantity),
                        product_price: parseInt(item.price)
                    }))
                }
            }
        });

        res.status(201).json({ message: "Đặt hàng thành công!", orderId: order.id_order })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Nhân viên xác nhận hoặc huỷ đơn 
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'Confirmed' hoặc 'Cancelled'
        
        await prisma.order.update({
            where: { id_order: parseInt(id) },
            data: { status }
        });
        res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Quản lý xem doanh thu (Mới)
exports.getRevenue = async (req, res) => {
    try {
        const agg = await prisma.order.aggregate({
            _sum: { total_amount: true },
            where: { status: 'Completed', deletedAt: null }
        });
        res.json({ total_revenue: agg._sum.total_amount || 0 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách đơn hàng của user
exports.getUserOrders = async (req, res) => {
    try {
        let id_user = req.user?.id_user;

        if (!id_user) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
                id_user = decoded.id_user;
            }
        }

        if (!id_user && req.query.id_user) {
            id_user = Number(req.query.id_user);
        }

        if (!id_user || Number.isNaN(id_user)) {
            return res.status(400).json({ message: 'Thiếu id_user. Truyền query ?id_user=... hoặc Bearer token.' });
        }

        const orders = await prisma.order.findMany({
            where: { id_user: parseInt(id_user), deletedAt: null },
            include: {
                productOrders: {
                    include: { product: true }
                }
            },
            orderBy: { order_date: 'desc' }
        });
        
        // Cấu trúc lại kết quả giống Sequelize nếu cần
        const formattedOrders = orders.map(order => ({
            ...order,
            Products: order.productOrders.map(po => ({
                ...po.product,
                ProductOrder: {
                    product_quantity: po.product_quantity,
                    product_price: po.product_price
                }
            }))
        }));

        res.json(formattedOrders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy tất cả đơn hàng (cho Admin/Employee)
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: { deletedAt: null },
            include: {
                user: { select: { username: true, phone: true, address: true } },
                productOrders: {
                    include: { product: true }
                }
            },
            orderBy: { order_date: 'desc' }
        });

        const formattedOrders = orders.map(order => ({
            ...order,
            Products: order.productOrders.map(po => ({
                ...po.product,
                ProductOrder: {
                    product_quantity: po.product_quantity,
                    product_price: po.product_price
                }
            }))
        }));

        res.json(formattedOrders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy chi tiết đơn hàng theo ID
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await prisma.order.findFirst({
            where: { id_order: parseInt(id), deletedAt: null },
            include: {
                user: { select: { username: true, phone: true, address: true } },
                productOrders: {
                    include: { product: true }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        const formattedOrder = {
            ...order,
            Products: order.productOrders.map(po => ({
                ...po.product,
                ProductOrder: {
                    product_quantity: po.product_quantity,
                    product_price: po.product_price
                }
            }))
        };

        res.json(formattedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Xóa mềm đơn hàng
exports.deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await prisma.order.findFirst({ where: { id_order: parseInt(id), deletedAt: null } });

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        await prisma.order.update({
            where: { id_order: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        res.json({ message: 'Xóa mềm đơn hàng thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách đơn hàng đã xóa mềm
exports.getDeletedOrders = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: {
                deletedAt: { not: null }
            },
            orderBy: { deletedAt: 'desc' }
        });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Khôi phục đơn hàng đã xóa mềm
exports.restoreOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await prisma.order.findFirst({ where: { id_order: parseInt(id) } });

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        if (!order.deletedAt) {
            return res.status(400).json({ message: 'Đơn hàng chưa bị xóa mềm' });
        }

        await prisma.order.update({
            where: { id_order: parseInt(id) },
            data: { deletedAt: null }
        });
        res.json({ message: 'Khôi phục đơn hàng thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Xóa vĩnh viễn đơn hàng (chỉ xóa được đơn hàng đã xóa mềm)
exports.forceDeleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await prisma.order.findFirst({ where: { id_order: parseInt(id) } });

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        if (!order.deletedAt) {
            return res.status(400).json({ message: 'Chỉ có thể xóa vĩnh viễn đơn hàng đã xóa mềm' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.productOrder.deleteMany({ where: { id_order: parseInt(id) } });
            await tx.order.delete({ where: { id_order: parseInt(id) } });
        });
        res.json({ message: 'Xóa vĩnh viễn đơn hàng thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Cập nhật thông tin đơn hàng (Admin)
exports.updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { total_amount, status, shipping_address, shipping_phone, items } = req.body;

        const updateData = {};
        if (total_amount !== undefined) updateData.total_amount = parseInt(total_amount);
        if (status !== undefined) updateData.status = status;
        if (shipping_address !== undefined) updateData.shipping_address = shipping_address;
        if (shipping_phone !== undefined) updateData.shipping_phone = shipping_phone;

        // Use transaction to ensure data integrity
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update basic order info
            const updatedOrder = await tx.order.update({
                where: { id_order: parseInt(id) },
                data: updateData
            });

            // 2. If items are provided, replace them
            if (items && Array.isArray(items)) {
                // Delete existing items
                await tx.productOrder.deleteMany({
                    where: { id_order: parseInt(id) }
                });

                // Create new items
                await tx.productOrder.createMany({
                    data: items.map(item => ({
                        id_order: parseInt(id),
                        id_product: parseInt(item.id_product),
                        product_quantity: parseInt(item.quantity),
                        product_price: parseInt(item.price)
                    }))
                });
            }

            return updatedOrder;
        });

        res.json({ message: "Cập nhật đơn hàng thành công", order: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
