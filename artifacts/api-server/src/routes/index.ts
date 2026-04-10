import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import speakersRouter from "./speakers";
import sessionsRouter from "./sessions";
import attendeesRouter from "./attendees";
import analyticsRouter from "./analytics";
import valuePropsRouter from "./valueProps";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(speakersRouter);
router.use(sessionsRouter);
router.use(attendeesRouter);
router.use(analyticsRouter);
router.use(valuePropsRouter);

export default router;
