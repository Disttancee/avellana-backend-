// src/routes/notifications.routes.js
const router = require("express").Router();
const auth   = require("../middleware/auth");
const ctrl   = require("../controllers/notifications.controller");

router.get  ("/",             auth, ctrl.getNotifications);
router.patch("/read-all",     auth, ctrl.markAllRead);
router.patch("/:id/read",     auth, ctrl.markOneRead);

module.exports = router;
