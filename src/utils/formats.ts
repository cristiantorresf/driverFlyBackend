import fs from 'fs'
import path from 'path'

export function stringifyHtmlFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const absolutePath = path.resolve(filePath)
    fs.readFile(absolutePath, 'utf8', (err, htmlString) => {
      if (err) {
        const errorMessage = `Error reading the HTML file: ${err}`
        console.error(errorMessage)
        reject(errorMessage)
        return
      }
      resolve(htmlString)
    })
  })
}
