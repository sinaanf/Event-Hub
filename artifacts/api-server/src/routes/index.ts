import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import speakersRouter from "./speakers";
import sessionsRouter from "./sessions";
import attendeesRouter from "./attendees";
import analyticsRouter from "./analytics";
import valuePropsRouter from "./valueProps";
import companyNewsRouter from "./companyNews";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(speakersRouter);
router.use(sessionsRouter);
router.use(attendeesRouter);
router.use(analyticsRouter);
router.use(valuePropsRouter);
router.use(companyNewsRouter);

export default router;
