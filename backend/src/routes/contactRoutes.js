const express = require('express');
const { sendContact } = require('../controllers/contactController');
const { contactLimiter } = require('../middlewares/limiters');

const router = express.Router();
router.use(contactLimiter);
router.post('/', sendContact);

module.exports = router;
