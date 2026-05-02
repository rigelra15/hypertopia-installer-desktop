const Jimp = require('jimp')

async function fixIconSize() {
  try {
    const img = await Jimp.read('resources/icon.png')
    console.log('Original size:', img.bitmap.width, 'x', img.bitmap.height)

    // Autocrop the transparent 1024 edges to get back pure image logic
    img.autocrop()
    console.log('Autocropped size:', img.bitmap.width, 'x', img.bitmap.height)

    // Scale strictly to Apple's bounding box size: 824 x 824
    img.scaleToFit(824, 824)

    // Create new transparent canvas at exactly 1024x1024
    let bg
    try {
      bg = await new Promise((resolve) => {
        new Jimp(1024, 1024, 0x00000000, (err, image) => resolve(image))
      })
    } catch {
      // Ignore
    }

    // Paste precisely into the center of the safe area canvas
    const x = Math.round((1024 - img.bitmap.width) / 2)
    const y = Math.round((1024 - img.bitmap.height) / 2)
    bg.composite(img, x, y)

    // Overwrite the icon
    if (bg.writeAsync) {
      await bg.writeAsync('resources/icon.png')
    } else {
      await new Promise((resolve, reject) =>
        bg.write('resources/icon.png', (err, r) => (err ? reject(err) : resolve(r)))
      )
    }
    console.log('Icon precision fixed to 824x824 squircle mapping!')
  } catch (err) {
    console.error('Failed to correct image size:', err)
  }
}

fixIconSize()
