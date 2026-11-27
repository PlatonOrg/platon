import { glob } from 'glob'
import { mkdirSync, readFileSync, writeFile } from 'fs'
import { resolve as _resolve } from 'path'

const getLcovFiles = function (src) {
  return new Promise((resolve, reject) => {
    glob(`${src}/**/lcov.info`, (error, result) => {
      if (error) return reject(error)
      resolve(result)
    })
  })
}

;(async function () {
  mkdirSync('coverage', { recursive: true })
  const files = await getLcovFiles('coverage')
  const mergedReport = files.reduce((mergedReport, currFile) => (mergedReport += readFileSync(currFile)), '')
  writeFile(_resolve('./coverage/lcov.info'), mergedReport, (err) => {
    if (err) throw err
    console.log('The file has been saved!')
  })
})()
