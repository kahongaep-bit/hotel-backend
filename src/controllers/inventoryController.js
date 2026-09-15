const db = require('../config/db');

// 1. Kuonyesha Bidhaa Zote Zilizopo Stoo (Get All Inventory)
exports.getInventory = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM inventory ORDER BY item_name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Kuongeza Bidhaa Mpya Stoo (Add New Item)
exports.addInventoryItem = async (req, res) => {
    const { item_name, quantity, unit, reorder_level } = req.body;

    try {
        const newItem = await db.query(
            `INSERT INTO inventory (item_name, quantity, unit, reorder_level) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [item_name, quantity, unit, reorder_level || 5.0]
        );

        res.status(201).json({
            message: 'Bidhaa imeongezwa stoo kikamilifu!',
            item: newItem.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Kurekebisha Idadi ya Bidhaa (Update Stock Quantity)
exports.updateStock = async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;

    try {
        const updatedItem = await db.query(
            `UPDATE inventory 
             SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 RETURNING *`,
            [quantity, id]
        );

        if (updatedItem.rows.length === 0) {
            return res.status(404).json({ message: 'Bidhaa haikupatikana stoo!' });
        }

        res.json({
            message: 'Stock imerekebishwa kikamilifu!',
            item: updatedItem.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};