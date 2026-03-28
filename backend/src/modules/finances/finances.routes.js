const express = require('express');
const financesController = require('./finances.controller');
const router = express.Router();

router.get('/', financesController.getAll);
router.post('/', financesController.create);
router.put('/:id/pay', financesController.pay); // Endpoint específico para registrar pagos
router.put('/:id', financesController.update);
router.delete('/:id', financesController.delete);
router.get('/calendar', financesController.getCalendar);
router.get('/subscriptions/clients', financesController.getSubscriptions);
router.post('/subscriptions/:id/advance', financesController.advancePayments);
router.delete('/subscriptions/:id', financesController.cancelSubscription);

module.exports = router;