import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const revision = "a".repeat(40);

function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), "vmerukormi-deploy-test-"));
  const bin = path.join(directory, "bin");
  mkdirSync(bin);
  const log = path.join(directory, "commands");
  const executable = (name, body) => writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\nset -eu\n${body}\n`, { mode: 0o755 });
  executable("git", `printf 'git %s\\n' "$*" >> "$TEST_LOG"
case "$*" in
  'rev-parse --show-toplevel') echo "$TEST_ROOT" ;;
  'branch --show-current') echo "\${TEST_BRANCH:-main}" ;;
  'status --porcelain') printf '%s' "\${TEST_DIRTY:-}" ;;
  'rev-parse --git-path deploy.lock') echo "$TEST_ROOT/deploy.lock" ;;
  'rev-parse HEAD'|'rev-parse origin/main') echo "$TEST_REVISION" ;;
  show*) echo 'echo remote script' ;;
esac`);
  executable("ssh", `printf 'ssh %s\\n' "$*" >> "$TEST_LOG"; cat >/dev/null`);
  executable("flock", `exit 0`);
  executable("docker", `printf 'docker %s\\n' "$*" >> "$TEST_LOG"
if [[ "\${TEST_FAIL_MIGRATION:-}" == 1 && "$*" == *'--exit-code-from migrate'* ]]; then exit 42; fi
if [[ "\${TEST_FAIL_RENEWAL:-}" == 1 && "$*" == *'certbot renew'* ]]; then exit 43; fi
if [[ "\${TEST_FAIL_NGINX:-}" == 1 && "$*" == *'nginx -t'* ]]; then exit 44; fi`);
  const run = (script, extra = {}, args = [directory, revision]) => {
    const result = spawnSync("bash", [path.resolve(`deploy/${script}`), ...args], {
      cwd: process.cwd(), encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_ROOT: directory, TEST_LOG: log, TEST_REVISION: revision, ...extra },
    });
    return { ...result, commands: readFileSync(log, "utf8") };
  };
  return { run, close: () => rmSync(directory, { recursive: true, force: true }) };
}

test("dirty worktree refuses to push or connect", () => {
  const state = fixture();
  try {
    const result = state.run("deploy.sh", { TEST_DIRTY: " M file" });
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.commands, /git push|ssh /);
  } finally { state.close(); }
});

test("deploy pushes and ships precisely the committed revision", () => {
  const state = fixture();
  try {
    const result = state.run("deploy.sh");
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.commands.includes(`git push origin ${revision}:refs/heads/main`));
    assert.ok(result.commands.includes(`git show ${revision}:deploy/remote-deploy.sh`));
    assert.match(result.commands, /StrictHostKeyChecking=yes/);
  } finally { state.close(); }
});

test("failed migration never restarts the application", () => {
  const state = fixture();
  try {
    const result = state.run("remote-deploy.sh", { TEST_FAIL_MIGRATION: "1" });
    assert.notEqual(result.status, 0);
    assert.match(result.commands, /--exit-code-from migrate/);
    assert.doesNotMatch(result.commands, /--wait-timeout|nginx -s reload/);
  } finally { state.close(); }
});

test("remote deployment builds, migrates, waits and reloads without seed or volume removal", () => {
  const state = fixture();
  try {
    const result = state.run("remote-deploy.sh");
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.commands.indexOf("build migrate app") < result.commands.indexOf("--exit-code-from migrate"));
    assert.ok(result.commands.indexOf("--exit-code-from migrate") < result.commands.indexOf("--wait-timeout"));
    assert.ok(result.commands.indexOf("--wait-timeout") < result.commands.indexOf("nginx -s reload"));
    assert.match(result.commands, /compose --env-file \.env.production -f compose.prod.yml/);
    assert.match(result.commands, /http:\/\/app:3000\/login/);
    assert.doesNotMatch(result.commands, /db:seed|reset|down|volume rm|prune/);
  } finally { state.close(); }
});

test("certificate renewal validates and reloads nginx without restarting the app", () => {
  const state = fixture();
  try {
    const result = state.run("renew-certificates.sh", {}, ["--dry-run"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.commands, /compose --env-file \.env.production -f compose.prod.yml/);
    assert.match(result.commands, /run --rm --no-deps certbot renew --cert-name vetenergy --non-interactive --no-random-sleep-on-renew/);
    assert.match(result.commands, /--no-random-sleep-on-renew --dry-run/);
    assert.ok(result.commands.indexOf("certbot renew") < result.commands.indexOf("nginx -t"));
    assert.ok(result.commands.indexOf("nginx -t") < result.commands.indexOf("nginx -s reload"));
    assert.doesNotMatch(result.commands, / up | down|restart|migrate|db:seed|volume rm|prune/);
  } finally { state.close(); }
});

test("failed renewal or invalid nginx configuration prevents a reload", () => {
  for (const failure of ["TEST_FAIL_RENEWAL", "TEST_FAIL_NGINX"]) {
    const state = fixture();
    try {
      const result = state.run("renew-certificates.sh", { [failure]: "1" }, []);
      assert.notEqual(result.status, 0);
      assert.doesNotMatch(result.commands, /nginx -s reload/);
    } finally { state.close(); }
  }
});
