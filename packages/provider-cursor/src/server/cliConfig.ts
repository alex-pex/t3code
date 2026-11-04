import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import * as HostProcess from "@t3tools/shared/HostProcess";
import type { CursorTeam } from "./auth.ts";

const TeamId = Schema.optionalKey(Schema.NullOr(Schema.Int));
const CliConfig = Schema.fromJsonString(
  Schema.Struct({
    authInfo: Schema.optionalKey(
      Schema.Struct({
        email: Schema.optionalKey(Schema.String),
        teamId: TeamId,
        teamName: Schema.optionalKey(Schema.String),
        activeTeamId: TeamId,
      }),
    ),
  }),
);
const decodeCliConfig = Schema.decodeUnknownEffect(CliConfig);

export interface CursorCliLogin {
  readonly email: string;
  readonly team: CursorTeam;
}

const positive = (id: number | null | undefined) => (id && id > 0 ? id : undefined);

/** The team `agent team switch` selects, with the CLI's activeTeamId-then-teamId fallback. */
export const readCursorCliLogin = Effect.fn("readCursorCliLogin")(function* (
  environment: NodeJS.ProcessEnv,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const home =
    environment.HOME?.trim() ||
    environment.USERPROFILE?.trim() ||
    (yield* HostProcess.HomeDirectory);
  const authInfo = yield* fs.readFileString(path.join(home, ".cursor", "cli-config.json")).pipe(
    Effect.flatMap(decodeCliConfig),
    Effect.map((config) => config.authInfo),
    Effect.orElseSucceed(() => undefined),
  );
  const email = authInfo?.email?.trim();
  const id = positive(authInfo?.activeTeamId) ?? positive(authInfo?.teamId);
  if (!email || id === undefined) return undefined;
  return {
    email,
    team: { id, name: id === authInfo?.teamId ? authInfo.teamName : undefined },
  } satisfies CursorCliLogin;
});
