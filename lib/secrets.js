import fs from "fs";
import path from "path";

// Docker Secrets are mounted as a file at /run/secrets/<name> — that
// file does NOT show up in `docker inspect`, `ps aux`, or `/proc/*/environ`,
// unlike env_file/environment variables. This is a reduction
// of the attack surface, not a guarantee: anyone with root on the host can
// still read any file the container itself can also read.
//
// SECRETS_DIR is configurable so this can also be tested locally (outside
// Docker); in production you just leave it at the Docker default.
const SECRETS_DIR = process.env.SECRETS_DIR || "/run/secrets";

export function getSecret(secretName, envVarFallback) {
  const secretPath = path.join(SECRETS_DIR, secretName);
  try {
    return fs.readFileSync(secretPath, "utf-8").trim();
  } catch {
    // No secrets file found (e.g. developing locally without Docker)
    // — fall back to an environment variable, if one was provided.
    if (envVarFallback && process.env[envVarFallback]) {
      return process.env[envVarFallback].trim();
    }
    return null;
  }
}
