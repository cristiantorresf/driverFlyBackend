import { Request, Response } from 'express'
import { Service } from 'typedi'
import { ServicesAction } from '../actions/serviceAction'
import axios from 'axios'
import { LoggerService } from '../services/LoggerService'
import util from 'util'

@Service()
export class ServiceController {
  token: string | undefined

  constructor(
    private servicesAction: ServicesAction,
    private log: LoggerService
  ) {
    this.token = process.env.WHATSAPP_TOKEN
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

  async metaRegisterEvents(req: Request, res: Response) {
    this.log.info('😎😎😎🔥🔥 post webhook reached')

    try {
      console.log('😇😇😇😇😇 req body', util.inspect(req.body, false, null, true))
    } catch (error: any) {
      console.log('Error printing request body', error)
    }

    if (req.body) {
      if (
        req.body.entry &&
        req.body.entry[0].changes &&
        req.body.entry[0].changes[0] &&
        req.body.entry[0].changes[0].value.messages &&
        req.body.entry[0].changes[0].value.messages[0]
      ) {
        const phone_number_id = req.body.entry[0].changes[0].value.metadata.phone_number_id
        const from = req.body.entry[0].changes[0].value.messages[0].from
        const msg_body = req.body.entry[0].changes[0].value.messages[0].text.body

        // Log the phone_number_id, from, and msg_body with emoticons
        console.log(`📞 Phone Number ID: ${phone_number_id}`)
        console.log(`📤 From: ${from}`)
        console.log(`💬 Message Body: ${msg_body}`)

        axios({
          method: 'POST',
          url: 'https://graph.facebook.com/v12.0/' + phone_number_id + '/messages?access_token=' + this.token,
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
      console.log('no json payload body 🤨🤨🤨')
      res.sendStatus(404)
    }
  }
}
