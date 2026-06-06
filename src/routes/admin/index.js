const express = require('express');
const adminController = require('../../controllers/admin');
const { requireAdmin } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(requireAdmin);

router.get('/meta', adminController.meta);
router.get('/dashboard', adminController.dashboard);
router.get('/reports/revenue.pdf', adminController.exportRevenuePdf);
router.get('/orders/:id/invoice.pdf', adminController.exportInvoicePdf);
router.post('/material-imports/create-with-details', adminController.createMaterialImport);
router.post('/orders/:id/status', adminController.updateOrderStatus);
router.post('/orders/:id/complete', adminController.completeOrder);
router.post('/orders/:id/assign-driver', adminController.assignDriver);
router.post('/members/:userId/refresh-rank', adminController.refreshMembership);
router.get('/:resource', adminController.list);
router.get('/:resource/:id', adminController.getById);
router.post('/:resource', adminController.create);
router.put('/:resource/:id', adminController.update);
router.delete('/:resource/:id', adminController.remove);

module.exports = router;
