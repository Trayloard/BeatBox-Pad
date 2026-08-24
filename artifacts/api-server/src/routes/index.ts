import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adlibRouter from "./adlib";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adlibRouter);

export default router;
