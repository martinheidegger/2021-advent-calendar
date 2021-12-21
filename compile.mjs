#!/usr/bin/env node
import { readdir, readFile, writeFile, unlink } from 'fs/promises'

let files = (await readdir('.')).sort()

await Promise.all(files
  .map(file => /.*\.compiled.md$/g.exec(file))
  .filter(Boolean)
  .map(([file]) => unlink(file))
)

files = (await readdir('.')).sort()

for (const [file, entry] of files.map(entry => /^(article_.*)\.md$/g.exec(entry)).filter(Boolean)) {
  const content = await readFile(file, 'utf-8')
  const regex = /%%(.+)%%/g
  let data
  let previous = 0
  let result = ''
  while ((data = regex.exec(content))) {
    result += content.substring(previous, data.index)
    previous = data.index + data[0].length
    result += `\`\`\`js:${data[1]}\n${await readFile(data[1], 'utf-8')}\`\`\``
  }
  result += content.substr(previous)
  result = result.replace(/^.*\n.*\n.*\n.*\n/m, '')
  await writeFile(`${entry}.compiled.md`, result)
}
