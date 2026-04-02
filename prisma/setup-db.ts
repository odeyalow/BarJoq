import { mkdir, writeFile } from "node:fs/promises";
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

async function ensureDatabaseFile() {
  const databasePath = path.join(process.cwd(), "prisma", "dev.db");
  await mkdir(path.dirname(databasePath), { recursive: true });
  await writeFile(databasePath, "", { flag: "a" });
}

async function main() {
  await ensureDatabaseFile();
  await run("npx", ["prisma", "db", "push"]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
