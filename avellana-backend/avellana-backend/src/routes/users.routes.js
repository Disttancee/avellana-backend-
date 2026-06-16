// src/routes/users.routes.js
const router = require("express").Router();
const auth   = require("../middleware/auth");
const upload = require("../middleware/upload");
const ctrl   = require("../controllers/users.controller");

router.get ("/search",           auth,              ctrl.searchUsers);
router.get ("/suggested",        auth,              ctrl.suggestedUsers);
router.put ("/me",               auth, upload.single("avatar"), ctrl.updateProfile);
router.get ("/:username",        auth,              ctrl.getProfile);
router.post("/:username/follow", auth,              ctrl.followUser);

module.exports = router;
