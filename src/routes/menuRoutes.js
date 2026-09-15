const express = require('express');
const router = express.Router();
const { getAllMenuItems, addMenuItem, updateMenuItem } = require('../controllers/menuController');

router.get('/', getAllMenuItems);
router.post('/', addMenuItem);
router.put('/:id', updateMenuItem);

module.exports = router;