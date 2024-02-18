// A Jest setup file that runs before each test suite.
import { Container } from 'typedi'
import { createPartnerModelMock } from './testUtils'

// This will run before each test file (suite) is executed.
Container.set({ id: 'PartnerModel', value: createPartnerModelMock() })

// You can also reset the container after all tests in a suite are done
afterAll(() => {
  Container.reset()
})
