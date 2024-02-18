import { Request, Response } from 'express'
import { Service } from 'typedi'
import { ServicesAction } from '../actions/serviceAction'

@Service()
export class ServiceController {
  constructor(private servicesAction: ServicesAction) {
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
}
