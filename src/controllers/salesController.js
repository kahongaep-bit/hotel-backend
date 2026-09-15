const db = require('../config/db');

// 1. Kuingiza Mauzo Mpya (Record Sale)
exports.createSale = async (req, res) => {
    const { cashier_id, item_id, quantity, total_amount, payment_method } = req.body;

    try {
        const newSale = await db.query(
            `INSERT INTO sales (cashier_id, item_id, quantity, total_amount, payment_method) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [cashier_id, item_id, quantity, total_amount, payment_method || 'CASH']
        );

        res.status(201).json({
            message: 'Muamala wa mauzo umerekodiwa kikamilifu!',
            sale: newSale.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Kuonyesha Ripoti ya Mauzo Yote (Get All Sales)
exports.getAllSales = async (req, res) => {
    try {
        const sales = await db.query(
            `SELECT s.id, u.full_name AS cashier_name, m.name AS item_name, 
                    s.quantity, s.total_amount, s.payment_method, s.created_at 
             FROM sales s
             LEFT JOIN users u ON s.cashier_id = u.id
             LEFT JOIN menu_items m ON s.item_id = m.id
             ORDER BY s.created_at DESC`
        );
        res.json(sales.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};