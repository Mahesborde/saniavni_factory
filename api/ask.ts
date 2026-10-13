import type { IncomingMessage, ServerResponse } from "node:http";
import { askFarmerQuestion } from "../farmer-assistant.js";

type ApiRequest = IncomingMessage & { body?: unknown };

async function readBody(req: ApiRequest): Promise<unknown> {
  if (req.body !== undefined) return req.body;

  let raw = "";
  for await (const chunk of req) {
    raw += chunk.toString();
    if (raw.length > 20_000) throw new Error("Request body is too large.");
  }
  return JSON.parse(raw);
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Use POST to ask a question." }));
    return;
  }

  try {
    const body = await readBody(req) as { question?: unknown } | null;
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!question || question.length > 1000) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Enter a question up to 1,000 characters." }));
      return;
    }

    const answer = await askFarmerQuestion(question);
    res.statusCode = 200;
    res.end(JSON.stringify({ answer }));
  } catch (error) {
    console.error("Farmer assistant API error:", error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Could not load farmer data or generate an answer. Check the Vercel function logs and environment variables." }));
  }
}
