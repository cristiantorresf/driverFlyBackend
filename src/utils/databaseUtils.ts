export const DatabaseRespositories = {
  tripRepository: 'tripRepository'
} as const
export type DatabaseRepos = keyof typeof DatabaseRespositories
