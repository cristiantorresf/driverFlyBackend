// actions/authAction.ts
import { PartnerRepository } from '../repositories/PartnerRepository'
import { HashService } from '../services/HashService'
import { TokenService } from '../services/TokenService'
import { Service } from 'typedi'
import { EmailGateway } from '../gateways/SendEmailGateway'
import { ValidationService } from '../services/ValidationService'
import { Partner } from '../db/models/partner'
import { DeletePartnerInput, InputMaybe, PartnerInput } from '../gql/types/typedSchema'

@Service()
export class AuthAction {

  constructor(
    private partnerRepository: PartnerRepository,
    private hashService: HashService,
    private tokenService: TokenService,
    private emailGateway: EmailGateway,
    private validationService: ValidationService
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

  async registerPartner(input: InputMaybe<PartnerInput> | undefined): Promise<Partner> {
    console.log('input', input)
    if (!input?.email || !input?.password) throw new Error('Bad Request')
    const { email, password, username } = input as PartnerInput

    if (!this.validationService.isValidEmail(email)) {
      throw new Error('Email is invalid')
    }
    const hashedPassword = await this.hashService.hashPassword(password)
    await this.sendEmail(email)
    await this.validateAlreadyRegistered(email, username)
    return this.partnerRepository.save({ ...input, password: hashedPassword } as Partner)
  }

  async isPartnerAlreadyRegister(criteria: Record<string, any>): Promise<boolean> {
    const partner = await this.partnerRepository.findBy(criteria)
    return partner !== null
  }

  async deletePartner(input: InputMaybe<DeletePartnerInput> | undefined) {
    return this.partnerRepository.removeBy({ email: input?.email })
  }

  private async sendEmail(email: string) {
    // Send email after registration
    await this.emailGateway.sendEmail({
      from: process.env.EMAIL_USER || 'corp@mail.com',
      to: email,
      subject: 'TU CUENTA SE HA REGISTRADO CORRECTAMENTE 🤩',
      text: 'Registration Complete'
    })
  }

  private async validateAlreadyRegistered(email: string, username: string | null | undefined) {
    // Check if a partner with the same email or username already exists
    const isEmailTaken = await this.isPartnerAlreadyRegister({ email })
    const isUsernameTaken = username ? await this.isPartnerAlreadyRegister({ username }) : false
    if (isEmailTaken) {
      throw new Error('Email is already in use')
    }
    if (isUsernameTaken) {
      throw new Error('Username is already taken')
    }
  }
}
