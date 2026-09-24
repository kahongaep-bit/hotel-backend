const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./src/config/db');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// INITIALIZE DATABASE TABLES
const initDb = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL,
                role VARCHAR(50) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                price NUMERIC NOT NULL,
                category VARCHAR(100) DEFAULT 'Chakula',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                token_number VARCHAR(20),
                customer_name VARCHAR(100) DEFAULT 'Mteja',
                items JSONB NOT NULL,
                total_amount NUMERIC NOT NULL,
                payment_method VARCHAR(50) DEFAULT 'Cash',
                status VARCHAR(50) DEFAULT 'Pending',
                rejection_comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bank_deposits (
                id SERIAL PRIMARY KEY,
                amount NUMERIC DEFAULT 0,
                breakfast_amount NUMERIC DEFAULT 0,
                lunch_amount NUMERIC DEFAULT 0,
                dinner_amount NUMERIC DEFAULT 0,
                drinks_amount NUMERIC DEFAULT 0,
                rooms_amount NUMERIC DEFAULT 0,
                total_amount NUMERIC NOT NULL DEFAULT 0,
                deposited_by VARCHAR(100) DEFAULT 'Cashier',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS daily_previous_balances (
                id SERIAL PRIMARY KEY,
                balance_date DATE UNIQUE NOT NULL,
                previous_balance NUMERIC DEFAULT 0,
                total_balance NUMERIC DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sub_stock (
                id SERIAL PRIMARY KEY,
                item_name VARCHAR(255) NOT NULL,
                quantity NUMERIC NOT NULL DEFAULT 0,
                unit VARCHAR(50) NOT NULL,
                department VARCHAR(100) DEFAULT 'Jikoni',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS main_stock (
                id SERIAL PRIMARY KEY,
                item_name VARCHAR(255) NOT NULL,
                quantity NUMERIC NOT NULL DEFAULT 0,
                unit VARCHAR(50),
                unit_price NUMERIC DEFAULT 0,
                total_cost NUMERIC DEFAULT 0,
                supplier VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS stock_issues (
                id SERIAL PRIMARY KEY,
                item_name VARCHAR(255) NOT NULL,
                quantity NUMERIC NOT NULL DEFAULT 0,
                unit VARCHAR(50),
                department VARCHAR(100),
                total_value NUMERIC DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS requisitions (
                id SERIAL PRIMARY KEY,
                item_name VARCHAR(255) NOT NULL,
                quantity NUMERIC NOT NULL DEFAULT 0,
                unit VARCHAR(50) NOT NULL,
                department VARCHAR(100) DEFAULT 'Jikoni',
                supplier VARCHAR(255),
                estimated_cost NUMERIC DEFAULT 0,
                ratio_per_unit NUMERIC DEFAULT 1,
                total_portions NUMERIC DEFAULT 0,
                status VARCHAR(100) DEFAULT 'Pending',
                rejection_comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS shift_handovers (
                id SERIAL PRIMARY KEY,
                department VARCHAR(50) DEFAULT 'Bar',
                outgoing_staff VARCHAR(100) NOT NULL,
                incoming_staff VARCHAR(100) NOT NULL,
                items_delivered INT DEFAULT 0,
                pending_orders INT DEFAULT 0,
                handed_over_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_comment TEXT;
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Cash';
            ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);
            ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC DEFAULT 0;
            ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS requested_by VARCHAR(100) DEFAULT 'Hotel Manager';
            ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS ratio_per_unit NUMERIC DEFAULT 1;
            ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS total_portions NUMERIC DEFAULT 0;
            ALTER TABLE stock_issues ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            ALTER TABLE daily_previous_balances ADD COLUMN IF NOT EXISTS total_balance NUMERIC DEFAULT 0;
        `);

        console.log("Database tables initialized successfully!");
        
        await seedAdmin();
        await seedDefaultUsers();

    } catch (err) {
        console.error("Database initialization error:", err.message);
    }
};

const seedAdmin = async () => {
    try {
        await db.query(`DELETE FROM users WHERE email = $1`, ['admin@hotel.com']);
        const hashedPassword = await bcrypt.hash('Admin123!', 10);
        await db.query(
            `INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4)`,
            ['System Admin', 'admin@hotel.com', hashedPassword, 'admin']
        );
        console.log('✅ Admin user ametengenezwa na yupo tayari!');
    } catch (err) {
        console.error('❌ Hitilafu ya kutengeneza admin:', err.message);
    }
};

const seedDefaultUsers = async () => {
    try {
        const defaultUsers = [
            { name: 'Hotel Manager', email: 'manager@hotel.com', pass: 'Manager123!', role: 'Manager' },
            { name: 'Cashier Staff', email: 'cashier@hotel.com', pass: 'Cashier123!', role: 'Cashier' },
            { name: 'Principal Officer', email: 'principal@hotel.com', pass: 'Principal123!', role: 'Principal' },
            { name: 'Kitchen Staff', email: 'kitchen@hotel.com', pass: 'Kitchen123!', role: 'Kitchen' },
            { name: 'Bartender Staff', email: 'bar@hotel.com', pass: 'Bar123!', role: 'Bartender' },
            { name: 'Production Coordinator', email: 'production@hotel.com', pass: 'Production123!', role: 'Production' },
            { name: 'Procurement Officer', email: 'procurement@hotel.com', pass: 'Procurement123!', role: 'Procurement' },
            { name: 'Finance Accountant', email: 'finance@hotel.com', pass: 'Finance123!', role: 'Finance' }
        ];

        for (const u of defaultUsers) {
            const check = await db.query('SELECT * FROM users WHERE email = $1', [u.email]);
            if (check.rows.length === 0) {
                const hashedPassword = await bcrypt.hash(u.pass, 10);
                await db.query(
                    'INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4)',
                    [u.name, u.email, hashedPassword, u.role]
                );
            }
        }
        console.log('✅ Akaunti za majaribio zimewekwa kwenye database!');
    } catch (err) {
        console.error('❌ Hitilafu ya kuweka akaunti za majaribio:', err.message);
    }
};

initDb();

// ADMIN MANAGEMENT API ENDPOINTS
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role FROM users ORDER BY id ASC');
        return res.status(200).json(result.rows);
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.post('/api/admin/users', async (req, res) => {
    try {
        const { full_name, email, password, role } = req.body;
        if (!full_name || !email || !password || !role) {
            return res.status(400).json({ message: "Jaza taarifa zote za mtumiaji!", status: false });
        }
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        const result = await db.query(
            'INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role',
            [full_name.trim(), email.trim(), hashedPassword, role.trim()]
        );
        return res.status(201).json({ message: "Mtumiaji ameongezwa kikamilifu!", user: result.rows[0], status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.put('/api/admin/users/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!role) return res.status(400).json({ message: "Weka role mpya!", status: false });

        const result = await db.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, full_name, email, role',
            [role.trim(), id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Mtumiaji hajapatikana!", status: false });
        return res.status(200).json({ message: "Role imebadilishwa kikamilifu!", user: result.rows[0], status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Mtumiaji hajapatikana!", status: false });
        return res.status(200).json({ message: "Mtumiaji amefutwa kikamilifu!", status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

// ROUTE YA KUFUTA AU KURESET DATA ZOTE KIKAMILIFU
app.get('/api/reset-all-data-completely', async (req, res) => {
    try {
        await db.query('DELETE FROM orders');
        await db.query('DELETE FROM bank_deposits');
        await db.query('DELETE FROM daily_previous_balances');
        await db.query('DELETE FROM stock_issues');
        await db.query('DELETE FROM shift_handovers');
        await db.query('DELETE FROM sub_stock');
        await db.query('DELETE FROM main_stock');
        await db.query('DELETE FROM requisitions');
        
        return res.status(200).json({ 
            message: "Data zote, stoo, na historia zimefutwa kikamilifu!", 
            status: true 
        });
    } catch (err) {
        return res.status(500).json({ message: "Error resetting data: " + err.message, status: false });
    }
});

// AUTH & USERS
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Jaza Email na Password!" });

        const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
        if (result.rows.length === 0) return res.status(401).json({ message: "Email au Password sio sahihi" });

        const user = result.rows[0];
        let isMatch = false;
        if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
            isMatch = await bcrypt.compare(password.trim(), user.password);
        } else {
            isMatch = (user.password && user.password.trim() === password.trim());
        }

        if (!isMatch) return res.status(401).json({ message: "Email au Password sio sahihi" });

        return res.status(200).json({
            message: "Umeingia kikamilifu",
            user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role }
        });
    } catch (err) {
        return res.status(500).json({ message: "Hitilafu ya Server: " + err.message });
    }
});

app.put('/api/users/change-password', async (req, res) => {
    try {
        const { email, old_password, new_password } = req.body;
        if (!email || !old_password || !new_password) {
            return res.status(400).json({ message: "Jaza taarifa zote!", status: false });
        }

        const userRes = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
        if (userRes.rows.length === 0) return res.status(404).json({ message: "Mtumiaji hajapatikana!", status: false });

        const user = userRes.rows[0];
        let isMatch = false;
        if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
            isMatch = await bcrypt.compare(old_password.trim(), user.password);
        } else {
            isMatch = (user.password && user.password.trim() === old_password.trim());
        }

        if (!isMatch) return res.status(401).json({ message: "Password ya zamani siyo sahihi!", status: false });

        const hashedNewPassword = await bcrypt.hash(new_password.trim(), 10);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, user.id]);
        return res.status(200).json({ message: "Password imebadilishwa kikamilifu!", status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.post('/api/users/reset-password', async (req, res) => {
    try {
        const { email, new_password } = req.body;
        if (!email || !new_password) return res.status(400).json({ message: "Ingiza email na password mpya!", status: false });

        const hashedNewPassword = await bcrypt.hash(new_password.trim(), 10);
        const result = await db.query(
            'UPDATE users SET password = $1 WHERE LOWER(email) = LOWER($2) RETURNING id, full_name, email',
            [hashedNewPassword, email.trim()]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: "Mtumiaji hajapatikana!", status: false });
        return res.status(200).json({ message: "Password imerejeshwa kikamilifu!", status: true, user: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

// SHIFT HANDOVERS
app.post('/api/bar/handover', async (req, res) => {
    try {
        const { outgoing_staff, incoming_staff, items_delivered, pending_orders, department } = req.body;
        if (!outgoing_staff || !incoming_staff) {
            return res.status(400).json({ message: "Ingiza majina ya watumishi wote wawili!", status: false });
        }
        const dept = department || 'Bar';
        const result = await db.query(
            `INSERT INTO shift_handovers (department, outgoing_staff, incoming_staff, items_delivered, pending_orders)
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, department, outgoing_staff, incoming_staff, items_delivered, pending_orders, TO_CHAR(handed_over_at, 'YYYY-MM-DD HH24:MI') as handed_over_at`,
            [dept, outgoing_staff.trim(), incoming_staff.trim(), parseInt(items_delivered) || 0, parseInt(pending_orders) || 0]
        );
        return res.status(201).json({ message: "Makabidhiano yamerekodiwa kikamilifu!", status: true, handover: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.get('/api/bar/current-shift', async (req, res) => {
    try {
        const { department } = req.query;
        const dept = department || 'Bar';
        const result = await db.query(
            `SELECT id, department, outgoing_staff, incoming_staff, items_delivered, pending_orders, TO_CHAR(handed_over_at, 'YYYY-MM-DD HH24:MI') as handed_over_at 
             FROM shift_handovers WHERE LOWER(department) = LOWER($1) ORDER BY id DESC LIMIT 10`,
            [dept]
        );
        const activeStaff = result.rows.length > 0 ? result.rows[0].incoming_staff : "Hajathibitishwa";
        return res.status(200).json({ active_staff: activeStaff, history: result.rows });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message });
    }
});

// PRODUCTS & MENU
app.get('/api/products', async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, price, category FROM products ORDER BY id DESC');
        return res.status(200).json(result.rows);
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message });
    }
});

app.get('/api/menu', async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, price, category FROM products ORDER BY id DESC');
        return res.status(200).json(result.rows);
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, price, category } = req.body;
        const result = await db.query(
            'INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING *',
            [name, price, category || 'Chakula']
        );
        return res.status(201).json({ message: "Bidhaa imesajiliwa kikamilifu!", product: result.rows[0], status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.post('/api/menu', async (req, res) => {
    try {
        const { name, price, category } = req.body;
        const result = await db.query(
            'INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING *',
            [name, price, category || 'Chakula']
        );
        return res.status(201).json({ message: "Bidhaa imesajiliwa kikamilifu!", product: result.rows[0], status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category } = req.body;
        const result = await db.query(
            'UPDATE products SET name = COALESCE($1, name), price = COALESCE($2, price), category = COALESCE($3, category) WHERE id = $4 RETURNING *',
            [name, price, category, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Bidhaa haikupatikana!", status: false });
        return res.status(200).json({ message: "Bidhaa imebadilishwa kikamilifu!", product: result.rows[0], status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.put('/api/menu/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category } = req.body;
        const result = await db.query(
            'UPDATE products SET name = COALESCE($1, name), price = COALESCE($2, price), category = COALESCE($3, category) WHERE id = $4 RETURNING *',
            [name, price, category, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Bidhaa haikupatikana!", status: false });
        return res.status(200).json({ message: "Bidhaa imebadilishwa kikamilifu!", product: result.rows[0], status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Bidhaa haikupatikana!", status: false });
        return res.status(200).json({ message: "Bidhaa imefutwa kikamilifu!", status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.delete('/api/menu/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Bidhaa haikupatikana!", status: false });
        return res.status(200).json({ message: "Bidhaa imefutwa kikamilifu!", status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

// REQUISITIONS
app.get('/api/requisitions', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM requisitions ORDER BY id DESC');
        return res.status(200).json(result.rows);
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message });
    }
});

app.post('/api/requisitions', async (req, res) => {
    try {
        const { item_name, quantity, unit, department, requested_by, ratio_per_unit, total_portions } = req.body;
        const result = await db.query(
            `INSERT INTO requisitions (item_name, quantity, unit, department, requested_by, ratio_per_unit, total_portions, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending') RETURNING *`,
            [item_name, quantity, unit || 'Pc', department || 'Jikoni', requested_by || 'Hotel Manager', ratio_per_unit || 1, total_portions || quantity]
        );
        return res.status(201).json({ message: "Ombi limetumwa!", requisition: result.rows[0], status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.put('/api/requisitions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, quantity, unit, department, supplier, estimated_cost, ratio_per_unit, total_portions, status } = req.body;
        const newStatus = status || 'Pending';

        const result = await db.query(
            `UPDATE requisitions 
             SET item_name = COALESCE($1, item_name), quantity = COALESCE($2, quantity), unit = COALESCE($3, unit),
                 department = COALESCE($4, department), supplier = COALESCE($5, supplier), estimated_cost = COALESCE($6, estimated_cost),
                 ratio_per_unit = COALESCE($7, ratio_per_unit), total_portions = COALESCE($8, total_portions),
                 status = $9, rejection_comment = NULL
             WHERE id = $10 RETURNING *`,
            [item_name || null, quantity || null, unit || null, department || null, supplier || null, estimated_cost || null, ratio_per_unit || null, total_portions || null, newStatus, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: "Ombi halikupatikana!", status: false });
        return res.status(200).json({ message: "Ombi limerekebishwa!", requisition: result.rows[0], status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.delete('/api/requisitions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM requisitions WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Ombi halikupatikana!", status: false });
        return res.status(200).json({ message: "Ombi limefutwa kikamilifu!", status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.put('/api/requisitions/:id/approval', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejection_comment } = req.body;
        const result = await db.query(
            'UPDATE requisitions SET status = $1, rejection_comment = COALESCE($2, rejection_comment) WHERE id = $3 RETURNING *',
            [status, rejection_comment || null, id]
        );
        return res.status(200).json({ message: "Status imebadilishwa!", requisition: result.rows[0], status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

// ORDERS & STOCK DEDUCTION
app.post('/api/orders', async (req, res) => {
    try {
        const { customer_name, items, total_amount, payment_method } = req.body;
        if (!items || (Array.isArray(items) && items.length === 0)) {
            return res.status(400).json({ message: "Tafadhali chagua bidhaa!", status: false });
        }
        const tokenNumber = 'T-' + Math.floor(100 + Math.random() * 900);

        let itemsForCheck = items;
        if (typeof itemsForCheck === 'string') {
            try { itemsForCheck = JSON.parse(itemsForCheck); } catch (e) { itemsForCheck = []; }
        }
        const isRoomOrHallItem = (it) => {
            const category = (it.category || '').toLowerCase();
            const name = (it.name || '').toLowerCase();
            return category.includes('chumba') || category.includes('vyumba') ||
                   category.includes('ukumbi') || category.includes('kumbi') ||
                   name.includes('twiga') || name.includes('nyati');
        };
        const isPureRoomOrHallOrder = Array.isArray(itemsForCheck) && itemsForCheck.length > 0 && itemsForCheck.every(isRoomOrHallItem);
        const initialStatus = isPureRoomOrHallOrder ? 'Completed' : 'Pending';
        const formattedItems = typeof items === 'string' ? items : JSON.stringify(items);

        const result = await db.query(
            `INSERT INTO orders (token_number, customer_name, items, total_amount, payment_method, status) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as created_at`,
            [tokenNumber, customer_name || 'Mteja', formattedItems, parseFloat(total_amount) || 0, payment_method || 'Cash', initialStatus]
        );
        return res.status(201).json({ message: "Oda imelipwa na kutumwa!", order: result.rows[0], status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const result = await db.query(`SELECT id, token_number, customer_name, items, total_amount, payment_method, status, rejection_comment, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as created_at FROM orders ORDER BY id DESC`);
        return res.status(200).json(result.rows);
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message });
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const newStatus = status || 'Ready';

        const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
        if (orderRes.rows.length === 0) return res.status(404).json({ message: "Oda haikupatikana!", status: false });

        const order = orderRes.rows[0];
        if (newStatus.toLowerCase() === 'ready' || newStatus.toLowerCase() === 'completed') {
            let itemsArr = order.items;
            if (typeof itemsArr === 'string') {
                try { itemsArr = JSON.parse(itemsArr); } catch (e) { itemsArr = []; }
            }

            if (Array.isArray(itemsArr)) {
                const allSubStockRes = await db.query('SELECT * FROM sub_stock');
                const barStock = allSubStockRes.rows.filter(r => (r.department || '').toLowerCase().includes('bar'));

                for (const item of itemsArr) {
                    const itemName = (item.name || '').toLowerCase().trim();
                    const orderedQty = parseFloat(item.quantity) || 1;
                    if (itemName === '') continue;

                    for (const stockItem of barStock) {
                        const stockNameLower = stockItem.item_name.toLowerCase().trim();
                        if (stockNameLower === itemName || stockNameLower.includes(itemName) || itemName.includes(stockNameLower)) {
                            await db.query(`UPDATE sub_stock SET quantity = GREATEST(0, quantity - $1) WHERE id = $2`, [orderedQty, stockItem.id]);
                            break;
                        }
                    }
                }
            }
        }

        const updated = await db.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [newStatus, id]);
        return res.status(200).json({ message: "Status imebadilishwa!", status: true, order: updated.rows[0] });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.put('/api/orders/:id/resubmit', async (req, res) => {
    try {
        const { id } = req.params;
        const { customer_name, items, total_amount, payment_method } = req.body;

        const existingOrderRes = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
        if (existingOrderRes.rows.length === 0) return res.status(404).json({ message: "Oda haikupatikana!", status: false });

        const previousOrder = existingOrderRes.rows[0];
        const previousTotal = parseFloat(previousOrder.total_amount) || 0;
        const newTotal = parseFloat(total_amount) || 0;

        if (newTotal < previousTotal) {
            return res.status(400).json({ message: `Huwezi kupunguza gharama! Oda ya mwanzo ilikuwa TSH ${previousTotal.toLocaleString()}.`, status: false });
        }

        const formattedItems = typeof items === 'string' ? items : JSON.stringify(items);
        const result = await db.query(
            `UPDATE orders SET customer_name = COALESCE($1, customer_name), items = $2, total_amount = $3, payment_method = COALESCE($4, payment_method), status = 'Pending', rejection_comment = NULL WHERE id = $5 RETURNING *`,
            [customer_name, formattedItems, newTotal, payment_method, id]
        );

        return res.status(200).json({ message: `Oda imebadilishwa na kutumwa tena!`, order: result.rows[0], status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.put('/api/orders/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { rejection_reason, department } = req.body;
        const reason = rejection_reason ? rejection_reason.trim() : "Bidhaa haipatikani";
        const deptStr = (department || 'Jikoni').toString().toLowerCase();
        const statusTag = deptStr.includes('bar') ? 'Rejected_By_Bar' : 'Rejected_By_Kitchen';

        const result = await db.query("UPDATE orders SET status = $1, rejection_comment = $2 WHERE id = $3 RETURNING *", [statusTag, reason, id]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Oda haikupatikana!", status: false });
        return res.status(200).json({ message: "Oda imerudishwa kwa Cashier!", status: true, order: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

// FINANCE, DAILY SALES (Sahihi kulingana na Logic yako ya Balance za Leo na Zilizopita)
app.get('/api/finance/daily-sales', async (req, res) => {
    try {
        const targetDate = req.query.date;
        let salesQuery;
        let salesParams = [];

        if (targetDate && targetDate.trim() !== '') {
            salesQuery = `
                SELECT
                    COALESCE(SUM(total_amount), 0) AS total_sales,
                    COALESCE(SUM(
                        CASE
                            WHEN LOWER(TRIM(COALESCE(payment_method, 'Cash'))) LIKE '%cash%'
                            THEN total_amount
                            ELSE 0
                        END
                    ), 0) AS cash_sales,
                    COALESCE(SUM(
                        CASE
                            WHEN LOWER(TRIM(COALESCE(payment_method, 'Cash'))) NOT LIKE '%cash%'
                            THEN total_amount
                            ELSE 0
                        END
                    ), 0) AS lipanamba_sales
                FROM orders
                WHERE LOWER(status) NOT LIKE '%rejected_by%'
                  AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date = $1::date
            `;
            salesParams = [targetDate.trim()];
        } else {
            salesQuery = `
                SELECT
                    COALESCE(SUM(total_amount), 0) AS total_sales,
                    COALESCE(SUM(
                        CASE
                            WHEN LOWER(TRIM(COALESCE(payment_method, 'Cash'))) LIKE '%cash%'
                            THEN total_amount
                            ELSE 0
                        END
                    ), 0) AS cash_sales,
                    COALESCE(SUM(
                        CASE
                            WHEN LOWER(TRIM(COALESCE(payment_method, 'Cash'))) NOT LIKE '%cash%'
                            THEN total_amount
                            ELSE 0
                        END
                    ), 0) AS lipanamba_sales
                FROM orders
                WHERE LOWER(status) NOT LIKE '%rejected_by%'
                  AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date =
                      (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date
            `;
            salesParams = [];
        }

        let depositQuery;
        let depositParams = [];
        if (targetDate && targetDate.trim() !== '') {
            depositQuery = `
                SELECT COALESCE(SUM(total_amount), 0) AS total_deposited
                FROM bank_deposits
                WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date = $1::date
            `;
            depositParams = [targetDate.trim()];
        } else {
            depositQuery = `
                SELECT COALESCE(SUM(total_amount), 0) AS total_deposited
                FROM bank_deposits
                WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date = 
                      (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date
            `;
            depositParams = [];
        }

        const salesRes = await db.query(salesQuery, salesParams);
        const depositRes = await db.query(depositQuery, depositParams);

        const cashSales = parseFloat(salesRes.rows[0].cash_sales || 0);
        const lipanambaSales = parseFloat(salesRes.rows[0].lipanamba_sales || 0);
        const grossTotal = parseFloat(salesRes.rows[0].total_sales || (cashSales + lipanambaSales));
        const totalDepositedToday = parseFloat(depositRes.rows[0].total_deposited || 0);

        const targetDateCondition = targetDate && targetDate.trim() !== '' ? `'${targetDate.trim()}'::date` : `(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date`;
        
        // Kutafuta Salio lililopita (Previous Balance) kutoka siku zilizotangulia
        const prevBalQuery = `
            SELECT previous_balance, total_balance 
            FROM daily_previous_balances
            WHERE balance_date < ${targetDateCondition}
            ORDER BY balance_date DESC
            LIMIT 1
        `;
        const prevBalRes = await db.query(prevBalQuery);

        const previousBalanceBase = prevBalRes.rows.length > 0
            ? parseFloat(prevBalRes.rows[0].total_balance || prevBalRes.rows[0].previous_balance || 0)
            : 0;

        const rawTodayBalance = grossTotal - totalDepositedToday;

        const totalBalance = Math.max(
            previousBalanceBase + rawTodayBalance,
            0
        );

        const todayBalance = Math.max(
            rawTodayBalance,
            0
        );

        const previousBalanceDisplay = Math.max(
            previousBalanceBase,
            0
        );

        const currentLocalDate = targetDate && targetDate.trim() !== '' ? targetDate.trim() : null;
        const upsertBalanceQuery = `
            INSERT INTO daily_previous_balances (balance_date, previous_balance, total_balance)
            VALUES (COALESCE(${currentLocalDate ? `'${currentLocalDate}'::date` : `(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date`}), $1, $2)
            ON CONFLICT (balance_date) 
            DO UPDATE SET previous_balance = $1, total_balance = $2
        `;
        
        await db.query(upsertBalanceQuery, [previousBalanceDisplay, totalBalance]);

        return res.status(200).json({
            cash_sales: cashSales,
            lipanamba_sales: lipanambaSales,
            gross_total: grossTotal,
            total_deposited: totalDepositedToday,
            today_balance: todayBalance,
            previous_balance: previousBalanceDisplay,
            total_balance: totalBalance,
            total: totalBalance,
            balance: totalBalance
        });
    } catch (err) {
        console.error("Daily Sales Error:", err.message);
        return res.status(500).json({
            cash_sales: 0, lipanamba_sales: 0, gross_total: 0, total_deposited: 0, today_balance: 0, previous_balance: 0, total_balance: 0, total: 0, balance: 0
        });
    }
});

app.get('/api/finance/bar-sales', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = `SELECT items, total_amount, created_at FROM orders WHERE LOWER(status) NOT LIKE '%rejected_by%'`;
        const params = [];

        if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
            params.push(startDate.trim(), endDate.trim());
            query += ` AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date >= $1 AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date <= $2`;
        }

        const result = await db.query(query, params);
        let drinksTotal = 0;
        let completedOrdersCount = 0;

        result.rows.forEach(row => {
            let items = row.items;
            if (typeof items === 'string') {
                try { items = JSON.parse(items); } catch (e) { items = []; }
            }
            let orderHasDrinks = false;
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const category = (item.category || '').toLowerCase();
                    const name = (item.name || '').toLowerCase();
                    const itemTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
                    if (category.includes('vinywaji') || category.includes('bar') || name.includes('bia') || name.includes('soda')) {
                        drinksTotal += itemTotal;
                        orderHasDrinks = true;
                    }
                });
            }
            if (orderHasDrinks) completedOrdersCount++;
        });

        return res.status(200).json({ completed_orders: completedOrdersCount, drinks_total: drinksTotal });
    } catch (err) {
        return res.status(500).json({ completed_orders: 0, drinks_total: 0 });
    }
});

app.get('/api/finance/category-breakdown', async (req, res) => {
    try {
        const { date } = req.query;
        let dateFilter = "";
        const queryParams = [];

        if (date && date.trim() !== '') {
            dateFilter = ` AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date = $1`;
            queryParams.push(date.trim());
        } else {
            dateFilter = ` AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date`;
        }

        const result = await db.query(`SELECT items FROM orders WHERE LOWER(status) NOT LIKE '%rejected_by%' ${dateFilter}`, queryParams);
        let foodTotal = 0, drinksTotal = 0, roomsTotal = 0, hallsTotal = 0;

        result.rows.forEach(row => {
            let items = row.items;
            if (typeof items === 'string') {
                try { items = JSON.parse(items); } catch (e) { items = []; }
            }
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const category = (item.category || '').toLowerCase();
                    const name = (item.name || '').toLowerCase();
                    const itemTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);

                    if (category.includes('vinywaji') || category.includes('bar') || name.includes('bia') || name.includes('soda')) {
                        drinksTotal += itemTotal;
                    } else if (category.includes('chumba') || category.includes('vyumba')) {
                        roomsTotal += itemTotal;
                    } else if (category.includes('ukumbi') || category.includes('kumbi')) {
                        hallsTotal += itemTotal;
                    } else {
                        foodTotal += itemTotal;
                    }
                });
            }
        });

        return res.status(200).json({ food_total: foodTotal, drinks_total: drinksTotal, rooms_total: roomsTotal, halls_total: hallsTotal });
    } catch (err) {
        return res.status(200).json({ food_total: 0, drinks_total: 0, rooms_total: 0, halls_total: 0 });
    }
});

app.get('/api/finance/today-deposits', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT COALESCE(SUM(total_amount), 0) AS total 
            FROM bank_deposits 
            WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date
        `);
        return res.status(200).json({ total: parseFloat(result.rows[0].total || 0) });
    } catch (err) {
        return res.status(500).json({ total: 0 });
    }
});

app.get('/api/finance/reports', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let salesQuery = `SELECT COALESCE(SUM(total_amount), 0) AS total_sales, COUNT(id) AS total_orders, COALESCE(SUM(CASE WHEN LOWER(TRIM(payment_method)) LIKE '%cash%' THEN total_amount ELSE 0 END), 0) AS cash_sales, COALESCE(SUM(CASE WHEN LOWER(TRIM(payment_method)) NOT LIKE '%cash%' THEN total_amount ELSE 0 END), 0) AS lipanamba_sales FROM orders WHERE LOWER(status) NOT LIKE '%rejected_by%'`;
        let depositQuery = `SELECT COALESCE(SUM(total_amount), 0) AS total_deposits FROM bank_deposits WHERE 1=1`;

        const queryParams = [];
        if (startDate && endDate) {
            salesQuery += ` AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date >= $1 AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date <= $2`;
            depositQuery += ` AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date >= $1 AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date <= $2`;
            queryParams.push(startDate, endDate);
        }

        const salesRes = await db.query(salesQuery, queryParams);
        const depositRes = await db.query(depositQuery, queryParams);

        const s = salesRes.rows[0] || {};
        const d = depositRes.rows[0] || {};

        const totalSales = parseFloat(s.total_sales || 0);
        const cashSales = parseFloat(s.cash_sales || 0);
        const lipanambaSales = parseFloat(s.lipanamba_sales || 0);
        const totalDeposits = parseFloat(d.total_deposits || 0);
        const balance = Math.max(totalSales - totalDeposits, 0);

        return res.status(200).json({
            total_sales: totalSales,
            cash_sales: cashSales,
            lipanamba_sales: lipanambaSales,
            total_orders: parseInt(s.total_orders || 0),
            total_deposits: totalDeposits,
            balance: balance
        });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message });
    }
});

app.post('/api/finance/bank-deposit', async (req, res) => {
    try {
        const b = req.body || {};
        const breakfast = parseFloat(b.breakfast_amount) || 0;
        const lunch = parseFloat(b.lunch_amount) || 0;
        const dinner = parseFloat(b.dinner_amount) || 0;
        const drinks = parseFloat(b.drinks_amount) || 0;
        const rooms = parseFloat(b.rooms_amount) || 0;
        const requestedDeposit = parseFloat(b.total_amount) || (breakfast + lunch + dinner + drinks + rooms);

        if (requestedDeposit <= 0) {
            return res.status(400).json({ message: "Ingiza kiasi sahihi cha deposit!", status: false });
        }

        const result = await db.query(
            `INSERT INTO bank_deposits (amount, breakfast_amount, lunch_amount, dinner_amount, drinks_amount, rooms_amount, total_amount, deposited_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [requestedDeposit, breakfast, lunch, dinner, drinks, rooms, requestedDeposit, b.deposited_by || 'Cashier']
        );

        return res.status(201).json({ message: "Pesa zimeingia benki kikamilifu!", deposit: result.rows[0], status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

// STOCK & REPORTS
app.get('/api/stock/main', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM main_stock ORDER BY id DESC');
        return res.status(200).json(result.rows);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

app.post('/api/stock/main', async (req, res) => {
    try {
        const { item_name, quantity, unit, unit_price, total_cost, supplier } = req.body;
        const qtyVal = parseFloat(quantity) || 0;
        const priceVal = parseFloat(unit_price) || 0;
        const totalVal = parseFloat(total_cost) || (qtyVal * priceVal);

        const existing = await db.query('SELECT * FROM main_stock WHERE LOWER(TRIM(item_name)) = LOWER(TRIM($1))', [item_name]);
        if (existing.rows.length > 0) {
            await db.query(`UPDATE main_stock SET quantity = quantity + $1, unit_price = $2, total_cost = total_cost + $3 WHERE id = $4`, [qtyVal, priceVal, totalVal, existing.rows[0].id]);
        } else {
            await db.query(`INSERT INTO main_stock (item_name, quantity, unit, unit_price, total_cost, supplier) VALUES ($1, $2, $3, $4, $5, $6)`, [item_name.trim(), qtyVal, unit || 'Pc', priceVal, totalVal, supplier || null]);
        }
        return res.status(201).json({ message: "Stoki imeingizwa!", status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.get('/api/stock/sub', async (req, res) => {
    try {
        const { department } = req.query;
        let query = `SELECT id, item_name, quantity, unit, department FROM sub_stock WHERE 1=1`;
        const params = [];
        if (department) {
            query += ` AND LOWER(department) LIKE $1`;
            params.push(`%${department.toLowerCase()}%`);
        }
        const result = await db.query(query, params);
        return res.status(200).json(result.rows);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

app.post('/api/stock/issue-substore', async (req, res) => {
    try {
        const { item_name, quantity, department } = req.body;
        const issueQty = parseFloat(quantity) || 0;
        if (!item_name || issueQty <= 0) return res.status(400).json({ message: "Ingiza taarifa sahihi!", status: false });

        let mainRes = await db.query('SELECT * FROM main_stock WHERE LOWER(TRIM(item_name)) = LOWER(TRIM($1))', [item_name]);
        if (mainRes.rows.length === 0) {
            mainRes = await db.query("SELECT * FROM main_stock WHERE LOWER(item_name) LIKE '%' || LOWER(TRIM($1)) || '%' OR LOWER($1) LIKE '%' || LOWER(item_name) || '%' ORDER BY id DESC LIMIT 1", [item_name]);
        }

        if (mainRes.rows.length === 0 || parseFloat(mainRes.rows[0].quantity) < issueQty) {
            return res.status(400).json({ message: "Stoki haitoshi Stoo Kuu!", status: false });
        }

        const item = mainRes.rows[0];
        const unitPrice = parseFloat(item.unit_price) || 0;
        const totalValue = issueQty * unitPrice;
        let cleanDept = (department || 'Jikoni').trim();

        await db.query('UPDATE main_stock SET quantity = quantity - $1 WHERE id = $2', [issueQty, item.id]);

        const subRes = await db.query('SELECT * FROM sub_stock WHERE LOWER(TRIM(item_name)) = LOWER(TRIM($1)) AND LOWER(TRIM(department)) = LOWER(TRIM($2))', [item.item_name, cleanDept]);
        if (subRes.rows.length > 0) {
            await db.query('UPDATE sub_stock SET quantity = quantity + $1 WHERE id = $2', [issueQty, subRes.rows[0].id]);
        } else {
            await db.query('INSERT INTO sub_stock (item_name, quantity, unit, department) VALUES ($1, $2, $3, $4)', [item.item_name.trim(), issueQty, item.unit || 'Pc', cleanDept]);
        }

        await db.query('INSERT INTO stock_issues (item_name, quantity, unit, department, total_value) VALUES ($1, $2, $3, $4, $5)', [item.item_name.trim(), issueQty, item.unit || 'Pc', cleanDept, totalValue]);

        return res.status(200).json({ message: "Mzigo umetolewa kikamilifu!", status: true });
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message, status: false });
    }
});

app.get('/api/reports/stock-issues', async (req, res) => {
    try {
        const { startDate, endDate, department } = req.query;
        let query = 'SELECT * FROM stock_issues WHERE 1=1';
        const params = [];

        if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
            params.push(startDate.trim(), endDate.trim());
            query += ` AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date >= $1 AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date <= $2`;
        }
        if (department && department !== 'All' && department.trim() !== '') {
            params.push(department.trim());
            query += ` AND LOWER(department) = LOWER($${params.length})`;
        }
        query += ' ORDER BY id DESC';

        const result = await db.query(query, params);
        return res.status(200).json(result.rows);
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message });
    }
});

app.get('/api/reports/procured-items', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = "SELECT * FROM requisitions WHERE LOWER(status) IN ('procured', 'approved_principal')";
        const params = [];

        if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
            params.push(startDate.trim(), endDate.trim());
            query += ` AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date >= $1 AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Dar_es_Salaam')::date <= $2`;
        }
        query += " ORDER BY id DESC";

        const result = await db.query(query, params);
        return res.status(200).json(result.rows);
    } catch (err) {
        return res.status(500).json({ message: "Error: " + err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on Port ${PORT}`);
});