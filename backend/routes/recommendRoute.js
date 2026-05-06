import express from "express";
import { trackView, getRecommendations } from "../controllers/recommendController.js";
import authUser from "../middleware/auth.js";

const recommendRouter = express.Router();

recommendRouter.post('/track', authUser, trackView);
recommendRouter.post('/get', authUser, getRecommendations);

export default recommendRouter;
