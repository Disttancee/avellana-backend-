// src/routes/comments.routes.js
const router = require("express").Router({ mergeParams: true });
const auth   = require("../middleware/auth");
const ctrl   = require("../controllers/comments.controller");

router.get   ("/",           auth, ctrl.getComments);
router.post  ("/",           auth, ctrl.addComment);
router.delete("/:commentId", auth, ctrl.deleteComment);

module.exports = router;
