import { fetchServer } from './entry.rsc'

export default async function handler(request: Request) {
  // Import the generateHTML function from the client environment
  const ssr = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')

  return ssr.generateHTML(request, fetchServer)
}
