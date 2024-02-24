import * as fs from 'fs'
import * as path from 'path'

const sourcePath = path.resolve(__dirname, '../src/gql/types/schema.graphql')
const destPath = path.resolve(__dirname, '../dist/src/gql/types/schema.graphql') // Adjust this path according to where you want to place the graphql file in the build directory

fs.copyFile(sourcePath, destPath, (err) => {
  if (err) {
    console.error('Error occurred while copying schema.graphql.', err)
  } else {
    console.log('🚀🚀🚀🚀 Successfully copied schema.graphql to build directory.')
  }
})
