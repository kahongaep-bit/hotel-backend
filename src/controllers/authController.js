const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Usajili wa Mtumiaji Mpya (Register)
exports.registerUser = async (req, res) => {
    const { full_name, email, password, role } = req.body;

    try {
        // Angalia kama email ipo tayari
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'Email hii imeshasajiliwa tayari!' });
        }

        // Ficha password (Hash password)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Hifadhi kwenye Database
        const newUser = await db.query(
            'INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role',
            [full_name, email, hashedPassword, role || 'CASHIER']
        );

        res.status(201).json({
            message: 'Mtumiaji amesajiliwa kikamilifu!',
            user: newUser.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Kuingia Kwenye Mfumo (Login)
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Angalia kama mtumiaji yupo
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'Email au Password sio sahihi!' });
        }

        const user = userResult.rows[0];

        // Hakiki password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Email au Password sio sahihi!' });
        }

        // Tengeneza JWT Token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Umeingia kikamilifu!',
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};