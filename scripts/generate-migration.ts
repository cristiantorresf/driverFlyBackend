// generate-migration.ts
import { exec } from 'child_process'

const migrationName = process.argv[2] // Get the migration name from the command line argument

console.log(JSON.stringify(process.argv))
if (!migrationName) {
  console.error('Please provide a migration name')
  process.exit(1)
}

const command = `NODE_ENV=development npx typeorm-ts-node-commonjs migration:generate ./src/db/migrations/${migrationName} -d ./src/db/db.ts`
console.log('Executing this command 🔥 >>> ', command)
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`)
    return
  }
  console.log(`stdout: ${stdout}`)
  console.error(`stderr: ${stderr}`)
})
