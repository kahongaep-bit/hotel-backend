const express = require('express');
const router = express.Router();
const { getInventory, addInventoryItem, updateStock } = require('../controllers/inventoryController');

router.get('/', getInventory);
router.post('/', addInventoryItem);
router.put('/:id', updateStock);

module.exports = router;