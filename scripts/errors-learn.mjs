#!/usr/bin/env node
/**
 * errors-learn.mjs — KultuRH Error Memory System
 * Acumulativo: lee memoria histórica, ejecuta checks, registra errores nuevos/recurrentes.
 */
import { spawn } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MEMORY_PATH = resolve(ROOT, 'reports/errors/error-memory.json')
const HISTORY_PATH = resolve(ROOT, 'reports/errors/error-history.md')

const EMPTY_MEMORY = {
  version: '1.0.0',
  created_at: new Date().toISOString(),
  last_updated: new Date().toISOString(),
  total_errors_seen: 0,
  errors: [],
}

function loadMemory() {
  if (!existsSync(MEMORY_PATH)) return { ...EMPTY_MEMORY }
  try {
    return JSON.parse(readFileSync(MEMORY_PATH, 'utf8'))
  } catch {
    return { ...EMPTY_MEMORY }
  }
}

function runCheck(cmd, args, timeoutMs = 120000) {
  return new Promise(resolve => {
    let output = ''
    const proc = spawn(cmd, args, { shell: true, cwd: ROOT })
    proc.stdout.on('data', d => { output += d.toString() })
    proc.stderr.on('data', d => { output += d.toString() })
    const timer = setTimeout(() => { proc.kill(); resolve({ code: -1, output: output + '\n[TIMEOUT]' }) }, timeoutMs)
    proc.on('close', code => { clearTimeout(timer); resolve({ code, output }) })
  })
}

// Strip ANSI color codes
function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[mGKHF]/g, '')
}

function parseTscErrors(output) {
  const clean = stripAnsi(output)
  const errors = []
  const re = /error (TS\d+): (.+)/g
  let m
  while ((m = re.exec(clean)) !== null) {
    const code = m[1]
    const msg = m[2].trim().substring(0, 100)
    errors.push({ signature: `${code}: ${msg}`, raw: m[0] })
  }
  return errors
}

function parseLintErrors(output) {
  const clean = stripAnsi(output)
  const errors = []
  // ESLint format: "  rule-name  message"
  const re = /error\s+(.+?)\s+(\S+\/\S+|@\S+)/g
  let m
  while ((m = re.exec(clean)) !== null) {
    errors.push({ signature: `ESLint: ${m[2]} — ${m[1].trim().substring(0, 60)}`, raw: m[0] })
  }
  return errors
}

function parseTestErrors(output) {
  const clean = stripAnsi(output)
  const errors = []
  const re = /FAIL\s+(.+\.test\.[tj]sx?)/g
  let m
  while ((m = re.exec(clean)) !== null) {
    errors.push({ signature: `Test FAIL: ${m[1]}`, raw: m[0] })
  }
  // Also catch "× test name" failures
  const re2 = /[✗×]\s+(.+)/g
  while ((m = re2.exec(clean)) !== null) {
    const name = m[1].trim().substring(0, 80)
    if (name.length > 5) {
      errors.push({ signature: `Test failed: ${name}`, raw: m[0] })
    }
  }
  return errors
}

function mergeErrors(memory, newErrors, module) {
  const now = new Date().toISOString()
  let newCount = 0
  let recurringCount = 0

  for (const err of newErrors) {
    const existing = memory.errors.find(e => e.signature === err.signature)
    if (existing) {
      existing.count++
      existing.last_seen = now
      existing.status = 'active'
      recurringCount++
    } else {
      memory.errors.push({
        signature: err.signature,
        module,
        first_seen: now,
        last_seen: now,
        count: 1,
        probable_root_cause: 'Under investigation',
        suggested_fix: 'Check the error output and fix accordingly',
        prevention_rule: 'To be determined after root cause analysis',
        status: 'active',
      })
      newCount++
      memory.total_errors_seen++
    }
  }

  return { newCount, recurringCount }
}

function generateMarkdown(memory) {
  const active = memory.errors.filter(e => e.status === 'active')
  const resolved = memory.errors.filter(e => e.status === 'resolved')
  const rows = [...active, ...resolved]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  const table = rows.map(e =>
    `| ${e.signature.substring(0, 50)} | ${e.module} | ${e.count} | ${e.status} | ${e.last_seen.substring(0, 10)} |`
  ).join('\n')

  const rules = memory.errors
    .filter(e => e.prevention_rule && e.prevention_rule !== 'To be determined after root cause analysis')
    .map(e => `- **${e.signature.substring(0, 60)}**: ${e.prevention_rule}`)
    .join('\n')

  return `# Error History — KultuRH Project
> Memoria acumulativa de errores. Actualizado: ${new Date().toISOString()}

## Resumen
- Total errores únicos: ${memory.errors.length}
- Activos: ${active.length}
- Resueltos: ${resolved.length}
- Total ocurrencias registradas: ${memory.total_errors_seen}

## Top 20 Errores (por frecuencia)

| Signature | Módulo | Count | Estado | Último visto |
|---|---|---|---|---|
${table}

## Reglas de Prevención

${rules || '_Sin reglas de prevención aún._'}

---
_Generado por \`npm run errors:learn\`_
`
}

async function main() {
  console.log('\n🧠 KultuRH Error Memory System\n')

  const memory = loadMemory()
  const activeErrors = memory.errors.filter(e => e.status === 'active')

  // Show prevention tips for known recurring errors
  if (activeErrors.length > 0) {
    console.log('⚠️  PREVENTION TIPS (errores conocidos en memoria):')
    for (const err of activeErrors.filter(e => e.count > 1)) {
      console.log(`\n  🔁 [x${err.count}] ${err.signature}`)
      console.log(`     Rule: ${err.prevention_rule}`)
      console.log(`     Fix:  ${err.suggested_fix}`)
    }
    console.log('')
  }

  console.log('🔍 Ejecutando checks...\n')

  // Run checks
  const [tscResult, lintResult, testResult] = await Promise.all([
    runCheck('npx', ['tsc', '--noEmit']),
    runCheck('npx', ['next', 'lint', '--quiet']),
    runCheck('npx', ['vitest', 'run', '--reporter=verbose']),
  ])

  // Parse errors
  const tscErrors = parseTscErrors(tscResult.output)
  const lintErrors = parseLintErrors(lintResult.output)
  const testErrors = parseTestErrors(testResult.output)

  // Merge into memory
  const tscMerge = mergeErrors(memory, tscErrors, 'TypeScript')
  const lintMerge = mergeErrors(memory, lintErrors, 'ESLint')
  const testMerge = mergeErrors(memory, testErrors, 'Vitest')

  const totalNew = tscMerge.newCount + lintMerge.newCount + testMerge.newCount
  const totalRecurring = tscMerge.recurringCount + lintMerge.recurringCount + testMerge.recurringCount

  // Save
  memory.last_updated = new Date().toISOString()
  writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2))
  writeFileSync(HISTORY_PATH, generateMarkdown(memory))

  // Summary
  const allNew = [...tscErrors, ...lintErrors, ...testErrors]
  if (allNew.length > 0) {
    console.log('🔴 Errores detectados:')
    for (const e of allNew.slice(0, 10)) {
      console.log(`  • ${e.signature}`)
    }
    if (allNew.length > 10) console.log(`  ... y ${allNew.length - 10} más`)
    console.log('')
  }

  console.log('─'.repeat(50))
  console.log(`✅ Checks ejecutados: tsc (${tscResult.code === 0 ? 'OK' : 'FAIL'}), lint (${lintResult.code === 0 ? 'OK' : 'FAIL'}), tests (${testResult.code === 0 ? 'OK' : 'FAIL'})`)
  console.log(`🔴 Errores nuevos: ${totalNew}`)
  console.log(`🔁 Errores recurrentes: ${totalRecurring}`)
  console.log(`📊 Total en memoria: ${memory.errors.length} errores únicos`)
  console.log(`📄 Ver: reports/errors/error-history.md`)

  process.exit(totalNew + totalRecurring > 0 ? 1 : 0)
}

main().catch(err => { console.error('Script error:', err); process.exit(1) })
