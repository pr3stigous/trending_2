export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    baseUrl: process.env.OPENAI_API_BASE || "https://api.openai.com/v1",
  },
  flux: {
    apiKey: process.env.FLUX_API_KEY || "",
    model: process.env.FLUX_MODEL || "flux-pro-1.1",
    baseUrl: process.env.FLUX_API_BASE || "https://api.bfl.ai/v1",
  },
  app: {
    maxConcurrentImageJobs: Number(process.env.MAX_CONCURRENT_IMAGE_JOBS || 2),
    defaultAspectRatio: process.env.DEFAULT_ASPECT_RATIO || "9:16",
    defaultImageSize: process.env.DEFAULT_IMAGE_SIZE || "1024x1824",
  },
};

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
} 