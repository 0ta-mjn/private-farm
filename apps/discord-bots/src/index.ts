import express from "express";
import { handler as dailyReview } from "./daily-review";
import bodyParser from "body-parser";

const app = express();
app.use(express.json());
app.use(bodyParser.json());

const endpoints = {
  "daily-review": dailyReview,
};

Object.entries(endpoints).forEach(([path, handler]) => {
  app.post(`/${path}`, handler);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.info(`Server is running at ${url}`);
  console.info(
    `Available endpoints:\n${Object.keys(endpoints)
      .map((key) => `- POST ${url}/${key}`)
      .join("\n")}`
  );
});
