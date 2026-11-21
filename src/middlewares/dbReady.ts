import { FastifyReply, FastifyRequest } from "fastify";
import ErrorHandler from "../utils/errorHandler";

let isDbReady = false;

export function setDbReady(state: boolean) {
  isDbReady = state;
}

export function getDbReady() {
  return isDbReady;
}

// Fastify hook: runs before every route inside the /api/v1 scope
const WAIT_MS = 8000;
const STEP_MS = 250;

export async function dbHook(_req: FastifyRequest, _reply: FastifyReply) {
  let waited = 0;
  while (!isDbReady && waited < WAIT_MS) {
    await new Promise((r) => setTimeout(r, STEP_MS));
    waited += STEP_MS;
  }

  if (!isDbReady) {
    throw new ErrorHandler(
      "Network is taking too long. Please try again shortly.",
      503,
    );
  }
}
