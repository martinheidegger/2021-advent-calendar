#!/usr/bin/env node
import { readdir, readFile, writeFile, unlink } from 'fs/promises'

let files = (await readdir('.')).sort()

await Promise.all(files
  .map(file => /.*\.compiled.md$/g.exec(file))
  .filter(Boolean)
  .map(([file]) => unlink(file))
)

files = (await readdir('.')).sort()

function filterComments (selectLang, content) {
  return content.replace(/^( *\/\/ )(.{2}) ([^\n]*\n)/mg, (_, prefix, lang, content) => lang === selectLang ? `${prefix}${content}` : '')
}

function scriptType (ending) {
  switch (ending) {
    case 'mjs':
    case 'js':
      return 'js'
    case 'ts':
      return 'ts'
  }
  return ''
}

for (const [file, entry, lang] of files.map(entry => /^(article_(.*))\.md$/g.exec(entry)).filter(Boolean)) {
  const content = await readFile(file, 'utf-8')
  const regex = /%%(([^%]+)\.([^.%]+))%%/g
  let data
  let previous = 0
  let result = ''
  while ((data = regex.exec(content))) {
    result += content.substring(previous, data.index)
    const [match, insertFile, _, ending] = data
    previous = data.index + match.length
    result += `\`\`\`${scriptType(ending)}:${insertFile}\n${filterComments(lang, await readFile(insertFile, 'utf-8'))}\`\`\``
  }
  result += content.substr(previous)
  result = result.replace(/^.*\n.*\n.*\n.*\n/m, '')
  await writeFile(`${entry}.compiled.md`, result)
}
