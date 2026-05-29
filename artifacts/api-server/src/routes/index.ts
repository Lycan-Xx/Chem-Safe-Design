import { Router, type IRouter } from "express";
import healthRouter from "./health";
import assessmentsRouter from "./assessments";
import agentTurnRouter from "./agent-turn";
import calculateRiskRouter from "./calculate-risk";

const router: IRouter = Router();

router.use(healthRouter);
router.use(assessmentsRouter);
router.use(agentTurnRouter);
router.use(calculateRiskRouter);

export default router;
