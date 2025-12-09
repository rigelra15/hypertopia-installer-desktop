import { addCollection } from '@iconify/react'

// Import icon collections for offline use
import mdiIcons from '@iconify-json/mdi/icons.json'
import lineMdIcons from '@iconify-json/line-md/icons.json'
import biIcons from '@iconify-json/bi/icons.json'

// Add collections to Iconify for offline use
addCollection(mdiIcons)
addCollection(lineMdIcons)
addCollection(biIcons)

export default function loadIcons() {
  // Icons are loaded when this module is imported
  return true
}
