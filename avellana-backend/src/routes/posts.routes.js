// src/routes/posts.routes.js
const router = require("express").Router();
const auth   = require("../middleware/auth");
const upload = require("../middleware/upload");
const ctrl   = require("../controllers/posts.controller");

router.get ("/feed",              auth,              ctrl.getFeed);
router.post("/",                  auth, upload.single("image"), ctrl.createPost);
router.get ("/user/:username",    auth,              ctrl.getUserPosts);
router.post("/:id/like",         auth,              ctrl.toggleLike);
router.delete("/:id",            auth,              ctrl.deletePost);

module.exports = router;
