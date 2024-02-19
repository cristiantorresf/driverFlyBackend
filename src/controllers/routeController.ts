import express from 'express'
import { Container } from 'typedi'
import { ServiceController } from './serviceController'

const router = express.Router()
const serviceController = Container.get<ServiceController>(ServiceController)

router.get('/test', (req, res) => {
  res.send('Hello World')
})

router.get('/services', serviceController.getServices.bind(serviceController))
// web hook automaticamente refrescar mi registro desde strapi tener full control cms de mis servicios
router.post('/serviceWebHook', serviceController.addServiceRecord.bind(serviceController))
router.get('/webhook', serviceController.verifyWebhookWithMeta.bind(serviceController))
router.post('/webhook', serviceController.metaRegisterEvents.bind(serviceController))

export default router
