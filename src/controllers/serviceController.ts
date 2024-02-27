import { Request, Response } from 'express'
import { Service } from 'typedi'
import { ServicesAction } from '../actions/serviceAction'
import axios from 'axios'
import { LoggerService } from '../services/LoggerService'
import { Message, TemplateComponent, WhatsAppMessageEntry } from '../types/whatsappApiTypes'

type Language = 'EN' | 'ES'

const LanguageMessages = {
  EN: {
    FIRST_STEP: 'WELCOME',
    AWAITING_LANGUAGE: 'Please select your language: Reply with \'EN\' for English or \'ES\' for Spanish. /n Por favor, selecciona tu idioma: Responde con \'EN\' para inglés o \'ES\' para español.',
    AWAITING_NAME: 'What\'s your name and lastname?',
    AWAITING_LOCATION: 'Great! Now, please share your location by attaching it in WhatsApp.',
    AWAITING_DESTINATION: 'Almost there! Where would you like to go? Please share your destination address.',
    COMPLETED: (name: string, location: string, destination: string) => `🙏 Thank you, ${name}! 🚗 A driver will send a car to ${location} to take you to ${destination} soon. 😊 To cancel please press 5. ⏹️`,
    RESTART: 'Your request has been canceled. Would you like to book another trip? If so, please share your name to start again.'
  },
  ES: {
    FIRST_STEP: 'BIENVENIDO',
    AWAITING_LANGUAGE: 'Por favor, selecciona tu idioma: Responde con \'EN\' para inglés o \'ES\' para español.',
    AWAITING_NAME: '¿Cómo te llamas? Nombre y Apellido',
    AWAITING_LOCATION: '¡Genial! Ahora, por favor comparte tu ubicación adjuntándola en WhatsApp.',
    AWAITING_DESTINATION: 'Casi terminamos. ¿A dónde te gustaría ir? Por favor, comparte la dirección de tu destino.',
    COMPLETED: (name: string, location: string, destination: string) => `🙏 Gracias, ${name}! 🚗 Un conductor te enviará un auto a ${location} para llevarte a ${destination} muy pronto. 😊 Para cancelar por favor presiona 5. ⏹️`,
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
  SEND_LANGUAGE: 'strart_trip',
  SEND_LOCATION: 'sendlocation',
  SET_DESTINATION: 'setdestination',
  CONFIRMATION: 'confirmation',
  CANCELATION: 'cancellation'
} as const

type Template = typeof TEMPLATES[keyof typeof TEMPLATES]

type PhoneNumber = string

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
  private userStates: Map<PhoneNumber, UserState>

  constructor(
    private servicesAction: ServicesAction,
    private log: LoggerService
  ) {
    this.token = process.env.WHATSAPP_TOKEN
    this.userStates = new Map()
    console.log(this.userStates)
  }

  async resetStatePersistence(_req: Request, res: Response) {
    this.userStates = new Map()
    console.log(this.userStates)
    res.send('Persistence state successfully reset')
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
          const buttonText = entryMessage.type === 'button' ? entryMessage.button?.payload : ''
          this.loggingEntryMessage(entryMessage, phoneNumberId, userPhoneNumber, userMessage)

          // setting persistence with Map
          const currentState = this.userStates.get(userPhoneNumber) || {
            language: 'EN',
            state: CUSTOMER_STATES.FIRST_STEP,
            data: {}
          }

          if (buttonText && this.isHelpRequested(buttonText)) {
            await this.sendHelpNotification(currentState, phoneNumberId, userPhoneNumber, res)
            res.sendStatus(200)
            return
          }

          if (buttonText && this.isCancellationRequested(buttonText) || userMessage === '5') {
            this.cancelTravelRequest(phoneNumberId)
            await this.cancelationNotification(phoneNumberId, currentState, userPhoneNumber, res)
            currentState.state = CUSTOMER_STATES.FIRST_STEP
            res.sendStatus(200)
            return
          }

          if (currentState.state === CUSTOMER_STATES.RESTART) {
            currentState.data.name = userMessage
            currentState.state = CUSTOMER_STATES.AWAITING_LOCATION
            const message = LanguageMessages[currentState.language].AWAITING_LOCATION
            await this.sendMessage(phoneNumberId, userPhoneNumber, `${userMessage} >> ${message}`)
            this.userStates.set(userPhoneNumber, currentState)
            this.cancelTravelRequest(phoneNumberId)
            res.sendStatus(200)
            return
          }

          if (currentState.state === CUSTOMER_STATES.FIRST_STEP) {
            // transition next step in the Chatbot
            currentState.state = CUSTOMER_STATES.AWAITING_LANGUAGE
            // we use nice templates instead of boring plain text messages
            await this.sendTemplate(phoneNumberId, userPhoneNumber, TEMPLATES.SEND_LANGUAGE, res, 'EN')
            this.userStates.set(userPhoneNumber, currentState)
            res.sendStatus(200)
            return
          }
          // Handle language selection separately
          if (currentState.state === CUSTOMER_STATES.AWAITING_LANGUAGE) {
            const selectedLanguage = buttonText?.toUpperCase() === 'ENGLISH' ? 'EN' : 'ES'
            const botResponse = LanguageMessages[selectedLanguage].AWAITING_NAME
            currentState.language = selectedLanguage
            // transition to ask name
            currentState.state = CUSTOMER_STATES.AWAITING_NAME
            await this.sendMessage(phoneNumberId, userPhoneNumber, botResponse)
            this.userStates.set(userPhoneNumber, currentState)
            res.sendStatus(200)
            return
          }
          const lang = currentState.language
          const { name, location } = currentState.data
          switch (currentState.state) {
            case CUSTOMER_STATES.AWAITING_NAME:
              currentState.data.name = userMessage
              // transition to ask location
              currentState.state = CUSTOMER_STATES.AWAITING_LOCATION
              await this.sendTemplate(phoneNumberId, userPhoneNumber, TEMPLATES.SEND_LOCATION, res, lang)
              break
            case CUSTOMER_STATES.AWAITING_LOCATION:
              const messageLocation = entryMessage.location
              currentState.data.location = messageLocation
              currentState.state = CUSTOMER_STATES.AWAITING_DESTINATION
              await this.sendTemplate(phoneNumberId, userPhoneNumber, TEMPLATES.SET_DESTINATION, res, lang)
              break
            case CUSTOMER_STATES.AWAITING_DESTINATION:
              currentState.data.destination = userMessage
              const imageLink = 'https://th.bing.com/th/id/OIP.Y6o_MMWWe8Ze6EZrbqRZSAHaD9?rs=1&pid=ImgDetMain'
              const templateInformation: TemplateComponent[] = [
                {
                  type: 'header',
                  parameters: [
                    { type: 'image', image: { link: imageLink } }
                  ]
                },
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: name! },
                    { type: 'text', text: userMessage! }

                  ]
                }
              ]
              currentState.state = CUSTOMER_STATES.COMPLETED
              const msgBody = LanguageMessages[currentState.language].COMPLETED(name!, JSON.stringify(location), userMessage!)
              await this.sendMessage(phoneNumberId, userPhoneNumber, msgBody)
              await this.sendTemplate(phoneNumberId, userPhoneNumber, TEMPLATES.CONFIRMATION, res, lang, templateInformation)
              break
            case CUSTOMER_STATES.COMPLETED:
              // restart
              if (userMessage === '5') {
                currentState.state = CUSTOMER_STATES.RESTART
              }
              break
          }
          this.userStates.set(userPhoneNumber, currentState)
          console.log('Persistance States after ', JSON.stringify(this.userStates))
        }
      } else {
        console.log('no json payload body 🤨🤨🤨')
      }
      res.sendStatus(200)
    } catch (error: any) {
      console.log('Error printing request body', error)
    }
    console.log('🔥⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯🔥')
  }

  async sendTemplate(phoneNumberId: string, from: string, templateName: Template, res: Response, language: 'EN' | 'ES', templateData?: TemplateComponent[]) {
    console.log('Attempting to send template with ', { phoneNumberId, templateName, language, from, templateData })
    try {
      const requestBody = {
        method: 'POST',
        url: `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        data: {
          messaging_product: 'whatsapp',
          to: from,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: language
            },
            ...(templateName === TEMPLATES.CONFIRMATION ? { components: templateData } : {})
          }
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`
        }
      }
      console.log({ requestBody: JSON.stringify(requestBody.data.template) })
      await axios(requestBody)
    } catch (e: any) {
      console.log('🔥🙀🙀 Unable to send template back to user', e.message)
      this.cancelTravelRequest(phoneNumberId)
      await this.sendMessage(phoneNumberId, from, 'Something went wrong sending template')
    }
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

  async getUserStates(_req: Request, res: Response) {
    let userStatesHTML = ''

    // Loop over the Map entries and add them to the response string
    for (const [userStateKey, userStateValue] of this.userStates.entries()) {
      userStatesHTML += `<pre>User Key: ${userStateKey} => User Value: ${JSON.stringify(userStateValue, null, 2)}</pre>`
    }

    // The complete HTML response
    const htmlResponse = `
    <html lang='en'>
      <head>
        <title>User States</title>
        <style>
          body{
            background-color: #242424; /* Dark background */
          }

          pre{
            color: lime; /* Green text */
          }
          #refreshBtn {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px;
        font-size: 1em;
        background-color: lime;
        color: black;
        border: none;
        cursor: pointer;
        border-radius: 5px;
        box-shadow: 0 0 8px rgba(0,0,0,0.1);
      }

      #refreshBtn:hover {
        background-color: #bada55;
        box-shadow: 0 0 16px rgba(0,0,0,0.2);
      }
        </style>
      </head>
      <body>
        <h2 style='color:white;'>User States:</h2>
        ${userStatesHTML}
        <button id='refreshBtn' onclick='location.reload();'>Refresh</button>
      </body>
    </html>`

    // Send HTML response
    res.send(htmlResponse)
  }

  private async sendHelpNotification(currentState: UserState, phoneNumberId: string, userPhoneNumber: string, res: Response) {
    const botMessage = currentState.language === 'EN'
      ? `No worries, I can help you with your request. Send me a message at 3237992985 😊👍`
      : `No te preocupes, puedo ayudarte con tu solicitud. Envíame un mensaje al 3237992985 😊👍`
    await this.sendMessage(phoneNumberId, userPhoneNumber, botMessage)
  }

  private async cancelationNotification(phoneNumberId: string, currentState: UserState, userPhoneNumber: string, res: Response) {
    const cancelationMessage = currentState.language === 'EN'
      ? `Your request has been cancelled. Feel free to make a new one! ❌😉`
      : `Tu solicitud ha sido cancelada. ¡Siéntete libre de hacer una nueva! ❌😉`
    await this.sendMessage(phoneNumberId, userPhoneNumber, cancelationMessage)
  }

  private isCancellationRequested(input: string): boolean {
    const cancelRepresentations = ['CANCELAR', 'CANCEL']
    const upperCaseInput = input?.toUpperCase()
    return cancelRepresentations.some(value => upperCaseInput?.includes(value))
  }

  private isHelpRequested(input: string): boolean {
    const helpRepresentations = ['I NEED HELP', 'NECESITO AYUDA']
    const upperCaseInput = input?.toUpperCase()
    return helpRepresentations.some(token => upperCaseInput?.includes(token))
  }

  private loggingEntryMessage(entryMessage: Message, phoneNumberId: string, userPhoneNumber: string, userMessage: string | undefined) {
    console.log('', { entryMessage })
    console.log('Persistance States before ', this.userStates)
    console.log(`📞 Phone Number ID: ${phoneNumberId}`)
    console.log(`📤 From: ${userPhoneNumber}`)
    console.log(`💬 Message Body: ${userMessage}`)
  }

  private cancelTravelRequest(userPhoneNumber: PhoneNumber) {
    this.userStates.delete(userPhoneNumber)
  }

  // @ts-ignore
  private async sendMessage(phoneNumberId: string, from: string, msgBody: any) {
    console.log(`Attempting to send message with ${msgBody} with numberId ${phoneNumberId} and user number ${from}`)
    try {
      await axios({
        method: 'POST',
        url: 'https://graph.facebook.com/v12.0/' + phoneNumberId + '/messages?access_token=' + this.token,
        data: {
          messaging_product: 'whatsapp',
          to: from,
          text: { body: msgBody }
        },
        headers: { 'Content-Type': 'application/json' }
      })
      console.log('Message send successfully')
      // const statusCode = response.status === 200 ? 200 : 400
      // res.sendStatus(statusCode)
    } catch (e: any) {
      console.log('🔥🔥🔥 Unable to send message back to user', e.message)
      this.cancelTravelRequest(phoneNumberId)
      throw new Error('Failed')
    }

  }


}
