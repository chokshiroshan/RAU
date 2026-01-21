const { searchUnified } = require('../services/unifiedSearchService')

const latestRequestBySender = new Map()

async function searchUnifiedHandler(event, query, filters = {}, requestId = null) {
  const senderId = event?.sender?.id || 'unknown'
  const lastRequest = latestRequestBySender.get(senderId)
  if (typeof requestId === 'number' && typeof lastRequest === 'number' && requestId < lastRequest) {
    return []
  }
  if (typeof requestId === 'number') {
    latestRequestBySender.set(senderId, requestId)
  }
  return searchUnified(query, filters, requestId, senderId)
}

module.exports = {
  searchUnifiedHandler,
}
