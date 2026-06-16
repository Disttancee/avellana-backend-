// src/routes/messages.routes.js
const router = require("express").Router();
const auth   = require("../middleware/auth");
const ctrl   = require("../controllers/messages.controller");

router.get("/conversations", auth, ctrl.getConversations);
router.get("/:userId",       auth, ctrl.getHistory);

module.exports = router;
