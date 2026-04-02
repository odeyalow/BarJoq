import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

async function run(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      shell: true,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });

    child.on("error", reject);
  });
}

async function resetDatabaseFile() {
  const databasePath = path.join(process.cwd(), "prisma", "dev.db");
  const uploadsPath = path.join(process.cwd(), "public", "uploads");
  await mkdir(path.dirname(databasePath), { recursive: true });
  await rm(databasePath, { force: true });
  await rm(uploadsPath, { force: true, recursive: true });
  await writeFile(databasePath, "");
}

async function main() {
  await resetDatabaseFile();
  await run("npx", ["prisma", "db", "push", "--skip-generate"]);
  await run("npm", ["run", "db:seed"]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
