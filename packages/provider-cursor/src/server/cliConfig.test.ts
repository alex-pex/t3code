import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { readCursorCliLogin } from "./cliConfig.ts";

it.layer(NodeServices.layer)("readCursorCliLogin", (it) => {
  it.effect.each([
    {
      name: "prefers the active team over the login team",
      config: { authInfo: { email: "a@x.dev", teamId: 1, teamName: "One", activeTeamId: 2 } },
      expected: { email: "a@x.dev", team: { id: 2, name: undefined } },
    },
    {
      name: "falls back to the login team with its name",
      config: { authInfo: { email: "a@x.dev", teamId: 1, teamName: "One", activeTeamId: null } },
      expected: { email: "a@x.dev", team: { id: 1, name: "One" } },
    },
    {
      name: "keeps the name when the active team is the login team",
      config: { authInfo: { email: "a@x.dev", teamId: 1, teamName: "One", activeTeamId: 1 } },
      expected: { email: "a@x.dev", team: { id: 1, name: "One" } },
    },
    {
      name: "skips a non-positive active team",
      config: { authInfo: { email: "a@x.dev", teamId: 1, teamName: "One", activeTeamId: 0 } },
      expected: { email: "a@x.dev", team: { id: 1, name: "One" } },
    },
    {
      name: "ignores a login without an email",
      config: { authInfo: { teamId: 1 } },
      expected: undefined,
    },
    { name: "ignores a login without a team", config: { authInfo: { email: "a@x.dev" } } },
    { name: "ignores malformed config", config: "{" },
    { name: "ignores a missing config", config: undefined },
  ])("$name", ({ config, expected }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const home = yield* fs.makeTempDirectoryScoped({ prefix: "cursor-cli-config-" });
      if (config !== undefined) {
        yield* fs.makeDirectory(path.join(home, ".cursor"));
        yield* fs.writeFileString(
          path.join(home, ".cursor", "cli-config.json"),
          typeof config === "string" ? config : JSON.stringify(config),
        );
      }
      expect(yield* readCursorCliLogin({ HOME: home })).toEqual(expected);
    }).pipe(Effect.scoped),
  );
});
