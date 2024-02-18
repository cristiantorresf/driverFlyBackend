import 'reflect-metadata'
import { resolvers } from '../index'
import { AuthAction } from '../../../actions/authAction'
import { Container } from 'typedi'

describe('partner resolver', () => {
  let authActionInstance: AuthAction
  let registerPartnerSpy: jest.SpyInstance

  beforeEach(() => {
    // Get the real instance of AuthAction
    authActionInstance = Container.get(AuthAction)
    registerPartnerSpy = jest.spyOn(authActionInstance, 'registerPartner')

    registerPartnerSpy.mockResolvedValue({
      username: 'newuser',
      email: 'newuser@email.com'  // Add other necessary fields
    })
  })

  afterEach(() => {
    registerPartnerSpy.mockRestore()
  })

  it('should call registerPartner with correct arguments', async () => {
    const input = {
      username: 'newuser',
      email: 'newuser@email.com'  // Add other necessary fields
    }
    // Call the resolver
    const result = await (resolvers as any).Mutation.registerPartner(null, { input })
    // Expect the authAction registerPartner method to have been called with correct arguments
    expect(registerPartnerSpy).toHaveBeenCalledWith(input)
    // Expect the resolver to return the correct partner data
    expect(result).toEqual(input)
  })
})
