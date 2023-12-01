function log(err) {
  if (/An invalid token was provided/.test(err.stack)) console.log('Invalid bot token')
  else if (/Interaction has already been acknowledged/.test(err.stack)) console.log('Two interactions at same time')
  else if (/Collector received no interactions before ending with reason: time/.test(err.stack)) console.log('Collector received no interactions')
  else console.log(err)
}

process
  .on('uncaughtException', log)
  .on('uncaughtExceptionMonitor', log)
  .on('unhandledRejection', log)