import axios from "axios";
import { config } from "./config";

export type FluxParams = {
  prompt: string;
  negativePrompt?: string;
  size?: string; // e.g., 1024x1824
  guidance?: number;
  steps?: number;
  seed?: number;
  model?: string;
};

function parseSize(size: string): { width: number; height: number } {
  const m = size.match(/^(\d+)x(\d+)$/);
  if (!m) return { width: 1024, height: 1024 };
  return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function generateFluxImage(params: FluxParams): Promise<{ imageUrl: string; safetyScore?: number }> {
  const {
    prompt,
    size = config.app.defaultImageSize,
    seed,
    model = config.flux.model,
  } = params;

  const { width, height } = parseSize(size);
  const startUrl = `${config.flux.baseUrl}/${model}`;

  if (!config.flux.apiKey) {
    throw new Error("Flux: missing FLUX_API_KEY env var");
  }

  try {
    console.log("[BFL] start", { url: startUrl, width, height, hasKey: !!config.flux.apiKey });
    const startResp = await axios.post(
      startUrl,
      { prompt, width, height, seed, prompt_upsampling: false, output_format: "jpeg" },
      { headers: { "x-key": config.flux.apiKey, accept: "application/json", "Content-Type": "application/json" } }
    );

    const pollingUrl: string | undefined = startResp.data?.polling_url;
    if (!pollingUrl) {
      console.error("[BFL] missing polling_url", startResp.data);
      throw new Error("Flux: missing polling_url in response");
    }

    for (let i = 0; i < 60; i++) {
      await sleep(1000);
      const poll = await axios.get(pollingUrl, { headers: { "x-key": config.flux.apiKey, accept: "application/json" } });
      const data = poll.data || {};
      const status = data.status;
      if (status === "Ready") {
        const url = data?.result?.sample;
        if (!url) throw new Error("Flux: missing result.sample in Ready response");
        return { imageUrl: url };
      }
      if (status === "Error" || status === "Failed") {
        console.error("[BFL] job failed", data);
        throw new Error(`Flux: job ${status}`);
      }
    }
    throw new Error("Flux: polling timeout");
  } catch (e: any) {
    if (e?.response) {
      console.error("[BFL] HTTP error", e.response.status, e.response.data);
      throw new Error(`Flux HTTP ${e.response.status}`);
    }
    console.error("[BFL] error", e?.message || e);
    throw e;
  }
} 