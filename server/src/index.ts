import { config } from './config.js'
import { createApp } from './app.js'

const { http } = await createApp()
http.listen(config.port, '0.0.0.0', () => console.log(`eUniversité Live — serveur sur http://localhost:${config.port}`))
