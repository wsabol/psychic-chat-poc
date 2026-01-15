import dotenv from "dotenv";
dotenv.config();

import { workerLoop } from "./processor.js";

workerLoop();
