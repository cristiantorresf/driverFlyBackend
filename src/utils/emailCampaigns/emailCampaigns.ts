import { stringifyHtmlFile } from '../formats'
import path from 'path'

export async function welcomeHTMLMessage() {
  const htmlFilePath = path.join(__dirname, 'welcome-email.html')
  return await stringifyHtmlFile(htmlFilePath)
}
