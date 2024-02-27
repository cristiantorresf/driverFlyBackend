import { Request, Response } from 'express'
import { Service } from 'typedi'
import { ServicesAction } from '../actions/serviceAction'
import axios from 'axios'
import { LoggerService } from '../services/LoggerService'

type Language = 'EN' | 'ES'

const LanguageMessages = {
  EN: {
    FIRST_STEP: 'WELCOME',
    AWAITING_LANGUAGE: 'Please select your language: Reply with \'EN\' for English or \'ES\' for Spanish. /n Por favor, selecciona tu idioma: Responde con \'EN\' para inglés o \'ES\' para español.',
    AWAITING_NAME: 'What\'s your name and lastname?',
    AWAITING_LOCATION: 'Great! Now, please share your location by attaching it in WhatsApp.',
    AWAITING_DESTINATION: 'Almost there! Where would you like to go? Please share your destination address.',
    COMPLETED: (name: string, location: string, destination: string) =>
      `Thanks, ${name}! A dispatcher will send a car to ${location} to take you to ${destination} shortly. To cancel please send 5`,
    RESTART: 'Your request has been canceled. Would you like to book another trip? If so, please share your name to start again.'
  },
  ES: {
    FIRST_STEP: 'BIENVENIDO',
    AWAITING_LANGUAGE: 'Por favor, selecciona tu idioma: Responde con \'EN\' para inglés o \'ES\' para español.',
    AWAITING_NAME: '¿Cómo te llamas? Nombre y Apellido',
    AWAITING_LOCATION: '¡Genial! Ahora, por favor comparte tu ubicación adjuntándola en WhatsApp.',
    AWAITING_DESTINATION: 'Casi terminamos. ¿A dónde te gustaría ir? Por favor, comparte la dirección de tu destino.',
    COMPLETED: (name: string, location: string, destination: string) =>
      `Gracias, ${name}! Un conductor te enviará un auto a ${location} para llevarte a ${destination} pronto. Para cancelar por favor presiona 5`,
    RESTART: 'Tu solicitud ha sido cancelada. ¿Te gustaría reservar otro viaje? Si es así, por favor comparte tu nombre para comenzar de nuevo.'
  }
} as const

type States = keyof typeof LanguageMessages.EN
const CUSTOMER_STATES: Record<States, States> = {
  FIRST_STEP: 'FIRST_STEP',
  AWAITING_LANGUAGE: 'AWAITING_LANGUAGE',
  AWAITING_NAME: 'AWAITING_NAME',
  AWAITING_LOCATION: 'AWAITING_LOCATION',
  AWAITING_DESTINATION: 'AWAITING_DESTINATION',
  COMPLETED: 'COMPLETED',
  RESTART: 'RESTART'
}

const TEMPLATES = {
  START_TRIP: 'start_trip',
  SEND_LOCATION: 'sendlocation',
  SET_DESTINATION: 'setdestination',
  CONFIRMATION: 'confirmation',
  CANCELATION: 'cancellation'
} as const

interface UserState {
  language: Language
  state: States
  data: {
    name?: string
    location?: { latitude: number, longitude: number }
    destination?: string
  }
}

@Service()
export class ServiceController {
  token: string | undefined
  private userStates: Map<string, UserState>

  constructor(
    private servicesAction: ServicesAction,
    private log: LoggerService
  ) {
    this.token = process.env.WHATSAPP_TOKEN
    this.userStates = new Map()
  }

  async receivedWhatsappMessage(req: Request, res: Response) {
    this.log.info('😎😎😎🔥🔥 post webhook reached')
    const body = req.body as WhatsAppMessageEntry
    try {
      if (body) {
        if (
          body.entry &&
          body.entry[0].changes &&
          body.entry[0].changes[0] &&
          body.entry[0].changes[0].value.messages &&
          body.entry[0].changes[0].value.messages[0]
        ) {
          const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id
          const userPhoneNumber = body.entry[0].changes[0].value.messages[0].from
          const entryMessage = body.entry[0].changes[0].value.messages[0]
          const userMessage = body.entry[0].changes[0].value.messages[0]?.text?.body
          console.log('', { entryMessage })
          if (entryMessage.type === 'interactive' && entryMessage?.interactive?.type === 'button_reply') {
            // This means a button was clicked
            const buttonId = entryMessage?.interactive.button_reply.id
            const buttonTitle = entryMessage?.interactive.button_reply.title
            console.log('buttonId, buttonTitle', { buttonId, buttonTitle })
            // Now you can handle the button click based on the buttonId or buttonTitle
          }

          console.log('Persistance States before ', this.userStates)
          console.log(`📞 Phone Number ID: ${phoneNumberId}`)
          console.log(`📤 From: ${userPhoneNumber}`)
          console.log(`💬 Message Body: ${userMessage}`)
          if (!userMessage) {
            const messageLocation = body.entry[0].changes[0].value.messages[0].location
            console.log('🌐 Location ', messageLocation)
          }

          const currentState = this.userStates.get(userPhoneNumber) || {
            language: 'EN',
            state: CUSTOMER_STATES.FIRST_STEP,
            data: {}
          }

          if (currentState.state === CUSTOMER_STATES.RESTART) {
            currentState.data.name = userMessage
            currentState.state = CUSTOMER_STATES.AWAITING_LOCATION
            const message = LanguageMessages[currentState.language].AWAITING_LOCATION
            await this.sendMessage(phoneNumberId, userPhoneNumber, `${userMessage} >> ${message}`, res)
            this.userStates.set(userPhoneNumber, currentState)
            this.cancelTravelRequest()
            return
          }

          if (currentState.state === CUSTOMER_STATES.FIRST_STEP) {
            currentState.state = CUSTOMER_STATES.AWAITING_LANGUAGE
            const selectLanguageMsg = LanguageMessages.EN.AWAITING_LANGUAGE
            await this.sendMessage(phoneNumberId, userPhoneNumber, selectLanguageMsg, res)
            this.userStates.set(userPhoneNumber, currentState)
            return
          }
          // Handle language selection separately
          if (currentState.state === CUSTOMER_STATES.AWAITING_LANGUAGE) {
            const selectedLanguage = userMessage?.toUpperCase() === 'ES' ? 'ES' : 'EN'
            const stepResponse = LanguageMessages[selectedLanguage].AWAITING_NAME
            currentState.language = selectedLanguage
            currentState.state = CUSTOMER_STATES.AWAITING_NAME
            await this.sendMessage(phoneNumberId, userPhoneNumber, stepResponse, res)
            this.userStates.set(userPhoneNumber, currentState)
            return
          }
          let stepResponseCalc = ''
          switch (currentState.state) {
            case CUSTOMER_STATES.AWAITING_NAME:
              currentState.data.name = userMessage
              stepResponseCalc = LanguageMessages[currentState.language].AWAITING_LOCATION
              currentState.state = CUSTOMER_STATES.AWAITING_LOCATION
              break
            case CUSTOMER_STATES.AWAITING_LOCATION:
              const messageLocation = body.entry[0].changes[0].value.messages[0].location
              currentState.data.location = messageLocation
              stepResponseCalc = LanguageMessages[currentState.language].AWAITING_DESTINATION
              currentState.state = CUSTOMER_STATES.AWAITING_DESTINATION
              break
            case CUSTOMER_STATES.AWAITING_DESTINATION:
              currentState.data.destination = userMessage
              const { destination, name, location } = currentState.data
              stepResponseCalc = LanguageMessages[currentState.language].COMPLETED(name!, JSON.stringify(location), destination!)
              currentState.state = CUSTOMER_STATES.COMPLETED
              break
            case CUSTOMER_STATES.COMPLETED:
              // restart
              if (userMessage === '5') {
                stepResponseCalc = LanguageMessages[currentState.language].RESTART
                currentState.state = CUSTOMER_STATES.RESTART
              }
              break
          }
          this.userStates.set(userPhoneNumber, currentState)
          await this.sendMessage(phoneNumberId, userPhoneNumber, stepResponseCalc, res)
          console.log('Persistance States after ', this.userStates)
        }
        res.sendStatus(200)
      } else {
        console.log('no json payload body 🤨🤨🤨')
        res.sendStatus(404)
      }
    } catch (error: any) {
      console.log('Error printing request body', error)
    }
    console.log('🔥⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯🔥')
  }

  public async getServices(req: Request, res: Response): Promise<Response> {
    try {
      this.log.info('🚀 attempting to fetch strapi services')
      if (!this.servicesAction) {
        this.log.error('⚠️ instance not being successfully resolved')
      }
      const services = await this.servicesAction.fetchStrapiServices()
      this.log.info('✅ services fetched successfully', { services })
      return res.json(services)
    } catch (error: any) {
      this.log.error('❌ failed fetching services', { error })
      return res.status(500).json({ error: error.message })
    }
  }

  async addServiceRecord(req: Request, res: Response) {
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
    const secret = req.headers['x-webhook-secret']
    if (secret !== WEBHOOK_SECRET) {
      return res.status(401).send('Unauthorized')
    }
    this.log.info('🔥🔥🔥🔥🔥🔥received an event to update services database from cms strapi')
    await this.servicesAction.updateServices()
    return res.send('success').status(200)
  }

  async verifyWebhookWithMeta(req: Request, res: Response) {
    this.log.info('😎😎😎😎 get webhook reached')
    const verifyToken = process.env.VERIFY_TOKEN

    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    console.log('🚀 test webhook data', { mode, token, challenge, verifyToken })
    if (mode && token) {
      if (mode === 'subscribe' && token === verifyToken) {
        this.log.info('⭐️ WEBHOOK_VERIFIED')
        res.status(200).send(challenge)
      } else {
        res.sendStatus(403)
      }
    }
  }

  private cancelTravelRequest() {
    this.userStates = new Map()
  }

  private async sendLanguageTemplate(phoneNumberId: string) {
    try {
      const response = await axios({
        method: 'POST',
        url: `https://graph.facebook.com/v12.0/${phoneNumberId}/messages`,
        params: {
          access_token: this.token
        },
        data: {
          messaging_product: 'whatsapp',
          to: '573237992985',
          type: 'template',
          template: {
            name: 'start_trip',
            language: {
              code: 'en'
            }
          }
        }
      })

      return response.data
    } catch (error: any) {
      console.error(`Failed to send message template: ${error.message}`)
      throw error
    }
  }

  private async sendMessage(phoneNumberId: string, from: string, msgBody: any, res: Response) {
    try {
      const response = await axios({
        method: 'POST',
        url: 'https://graph.facebook.com/v12.0/' + phoneNumberId + '/messages?access_token=' + this.token,
        data: {
          messaging_product: 'whatsapp',
          to: from,
          text: { body: msgBody }
        },
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.status === 200)
        res.sendStatus(200)
    } catch (e) {
      console.log('Unable to send message back to user')
      res.sendStatus(404)
    }

  }


}
