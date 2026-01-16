import type { FastifyInstance } from 'fastify'
import type { createEmbedConfigService } from '../services/embed-config.service.js'
import type { createOrgService } from '../services/org.service.js'

export async function registerEmbedPublicRoutes(
  fastify: FastifyInstance,
  embedConfigService: ReturnType<typeof createEmbedConfigService>,
  orgService: ReturnType<typeof createOrgService>
) {
  fastify.get('/api/public/embed/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string }
      const config = await embedConfigService.getByToken(token)

      if (!config) {
        return reply.status(404).send({
          error: 'Embed config not found',
          code: 'EMBED_CONFIG_NOT_FOUND',
          statusCode: 404,
          timestamp: new Date().toISOString(),
        })
      }

      const site = await orgService.getSiteById(config.siteId)

      return reply.status(200).send({
        data: {
          token: config.token,
          orgId: config.orgId,
          siteId: config.siteId,
          name: config.name,
          themeColor: config.themeColor,
          buttonLabel: config.buttonLabel,
          locale: config.locale,
          timezone: config.timezone,
          defaultService: config.defaultService,
          site: site
            ? {
                id: site.id,
                name: site.name,
                address: site.address,
                timezone: site.timezone,
              }
            : null,
        },
      })
    } catch (error) {
      console.error('Embed config lookup error:', error)
      return reply.status(500).send({
        error: 'Failed to load embed config',
        code: 'EMBED_CONFIG_PUBLIC_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })
}
