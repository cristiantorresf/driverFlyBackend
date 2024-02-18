/*
/!* eslint-disable *!/
/!* tslint:disable *!/
// @ts-ignore

import Bottle from 'bottlejs'
import * as ld from '@launchdarkly/node-server-sdk'

class LaunchDarklyClientWrapper {
  initPromise: null
  client: null | Promise<any>

  constructor() {
    this.client = null // Placeholder for the actual LaunchDarkly client
    this.initPromise = null // Promise for the initialization
  }

  // Method to initialize the LaunchDarkly client asynchronously
  async initialize(sdkKey: string) {
    if (!this.initPromise) {
      this.initPromise = new Promise((resolve, reject) => {
        // Assume `ldClient` is the LaunchDarkly SDK's client creation method
        const client = ld.initialize(sdkKey, userConfig)
        client.on('ready', () => {
          this.client = client
          resolve(client)
        })
        client.on('failed', reject)
      })
    }
    return this.initPromise
  }

  // Example synchronous method that uses the client
  // Ensure it checks or waits for initialization
  async featureFlag(flagName) {
    await this.ensureInitialized()
    return this.client.variation(flagName, false)
  }

  // Helper method to ensure the client is initialized before any operation
  async ensureInitialized() {
    if (!this.client) {
      await this.initPromise
    }
  }
}


const bottle = new Bottle()

// Register the LaunchDarkly wrapper as an instance factory
bottle.instanceFactory('launchDarklyClient', (container) => {
  const wrapper = new LaunchDarklyClientWrapper()
  // Initialize with your SDK key
  wrapper.initialize('your-sdk-key')
  return wrapper
})

// Usage elsewhere in your application
const ldClientWrapper = bottle.container.launchDarklyClient.instance()
ldClientWrapper.featureFlag('some-feature-flag').then((flagValue) => {
  console.log('Feature flag value:', flagValue)
})
*/
