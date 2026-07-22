const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { authorize: roleAuthorize } = require('../middlewares/role.middleware');

router.use(authenticate);

// User routes
router.post('/', ticketController.createTicket);
router.get('/', ticketController.getMyTickets);
router.get('/:id', ticketController.getTicketDetails);
router.post('/:id/reply', ticketController.replyToTicket);

// Admin routes
router.get('/admin/all', roleAuthorize('admin'), ticketController.getAllTickets);
router.post('/admin/:id/reply', roleAuthorize('admin'), ticketController.adminReplyToTicket);

module.exports = router;
