import "dotenv/config";
import { createServer } from "node:http";
import { askFarmerQuestion } from "./farmer-assistant.js";

const port = Number(process.env.PORT || 3000);

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (req.method === "POST" && req.url === "/api/ask") {
    try {
      let rawBody = "";
      for await (const chunk of req) {
        rawBody += chunk;
        if (rawBody.length > 20_000) throw new Error("Request is too large");
      }
      const body = JSON.parse(rawBody) as { question?: unknown };
      const question = typeof body.question === "string" ? body.question.trim() : "";
      if (!question || question.length > 1000) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Enter a question up to 1,000 characters." }));
        return;
      }
      const answer = await askFarmerQuestion(question);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ answer }));
    } catch (error) {
      console.error("Question error:", error);
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Could not answer that question. Check the database and API configuration." }));
    }
    return;
  }
  res.writeHead(404).end("Not found");
});

server.listen(port, () => console.log(`Sanjivani Farmer Insights running at http://localhost:${port}`));
