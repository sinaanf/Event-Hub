import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import speakersRouter from "./speakers";
import sessionsRouter from "./sessions";
import attendeesRouter from "./attendees";
import analyticsRouter from "./analytics";
import valuePropsRouter from "./valueProps";
import companyNewsRouter from "./companyNews";
import suggestProspectsRouter from "./suggestProspects";
import generateEmailRouter from "./generateEmail";
import categoryIntelligenceRouter from "./categoryIntelligence";
import findContactRouter from "./findContact";
import pipelineRouter from "./pipeline";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(speakersRouter);
router.use(sessionsRouter);
router.use(attendeesRouter);
router.use(analyticsRouter);
router.use(valuePropsRouter);
router.use(companyNewsRouter);
router.use(suggestProspectsRouter);
router.use(generateEmailRouter);
router.use(categoryIntelligenceRouter);
router.use(findContactRouter);
router.use("/pipeline", pipelineRouter);
router.use("/profile", profileRouter);

export default router;
