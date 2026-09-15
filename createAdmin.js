const db = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('Admin123!', 10);
        const result = await db.query(
            `INSERT INTO users (full_name, email, password, role) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (email) DO NOTHING 
             RETURNING id, full_name, email, role;`,
            ['System Admin', 'admin@hotel.com', hashedPassword, 'ADMIN']
        );

        if (result.rows.length > 0) {
            console.log('✅ Admin user ametengenezwa kikamilifu!');
            console.log(result.rows[0]);
        } else {
            console.log('⚠️ Admin mwenye email hii tayari yupo!');
        }
        process.exit();
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

createAdmin();