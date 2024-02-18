import { Service } from 'typedi'
import { ServiceData } from '../db/models/serviceData'
import { ServiceGateway } from '../gateways/serviceGateway'

// Action will have the own business model logic, like actions inherent to the business
@Service()
export class ServicesAction {

  constructor(private serviceGateway: ServiceGateway) {
  }

  public async fetchStrapiServices(): Promise<ServiceData[]> {
    return await this.serviceGateway.getServices()
  }

  async updateServices() {
    const services = await this.fetchStrapiServices()
    await this.serviceGateway.updateServices(services)
  }
}
