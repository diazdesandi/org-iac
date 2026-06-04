# org-config

GitHub organization-as-code. The org's repositories, teams, branch rulesets, and
labels are declared in YAML under [`config/`](config/) and provisioned with
[Pulumi](https://www.pulumi.com/) + the [`@pulumi/github`](https://www.pulumi.com/registry/packages/github/)
provider. Runs on [Bun](https://bun.sh/).

## How it works

```
config/*.yaml ──parse/validate──▶ resolve defaults ──▶ Pulumi resources
   (valibot)         (src/setup)        (src/setup)       (src/resources)
```

1. **Load & validate** — [`src/setup/loader.ts`](src/setup/loader.ts) parses each YAML
   file against a [valibot](https://valibot.dev/) schema in [`src/types/`](src/types/),
   then runs cross-reference checks ([`src/setup/validate.ts`](src/setup/validate.ts)):
   unknown team/repo references, branch patterns claimed by multiple rulesets, and
   labels defined in multiple groups.
2. **Resolve** — [`src/setup/resolve.ts`](src/setup/resolve.ts) fills each repo in from
   org-wide `defaults` and translates config into Pulumi inputs.
3. **Provision** — [`src/org.ts`](src/org.ts) creates teams, org rulesets, and one
   `OrgRepository` component ([`src/resources/repo.ts`](src/resources/repo.ts)) per repo,
   which owns that repo's team access, branch protection, environments, and labels.

Schemas use `strictObject`, so an unknown or misspelled YAML key fails the run instead
of being silently ignored.

> **Branch enforcement:** org **rulesets** ([`config/rulesets.yaml`](config/rulesets.yaml))
> are the source of truth. Per-repo `branchProtection` blocks are applied *only* when set
> explicitly on a repo. Org rulesets are gated by the `enableRulesets` stack config — keep
> it `true` for enforcement to apply.

## Config files

| File | Schema | Purpose |
| --- | --- | --- |
| [`config/org.yaml`](config/org.yaml) | `OrgConfigSchema` | Org-wide defaults (visibility, merge strategy, squash commit shaping, feature toggles). |
| [`config/repos.yaml`](config/repos.yaml) | `ReposFileSchema` | Repositories and their per-repo overrides + branch protection. |
| [`config/rulesets.yaml`](config/rulesets.yaml) | `RulesetsFileSchema` | Org-level branch/tag/push rulesets. |
| [`config/teams.yaml`](config/teams.yaml) | `TeamsConfigSchema` | Teams, members, and per-repo access. |
| [`config/labels.yaml`](config/labels.yaml) | `LabelGroupsSchema` | Issue/PR labels, grouped; applied to every repo. |

### Editor autocomplete

Each YAML file carries a `# yaml-language-server: $schema=...` header pointing at a
generated JSON Schema in [`config/schema/`](config/schema/). With the
[YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)
(recommended in [`.vscode/extensions.json`](.vscode/extensions.json)) you get
autocomplete and inline validation as you type. Regenerate the schemas after changing a
valibot schema:

```sh
bun run schema
```

## Common tasks

**Add a repository** — append an entry to `config/repos.yaml` (only `name` and
`description` are required; everything else inherits from `org.yaml` defaults). Grant
team access in `config/teams.yaml` under `repoAccess`.

**Add a team** — add it under `teams:` in `config/teams.yaml`, then reference its `slug`
in `repoAccess`.

**Add a ruleset** — append to `config/rulesets.yaml`. A branch pattern may be owned by
only one ruleset (validation enforces this).

**Add a label** — add it under any group in `config/labels.yaml`. Label names must be
unique across groups.

## Scripts

```sh
bun run typecheck   # tsc --noEmit
bun run check       # biome lint + format check
bun run format      # biome check --write
bun test            # unit tests for resolve/validate/schema logic
bun run schema      # regenerate config/schema/*.json
bun run preview     # pulumi preview
bun run up          # pulumi up
```

## Stack config

Per-stack settings live in `Pulumi.<stack>.yaml`:

- `github:owner` / `github:token` — provider credentials (token stored as a secret).
- `org-config:enableTeams` (default `true`) — create teams and memberships.
- `org-config:enableRulesets` (default `true`) — create org-level rulesets.
