import { Request, Response } from 'express'
import { Service } from 'typedi'
import { ServicesAction } from '../actions/serviceAction'
import axios from 'axios'
import { LoggerService } from '../services/LoggerService'

@Service()
export class ServiceController {
  token: string | undefined

  constructor(private servicesAction: ServicesAction, private log: LoggerService) {
    this.token = process.env.WHATSAPP_TOKEN
  }

  public async getServices(req: Request, res: Response): Promise<Response> {
    try {
      console.log('attempting to fetch strapi services')
      if (!this.servicesAction) {
        console.log('instance not being successfully resolved')
      }
      const services = await this.servicesAction.fetchStrapiServices()
      console.log('services fetched successfully', { services })
      return res.json(services)
    } catch (error: any) {
      console.error('failed fetching services', { error })
      return res.status(500).json({ error: error.message })
    }
  }

  // Este evento llega dinamico cuando manualmente cambiamos los servicios de strapi
  // y actualiza nuestra base de datpos, tenemos full dinamismo y control de los
  // servicios que los partners van a presentar
  async addServiceRecord(req: Request, res: Response) {
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
    const secret = req.headers['x-webhook-secret']
    if (secret !== WEBHOOK_SECRET) {
      return res.status(401).send('Unauthorized')
    }
    console.log('🔥🔥🔥🔥🔥🔥received an event to update services database from cms strapi')
    await this.servicesAction.updateServices()
    // always acknowledge with 200 for strapi
    return res.send('success').status(200)
  }

  // Accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
  // info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
  async verifyWebhookWithMeta(req: Request, res: Response) {
    this.log.info('😎😎😎😎 get webhook reached')
    /**
     * UPDATE YOUR VERIFY TOKEN
     *This will be the Verify Token value when you set up webhook
     **/

      // tslint:disable-next-line:variable-name
    const verify_token = process.env.VERIFY_TOKEN

    // Parse params from the webhook verification request
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === 'subscribe' && token === verify_token) {
        // Respond with 200 OK and challenge token from the request
        console.log('WEBHOOK_VERIFIED')
        res.status(200).send(challenge)
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403)
      }
    }
  }

  async metaRegisterEvents(req: Request, res: Response) {
    this.log.info('😎😎😎🔥🔥 post webhook reached')

    // Parse the request body from the POST
    // Check the Incoming webhook message
    console.log(JSON.stringify(req.body, null, 2))
    // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
    if (req.body.object) {
      if (
        req.body.entry &&
        req.body.entry[0].changes &&
        req.body.entry[0].changes[0] &&
        req.body.entry[0].changes[0].value.messages &&
        req.body.entry[0].changes[0].value.messages[0]
      ) {
        const phone_number_id =
          req.body.entry[0].changes[0].value.metadata.phone_number_id
        const from = req.body.entry[0].changes[0].value.messages[0].from // extract the phone number from the webhook payload
        // tslint:disable-next-line:variable-name
        const msg_body = req.body.entry[0].changes[0].value.messages[0].text.body // extract the message text from the webhook payload
        axios({
          method: 'POST', // Required, HTTP method, a string, e.g. POST, GET
          url:
            'https://graph.facebook.com/v12.0/' +
            phone_number_id +
            '/messages?access_token=' +
            this.token,
          data: {
            messaging_product: 'whatsapp',
            to: from,
            text: { body: 'Ack: ' + msg_body }
          },
          headers: { 'Content-Type': 'application/json' }
        })
      }
      res.sendStatus(200)
    } else {
      // Return a '404 Not Found' if event is not from a WhatsApp API
      res.sendStatus(404)
    }
  }
}
