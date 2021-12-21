#!/usr/bin/env node
import { readdir, unlink } from 'fs/promises'
import { spawn } from 'child_process'

const files = (await readdir('.')).sort()

await Promise.all(files
  .map(file => /.*\.db$/g.exec(file))
  .filter(Boolean)
  .map(([file]) => unlink(file))
)

for (const [file, entry] of files.map(entry => /^(\d{2}_.*)\.mjs$/g.exec(entry)).filter(Boolean)) {
  console.log(`-- ${entry} --`)
  const p = spawn(process.argv[0], [file], )
  await new Promise((resolve, reject) => {
    p.on('error', reject)
    p.stdout.on('data', data => {
      process.stdout.write(data.toString().replace(/^/gm, '  '))
    })
    p.on('close', resolve)
  })
  process.stdout.write('\n')
}
