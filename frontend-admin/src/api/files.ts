import rawApi from './rawClient'

export const fetchDocumentPdf = async (id: string): Promise<Blob> => {
  const response = await rawApi.get('/database/document/file', {
    params: { id },
    responseType: 'blob',
  })
  return response.data as Blob
}

