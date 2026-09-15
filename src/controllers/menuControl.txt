const db = require('../config/db');

// 1. Kuonyesha Vyakula/Vinywaji Vyote (Get All Menu Items)
exports.getAllMenuItems = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM menu_items ORDER BY category, name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Kuongeza Item Mpya Kwenye Menu (Add Menu Item)
exports.addMenuItem = async (req, res) => {
    const { name, category, price } = req.body;

    try {
        const newItem = await db.query(
            'INSERT INTO menu_items (name, category, price) VALUES ($1, $2, $3) RETURNING *',
            [name, category, price]
        );
        res.status(201).json({
            message: 'Item imeongezwa kwenye menu kikamilifu!',
            item: newItem.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Kubadilisha Taarifa za Item (Update Menu Item)
exports.updateMenuItem = async (req, res) => {
    const { id } = req.params;
    const { name, category, price, is_available } = req.body;

    try {
        const updatedItem = await db.query(
            `UPDATE menu_items 
             SET name = COALESCE($1, name), 
                 category = COALESCE($2, category), 
                 price = COALESCE($3, price), 
                 is_available = COALESCE($4, is_available) 
             WHERE id = $5 RETURNING *`,
            [name, category, price, is_available, id]
        );

        if (updatedItem.rows.length === 0) {
            return res.status(404).json({ message: 'Item haikupatikana!' });
        }

        res.json({
            message: 'Menu imerekebishwa kikamilifu!',
            item: updatedItem.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};