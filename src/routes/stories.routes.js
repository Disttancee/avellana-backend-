// src/routes/stories.routes.js
const router = require("express").Router();
const auth   = require("../middleware/auth");
const upload = require("../middleware/upload");
const ctrl   = require("../controllers/stories.controller");

router.get   ("/",          auth,                        ctrl.getFeedStories);
router.get   ("/my",        auth,                        ctrl.getMyStories);
router.post  ("/",          auth, upload.single("image"), ctrl.createStory);
router.post  ("/:id/view",  auth,                        ctrl.viewStory);
router.get   ("/:id/views", auth,                        ctrl.getStoryViews);
router.delete("/:id",       auth,                        ctrl.deleteStory);

module.exports = router;
