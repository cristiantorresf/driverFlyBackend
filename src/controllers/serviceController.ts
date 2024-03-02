import { Request, Response } from 'express'
import { Service } from 'typedi'
import { ServicesAction } from '../actions/serviceAction'
import axios from 'axios'
import { LoggerService } from '../services/LoggerService'
import { Message, TemplateComponent, WhatsAppMessageEntry } from '../types/whatsappApiTypes'
import { TripRepository } from '../repositories/TripRepository'

type Language = 'EN' | 'ES'

const LanguageMessages = {
  EN: {
    FIRST_STEP: 'WELCOME',
    AWAITING_LANGUAGE: 'Please select your language: Reply with \'EN\' for English or \'ES\' for Spanish. /n Por favor, selecciona tu idioma: Responde con \'EN\' para inglés o \'ES\' para español.',
    AWAITING_NAME: 'What\'s your name and lastname?',
    AWAITING_LOCATION: 'Great! Now, please share your location by attaching it in WhatsApp.',
    AWAITING_DESTINATION: 'Almost there! Where would you like to go? Please share your destination address.',
    COMPLETED: (name: string, location: string, destination: string) => `🙏 Thank you, ${name}! 🚗 A driver will send a car to ${location} to take you to ${destination} soon. 😊 To cancel please press 5. ⏹️`,
    RESTART: 'Your request has been canceled. Would you like to book another trip? If so, please share your name to start again.',
    AWAITING_DISPATCHER: 'AWAITING_DISPATCHER'
  },
  ES: {
    FIRST_STEP: 'BIENVENIDO',
    AWAITING_LANGUAGE: 'Por favor, selecciona tu idioma: Responde con \'EN\' para inglés o \'ES\' para español.',
    AWAITING_NAME: '¿Cómo te llamas? Nombre y Apellido',
    AWAITING_LOCATION: '¡Genial! Ahora, por favor comparte tu ubicación adjuntándola en WhatsApp.',
    AWAITING_DESTINATION: 'Casi terminamos. ¿A dónde te gustaría ir? Por favor, comparte la dirección de tu destino.',
    COMPLETED: (name: string, location: string, destination: string) => `🙏 Gracias, ${name}! 🚗 Un conductor te enviará un auto a ${location} para llevarte a ${destination} muy pronto. 😊 Para cancelar por favor presiona 5. ⏹️`,
    RESTART: 'Tu solicitud ha sido cancelada. ¿Te gustaría reservar otro viaje? Si es así, por favor comparte tu nombre para comenzar de nuevo.',
    AWAITING_DISPATCHER: 'AWAITING_DISPATCHER'
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
  RESTART: 'RESTART',
  AWAITING_DISPATCHER: 'AWAITING_DISPATCHER'
}


const TEMPLATES = {
  SEND_LANGUAGE: 'strart_trip',
  SEND_LOCATION: 'sendlocation',
  SET_DESTINATION: 'setdestination',
  CONFIRMATION: 'confirmation',
  CANCELATION: 'cancellation',
  NO_LOCATION: 'nolocation',
  IN_PROGRESS: 'tripprogress',
  ENGAGEMENT: 'engagement',
  INTRODUCTION: 'introduction'
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
    sentProgressWarn?: boolean
  }
}

@Service()
export class ServiceController {
  token: string | undefined
  private userStates: Map<PhoneNumber, UserState>
  private response: Response | undefined

  constructor(
    private servicesAction: ServicesAction,
    private log: LoggerService,
    private tripRepository: TripRepository
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

  async handleButtonActions(buttonText: string, userMessage: string, phoneNumberId: string, currentState: UserState, userPhoneNumber: string): Promise<boolean> {
    if (buttonText && this.isHelpRequested(buttonText)) {
      await this.sendHelpNotification(currentState, phoneNumberId, userPhoneNumber)
      return true
    }

    if ((buttonText && this.isCancellationRequested(buttonText)) || userMessage === '5') {
      this.cancelTravelRequest(phoneNumberId)
      await this.cancelationNotification(phoneNumberId, currentState, userPhoneNumber)
      currentState.state = CUSTOMER_STATES.FIRST_STEP
      return true
    }

    return false
  }

  async handleUserDidntSendLocation(userPhoneNumber: string, phoneNumberId: string, language: Language) {
    const templateName = TEMPLATES.NO_LOCATION
    const imageLink = 'https://th.bing.com/th/id/R.93225084a602b89bdb9dfce21e9aa21a?rik=TSk94dnio%2fU6Qw&riu=http%3a%2f%2fcdn.techgyd.com%2fsend-your-location-with-WhatsApp.jpg&ehk=P%2bGMn9aaNfdmaFh32TKeZsAwcXVZfw8ejRn%2f%2fy1U3%2bc%3d&risl=&pid=ImgRaw&r=0&sres=1&sresct=1'
    const templateData: TemplateComponent[] = [
      {
        type: 'header',
        parameters: [
          {
            type: 'image', image: { link: imageLink }
          }
        ]
      }
    ]
    await this.sendTemplate(phoneNumberId, userPhoneNumber, templateName, language, templateData)
    return true
  }

  async receivedWhatsappMessage(req: Request, res: Response) {
    this.response = res
    this.log.info('😎😎😎🔥🔥 post webhook reached')
    const body = req.body as WhatsAppMessageEntry
    const { entry } = body
    if (!entry) return res.sendStatus(400)
    const { metadata: { phone_number_id: phoneNumberId }, messages } = entry[0].changes[0].value
    const [entryMessage] = messages!
    if (!entryMessage || !phoneNumberId) {
      console.log('no json payload body 🤨🤨🤨')
      return res.sendStatus(400)
    }
    try {
      const { from: userPhoneNumber, text } = entryMessage
      const userMessage = text?.body
      const buttonText = entryMessage.type === 'button' ? entryMessage.button?.payload : ''
      this.loggingEntryMessage(entryMessage, phoneNumberId, userPhoneNumber, userMessage)
      // Handle user state
      const currentState = this.userStates.get(userPhoneNumber) || {
        language: 'EN',
        state: CUSTOMER_STATES.FIRST_STEP,
        data: {}
      }

      if (currentState.state === CUSTOMER_STATES.AWAITING_DISPATCHER && currentState.data.sentProgressWarn) {
        if (this.okProgressTrip(buttonText!)) {
          const msgBody = 'ok'
          await this.sendMessage(phoneNumberId, userPhoneNumber, msgBody)
        }
        if (this.isCancelProgressedTrip(buttonText!)) {
          const msgBody = currentState.language === 'EN' ? 'You have cancel your trip' : 'Has cancelado el viaje'
          // delete the right way
          this.userStates.delete(userPhoneNumber)
          await this.sendMessage(phoneNumberId, userPhoneNumber, msgBody)
        }
        return res.sendStatus(200)
      }
      if (currentState.state === CUSTOMER_STATES.AWAITING_DISPATCHER) {
        const templateName = TEMPLATES.IN_PROGRESS
        await this.sendTemplate(phoneNumberId, userPhoneNumber, templateName, currentState.language)
        currentState.data.sentProgressWarn = true
        this.userStates.set(userPhoneNumber, currentState)
        return
      }
      if (currentState.state === CUSTOMER_STATES.COMPLETED) {
        const templateName = TEMPLATES.IN_PROGRESS
        await this.sendTemplate(phoneNumberId, userPhoneNumber, templateName, currentState.language)
        currentState.data.sentProgressWarn = true
        this.userStates.set(userPhoneNumber, currentState)
        return
      }
      if (await this.handleButtonActions(buttonText!, userMessage!, phoneNumberId, currentState, userPhoneNumber)) {
        if (this.response) this.response.sendStatus(200)
        return
      }

      if (currentState.state === CUSTOMER_STATES.RESTART) {
        await this.handleUserRestart(currentState, userMessage!, phoneNumberId, userPhoneNumber)
        return
      }
      console.log('buttonText', { buttonText })
      if (this.startSessionRequested(buttonText!) && currentState.state === CUSTOMER_STATES.FIRST_STEP) {
        await this.handleFirstStep(currentState, phoneNumberId, userPhoneNumber)
        return
      }
      if (currentState.state === CUSTOMER_STATES.FIRST_STEP && !this.startSessionRequested(buttonText!)) {
        const language = userPhoneNumber.startsWith('1') ? 'EN' : (userPhoneNumber.startsWith('57') ? 'ES' : undefined)
        console.log('language', { language, userPhoneNumber })
        if (!language) {
          console.log('Country not supported')
          return
        }
        await this.sendIntroductionTemplate(phoneNumberId, userPhoneNumber, language)
        return
      }
      // Handle language selection separately
      if (currentState.state === CUSTOMER_STATES.AWAITING_LANGUAGE) {
        await this.handleChangeLanguageState(buttonText!, currentState, phoneNumberId, userPhoneNumber)
        return
      }
      const lang = currentState.language
      const { name, location } = currentState.data
      await this.handleWhatsappFlow(currentState, userMessage!, phoneNumberId, userPhoneNumber, lang, entryMessage, name!, location)
      this.userStates.set(userPhoneNumber, currentState)
      console.log('Persistance States after ', JSON.stringify(this.userStates))
      res.sendStatus(200)
    } catch (error: any) {
      console.log('Error printing request body', error)
    }
    console.log('🔥⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯🔥')
  }

  async sendTemplate(phoneNumberId: string, from: string, templateName: Template, language: 'EN' | 'ES', templateData?: TemplateComponent[]) {
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
            ...(templateName === TEMPLATES.CONFIRMATION ? { components: templateData } : {}),
            ...(templateName ? { components: templateData } : {})
          }
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`
        }
      }
      console.log(requestBody)
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

  async addRecordToDatabase(currentState: UserState, userPhoneNumber: string) {
    console.log(`Attempting to add record to DB with ${JSON.stringify(currentState)} and phone ${userPhoneNumber}`)
    try {
      if (this.tripRepository) {
        console.log('repository good 🫡')
        this.tripRepository.transaction.save({
          fullName: currentState.data.name,
          status: currentState.state as any,
          phoneNumber: userPhoneNumber,
          destinationLocation: currentState.data.destination,
          pickupLocation: JSON.stringify(currentState.data.location)
        }).catch(e => console.log(JSON.stringify(e)))
      } else {
        console.log('repository not good 🤯')

      }
    } catch (e: any) {
      console.log('Unable to add record to the database', e.message)
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

  // @ts-ignore
  private async sendEngagementTemplate(phoneId, userPhone, language) {
    const templateName: TemplateComponent[] = [
      {
        type: 'header',
        parameters: [{
          type: 'image',
          image: { link: 'https://th.bing.com/th/id/OIP.AFNUFYbvuwg9Sh5yZJ_aBQHaED?w=304&h=180&c=7&r=0&o=5&dpr=2.2&pid=1.7' }
        }]

      }
    ]
    await this.sendTemplate(phoneId, userPhone, TEMPLATES.ENGAGEMENT, language, templateName)
    if (this.response) this.response.sendStatus(200)
  }

  private async sendIntroductionTemplate(phoneId: string, userPhone: string, language: Language) {
    await this.sendTemplate(phoneId, userPhone, TEMPLATES.INTRODUCTION, language)
    if (this.response) this.response.sendStatus(200)
  }

  private async handleWhatsappFlow(currentState: UserState, userMessage: string, phoneNumberId: string, userPhoneNumber: string, lang: Language, entryMessage: Message, name: string, location: Message['location']) {
    switch (currentState.state) {
      case CUSTOMER_STATES.AWAITING_NAME:
        currentState.data.name = userMessage
        // transition to ask location
        currentState.state = CUSTOMER_STATES.AWAITING_LOCATION
        await this.sendTemplate(phoneNumberId, userPhoneNumber, TEMPLATES.SEND_LOCATION, lang)
        break
      case CUSTOMER_STATES.AWAITING_LOCATION:
        const messageLocation = entryMessage.location
        if (!messageLocation) {
          await this.handleUserDidntSendLocation(userPhoneNumber, phoneNumberId, currentState.language)
          currentState.state = CUSTOMER_STATES.AWAITING_LOCATION
          break
        }
        currentState.data.location = messageLocation
        currentState.state = CUSTOMER_STATES.AWAITING_DESTINATION
        await this.sendTemplate(phoneNumberId, userPhoneNumber, TEMPLATES.SET_DESTINATION, lang)
        break
      case CUSTOMER_STATES.AWAITING_DESTINATION:
        currentState.data.destination = userMessage
        const imageLink = 'https://th.bing.com/th/id/OIP.2mNmmW7iIdlsCRqxKKUq0QHaI4?rs=1&pid=ImgDetMain'
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
        await this.addRecordToDatabase(currentState, userPhoneNumber)
        await this.sendTemplate(phoneNumberId, userPhoneNumber, TEMPLATES.CONFIRMATION, lang, templateInformation)
        break
      case CUSTOMER_STATES.COMPLETED:
        // restart
        if (userMessage === '5') {
          currentState.state = CUSTOMER_STATES.RESTART
          break
        }
        currentState.state = CUSTOMER_STATES.AWAITING_DISPATCHER
        // save to database and create frontend
        break
    }
  }

  private async handleFirstStep(currentState: UserState, phoneNumberId: string, userPhoneNumber: string) {
    currentState.state = CUSTOMER_STATES.AWAITING_LANGUAGE
    await this.sendTemplate(phoneNumberId, userPhoneNumber, TEMPLATES.SEND_LANGUAGE, 'EN')
    this.userStates.set(userPhoneNumber, currentState)
    if (this.response) this.response.sendStatus(200)
    return
  }

  private async handleChangeLanguageState(buttonText: string, currentState: UserState, phoneNumberId: string, userPhoneNumber: string) {
    const selectedLanguage = buttonText?.toUpperCase() === 'ENGLISH' ? 'EN' : 'ES'
    const botResponse = LanguageMessages[selectedLanguage].AWAITING_NAME
    currentState.language = selectedLanguage
    currentState.state = CUSTOMER_STATES.AWAITING_NAME
    await this.sendMessage(phoneNumberId, userPhoneNumber, botResponse)
    this.userStates.set(userPhoneNumber, currentState)
    if (this.response) this.response.sendStatus(200)
    return
  }

  private async handleUserRestart(currentState: UserState, userMessage: string, phoneNumberId: string, userPhoneNumber: string) {
    currentState.data.name = userMessage
    currentState.state = CUSTOMER_STATES.AWAITING_LOCATION
    const message = LanguageMessages[currentState.language].AWAITING_LOCATION
    await this.sendMessage(phoneNumberId, userPhoneNumber, `${userMessage} >> ${message}`)
    this.userStates.set(userPhoneNumber, currentState)
    this.cancelTravelRequest(phoneNumberId)
    if (this.response) this.response.sendStatus(200)
    return
  }

  private async sendHelpNotification(currentState: UserState, phoneNumberId: string, userPhoneNumber: string) {
    const botMessage = currentState.language === 'EN'
      ? `No worries, I can help you with your request. Send me a message at 3237992985 😊👍`
      : `No te preocupes, puedo ayudarte con tu solicitud. Envíame un mensaje al 3237992985 😊👍`
    await this.sendMessage(phoneNumberId, userPhoneNumber, botMessage)
  }

  private async cancelationNotification(phoneNumberId: string, currentState: UserState, userPhoneNumber: string) {
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

  private isCancelProgressedTrip(input: string): boolean {
    const cancelList = ['Cancelar el viaje', 'Cancel Trip']
    const upperCaseInput = input?.toUpperCase()
    return cancelList.some((cancelWord) => upperCaseInput.includes(cancelWord))
  }

  private okProgressTrip(input: string): boolean {
    const cancelList = ['Ok']
    const upperCaseInput = input?.toUpperCase()
    return cancelList.some(c => upperCaseInput.includes(c.toUpperCase()))
  }


  private isHelpRequested(input: string): boolean {
    const helpRepresentations = ['I NEED HELP', 'NECESITO AYUDA']
    const upperCaseInput = input?.toUpperCase()
    return helpRepresentations.some(t => upperCaseInput?.includes(t.toUpperCase()))
  }

  private startSessionRequested(input: string): boolean {
    const representations = ['Start', 'Empezar']
    const upperCaseInput = input?.toUpperCase()
    return representations.some(t => upperCaseInput?.includes(t.toUpperCase()))
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
      console.log('Message sent successfully')
      // const statusCode = response.status === 200 ? 200 : 400
      // res.sendStatus(statusCode)
    } catch (e: any) {
      console.log('🔥🔥🔥 Unable to send message back to user', e.message)
      this.cancelTravelRequest(phoneNumberId)
      throw new Error('Failed')
    }
  }
}
