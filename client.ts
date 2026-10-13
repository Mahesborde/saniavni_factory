import "dotenv/config";
import { createServer } from "node:http";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const port = Number(process.env.PORT || 3000);

async function answerQuestion(question: string) {
  const client = new Client({ name: "sanjivani-farmer-client", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["node_modules/tsx/dist/cli.mjs", "server.ts"]
  });
  try {
    await client.connect(transport);
    const result = await client.callTool({ name: "get_farmer_report", arguments: {} });
    const farmerData = result.content.map(item => item.type === "text" ? item.text : "").join("\n");
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: "You are a sugarcane factory data assistant. Answer the user's question using only the supplied PostgreSQL farmer data. If the data does not contain the answer, say so. Calculate totals carefully and report money in Indian rupees (INR). Keep the answer clear and concise.",
      input: `User question: ${question}\n\nPostgreSQL farmer data retrieved through MCP:\n${farmerData}`
    });
    return response.output_text;
  } finally {
    await client.close();
  }
}

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
      const answer = await answerQuestion(question);
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
