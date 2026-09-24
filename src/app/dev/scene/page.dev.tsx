import { SceneStage } from "./SceneStage";

/**
 * Dev-only scene harness: renders a theme's whole world — scene, board
 * and board decor — from the room camera, with no sign-in and no data,
 * so a scene can be judged (and screenshotted) as it will actually be
 * seen rather than prop by prop.
 *
 * Dev-only by construction, like /dev/model: the `.dev.tsx` suffix
 * keeps it out of the production build and middleware only lets /dev
 * through outside production.
 *
 *   /dev/scene?t=stars-hollow
 *   /dev/scene?t=stars-hollow&c=6,2,-1&l=6,1.5,-8   (camera, look-at)
 *   /dev/scene?t=stars-hollow&p=night   (day/night phase, BB-21)
 */
export default function DevScenePage() {
  return <SceneStage />;
}
