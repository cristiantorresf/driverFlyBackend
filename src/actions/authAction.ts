// actions/authAction.ts
import { PartnerRepository } from '../repositories/PartnerRepository'
import { HashService } from '../services/HashService'
import { TokenService } from '../services/TokenService'
import { Service } from 'typedi'

@Service()
export class AuthAction {

  constructor(
    private partnerRepository: PartnerRepository,
    private hashService: HashService,
    private tokenService: TokenService
  ) {
  }

  async login(email: string, password: string) {
    const partner = await this.partnerRepository.findByEmail(email)
    if (!partner) {
      throw new Error('Email not found')
    }

    const isCorrectCredentials = await this.hashService.comparePasswords(password, partner.password)
    if (!isCorrectCredentials) {
      throw new Error('Password incorrect')
    }

    const payload = {
      iss: process.env.ISSUER || 'default-issuer',
      sub: partner.username,
      aud: process.env.AUDIENCE || 'default-audience',
      scopes: ['read:data', 'write:data'] // Consider moving to configuration
    }

    const token = this.tokenService.generateToken(payload)
    return { partner, token }
  }


  async isPartnerAlreadyRegister(criteria: Record<string, any>): Promise<boolean> {
    const partner = await this.partnerRepository.findBy(criteria)
    return partner !== null
  }


}
