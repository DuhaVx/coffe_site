const { execSync } = require("child_process");

const port = Number(process.argv[2]) || 3000;

if (process.platform !== "win32") {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: "ignore" });
  } catch {
    /* порт свободен */
  }
  process.exit(0);
}

try {
  const lines = execSync("netstat -ano", { encoding: "utf8" }).split("\n");
  const pids = new Set();
  for (const line of lines) {
    if (!line.includes(`:${port}`) || !line.includes("LISTENING")) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && pid !== "0") pids.add(pid);
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      console.log(`Освобождён порт ${port} (остановлен процесс ${pid})`);
    } catch {
      /* ignore */
    }
  }
} catch {
  /* ignore */
}
