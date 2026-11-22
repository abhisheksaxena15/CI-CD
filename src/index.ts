import express from "express";
import type { Application, Request, Response } from "express";
import "dotenv/config";
import cors from "cors";
const app: Application = express();
const PORT = process.env.PORT || 7000;

// * Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req: Request, res: Response) => {
  return res.send("It's working 🙌");
});

const quotes = [
  "Small steps still move you forward.",
  "Curiosity turns obstacles into questions.",
  "A clear purpose makes steady progress possible.",
  "Make room for what you can learn today.",
  "Good work grows from patient effort.",
];

app.get("/quote", (req: Request, res: Response) => {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  return res.json({ quote });
});

app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));

