import { FetchPartnerServicesService } from '../services/fetchPartnerServicesService'
import { ServiceData } from '../db/models/serviceData'
import { Service } from 'typedi'
import { ServicesRepository, UpsertCriteria } from '../repositories/ServicesRepository'

// Gateway is the bridge to communicate different external services either Strapi, DataBase or Third party APIS
@Service()
export class ServiceGateway {


  // tslint:disable-next-line:no-empty
  constructor(private fetchPartnerServicesService: FetchPartnerServicesService, private servicesRepository: ServicesRepository) {
  }

  async getServices(): Promise<ServiceData[]> {
    return await this.fetchPartnerServicesService.fetchServices()
  }

  async updateServices(strapiServices: ServiceData[]) {
    // @ts-ignore
    const currentServices = await this.servicesRepository.findAll()
    // Create a Set of strapiId values from strapiServices for quick lookup
    const strapiServiceIds = new Set(strapiServices.map(service => service.strapiId))
    // Filter currentServices to find those that need to be deleted
    const servicesToDelete = currentServices.filter(service => !strapiServiceIds.has(service.strapiId))
    // Extract the strapiId of services to delete
    const idsToDelete = servicesToDelete.map(service => service.strapiId)
    // Delete the services that are not in the new strapiServices list
    for (const strapiId of idsToDelete) {
      await this.servicesRepository.remove({ strapiId })
    }
    // Upsert the services
    await this.servicesRepository.upsertMany(this.transformToBulkOperation(strapiServices))
  }

  private transformToBulkOperation(services: ServiceData[]): UpsertCriteria {
    return services.map(item => {
      const { name, description, createdAt, updatedAt, strapiId, publishedAt } = item
      return {
        filter: { strapiId: item.strapiId },
        update: {
          $set: {
            name,
            description,
            strapiId,
            createdAd: new Date(createdAt),
            updatedAt: new Date(updatedAt),
            publishedAt: new Date(publishedAt)
          }
        }
      }
    })
  }


}
