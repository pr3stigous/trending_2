import axios from "axios";
import { config } from "./config";

export async function openaiJson<T>(system: string, user: string, schemaName: string, schema: object): Promise<T> {
  const resp = await axios.post(
    `${config.openai.baseUrl}/chat/completions`,
    {
      model: config.openai.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name: schemaName, schema } },
      temperature: 0.7,
    },
    { headers: { Authorization: `Bearer ${config.openai.apiKey}` } }
  );
  const content = resp.data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");
  return JSON.parse(content);
} 