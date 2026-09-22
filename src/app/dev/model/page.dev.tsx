import { ModelStage } from "./ModelStage";

/**
 * Dev-only model harness: renders a single prop on a neutral turntable
 * so it can be judged (and screenshotted) on its own, away from the
 * scene.
 *
 * The `.dev.tsx` suffix keeps it out of the production build entirely
 * (see next.config.ts) — the route does not exist there, so none of
 * this ships. Middleware also only lets /dev through outside
 * production, so it can never sit in front of the auth wall.
 *
 *   /dev/model?m=pumpkin&a=30
 */
export default function DevModelPage() {
  return <ModelStage />;
}
