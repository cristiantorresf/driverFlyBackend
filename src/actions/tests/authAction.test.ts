import 'reflect-metadata'
import { Container } from 'typedi'
import { AuthAction } from '../authAction'
import { PartnerRepository } from '../../repositories/PartnerRepository'
import { HashService } from '../../services/HashService'
import { TokenService } from '../../services/TokenService'

const partnerData = {
  email: 'valid@example.com',
  password: 'hashedpassword',
  username: 'validUser',
  name: 'Valid User'
}

describe('Auth Action', () => {
  let authActionInstance: AuthAction
  // @ts-ignore
  let partnerRepository: PartnerRepository
  let hashService: HashService
  let tokenService: TokenService


  beforeAll(() => {
    // Now when we get instances from the container, they will use the mocked PartnerModel
    authActionInstance = Container.get(AuthAction)
    partnerRepository = Container.get(PartnerRepository)
    hashService = Container.get(HashService)
    tokenService = Container.get(TokenService)
  })

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  it('should throw an error if email is not found', async () => {
    // Call the login method and expect it to throw an error.
    await expect(authActionInstance.login('nonexistent@example.com', 'password')).rejects.toThrow('Email not found')
  })

  it('should log in successfully with correct credentials', async () => {
    jest.spyOn(partnerRepository, 'findByEmail').mockResolvedValueOnce(partnerData as any)
    jest.spyOn(hashService, 'comparePasswords').mockResolvedValueOnce(true)
    const tokenMock = 'validToken'
    jest.spyOn(tokenService, 'generateToken').mockReturnValueOnce(tokenMock)
    const loginResult = await authActionInstance.login(partnerData.email, 'password')
    expect(loginResult).toEqual({ partner: partnerData, token: tokenMock })
    expect(partnerRepository.findByEmail).toHaveBeenCalledWith(partnerData.email)
    expect(hashService.comparePasswords).toHaveBeenCalledWith('password', partnerData.password)
    expect(tokenService.generateToken).toHaveBeenCalled()
  })

  it('should throw an error if password is incorrect', async () => {
    jest.spyOn(partnerRepository, 'findByEmail').mockResolvedValueOnce(partnerData as any)
    jest.spyOn(hashService, 'comparePasswords').mockResolvedValueOnce(false)
    await expect(authActionInstance.login(partnerData.email, 'password')).rejects.toThrow('Password incorrect')
  })

  it('should throw an error if email is not found', async () => {
    jest.spyOn(partnerRepository, 'findByEmail').mockResolvedValueOnce(null)
    await expect(authActionInstance.login('nonexistent@example.com', 'password')).rejects.toThrow('Email not found')
  })


})
