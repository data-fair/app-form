export default function useAppInfo () {
  const application = window.APPLICATION
  const config = application.configuration
  if (!config) throw new Error('Il n\'y a pas de configuration définie')
  const dataset = config.datasets?.[0]
  if (!dataset) throw new Error('Veuillez sélectionner une source de données')

  return {
    application,
    config,
    dataset,
    datasetUrl: dataset.href,
    directoryUrl: '/simple-directory'
  }
}
