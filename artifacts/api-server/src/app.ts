import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttpDefault from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const pinoHttp = pinoHttpDefault.default || pinoHttpDefault;
const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: Request) {
        return {
          id: (req as any).id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: Response) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/api", router);

export default app;
