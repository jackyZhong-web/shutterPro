"use strict"

const fs = require("node:fs")
const fsp = require("node:fs/promises")
const path = require("node:path")
const { spawn } = require("node:child_process")

const configPath = process.env.BACKUP_CONFIG_PATH || path.join(__dirname, "linux_pm2_config.json")

function log(message) {
  const time = new Date().toISOString().replace("T", " ").slice(0, 19)
  console.log(`[${time}] ${message}`)
}

function pad(value) {
  return String(value).padStart(2, "0")
}

function timestamp(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true })
}

async function removeDirSafe(dir) {
  await fsp.rm(dir, { recursive: true, force: true })
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: options.stdio || ["ignore", "pipe", "pipe"]
    })

    let stdout = ""
    let stderr = ""

    if (child.stdout) child.stdout.on("data", chunk => { stdout += String(chunk) })
    if (child.stderr) child.stderr.on("data", chunk => { stderr += String(chunk) })

    child.on("error", reject)
    child.on("close", code => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(`${command} exited with code ${code}\n${stderr || stdout}`.trim()))
      }
    })
  })
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`)
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"))
}

function nextRunAt(schedule, now = new Date()) {
  const target = new Date(now)
  target.setSeconds(0, 0)
  target.setHours(schedule.hour, schedule.minute, 0, 0)
  const currentWeekday = now.getDay()
  let delta = (schedule.weekday - currentWeekday + 7) % 7
  if (delta === 0 && target <= now) delta = 7
  target.setDate(now.getDate() + delta)
  return target
}

async function createBackup(config) {
  const ts = timestamp()
  const workDir = path.join(config.tempRoot, `${config.backupName}_${ts}`)
  const sqlFile = path.join(workDir, `${config.backupName}.sql`)
  const uploadsArchive = path.join(workDir, "uploads.tar.gz")
  const finalArchive = path.join(config.outputRoot, `${config.backupName}_backup_${ts}.tar.gz`)

  await ensureDir(config.outputRoot)
  await ensureDir(config.tempRoot)
  await ensureDir(workDir)

  try {
    log(`Backing up database ${config.mysql.database}`)
    const dumpArgs = [
      `--host=${config.mysql.host}`,
      `--port=${config.mysql.port}`,
      `--user=${config.mysql.user}`,
      "--single-transaction",
      "--routines",
      "--triggers",
      "--events",
      "--default-character-set=utf8mb4",
      config.mysql.database
    ]
    const dump = spawn(config.mysqldumpPath, dumpArgs, {
      env: { ...process.env, MYSQL_PWD: String(config.mysql.password || "") },
      stdio: ["ignore", "pipe", "pipe"]
    })
    const sqlStream = fs.createWriteStream(sqlFile)
    let dumpStderr = ""
    dump.stdout.pipe(sqlStream)
    dump.stderr.on("data", chunk => { dumpStderr += String(chunk) })

    await new Promise((resolve, reject) => {
      dump.on("error", reject)
      sqlStream.on("error", reject)
      dump.on("close", code => {
        sqlStream.end(() => {
          if (code === 0) resolve()
          else reject(new Error(`mysqldump exited with code ${code}\n${dumpStderr}`.trim()))
        })
      })
    })

    log("Packing uploads directory")
    const uploadsSource = config.uploads.sourcePath
    const uploadsParent = path.dirname(uploadsSource)
    const uploadsName = path.basename(uploadsSource)
    await runCommand(config.tarPath, ["-czf", uploadsArchive, "-C", uploadsParent, uploadsName])

    log("Packing final backup archive")
    await runCommand(config.tarPath, ["-czf", finalArchive, "-C", workDir, "."])

    log(`Backup completed: ${finalArchive}`)
  } finally {
    await removeDirSafe(workDir)
  }
}

async function main() {
  const config = loadConfig()
  if (!config.backupName) throw new Error("backupName is required")
  if (!config.outputRoot) throw new Error("outputRoot is required")
  if (!config.tempRoot) throw new Error("tempRoot is required")
  if (!config.mysqldumpPath) throw new Error("mysqldumpPath is required")
  if (!config.tarPath) throw new Error("tarPath is required")
  if (!config.mysql || !config.mysql.database || !config.mysql.user) throw new Error("mysql config is incomplete")
  if (!config.uploads || !config.uploads.sourcePath) throw new Error("uploads.sourcePath is required")

  const schedule = {
    weekday: Number(config.schedule?.weekday ?? 1),
    hour: Number(config.schedule?.hour ?? 3),
    minute: Number(config.schedule?.minute ?? 0),
    runOnStart: !!config.schedule?.runOnStart
  }

  const scheduleNext = async () => {
    const next = nextRunAt(schedule)
    const delay = Math.max(next.getTime() - Date.now(), 1000)
    log(`Next backup scheduled at ${next.toISOString().replace("T", " ").slice(0, 16)}`)
    setTimeout(async () => {
      try {
        await createBackup(config)
      } catch (error) {
        console.error(error)
      }
      await scheduleNext()
    }, delay)
  }

  if (schedule.runOnStart) {
    try {
      await createBackup(config)
    } catch (error) {
      console.error(error)
    }
  }

  await scheduleNext()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
