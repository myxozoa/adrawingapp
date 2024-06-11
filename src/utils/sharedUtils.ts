// Anything I want to use in workers seems to need to be in a separate util file

export function flipVertically(imageData: ImageData) {
  const width = imageData.width
  const height = imageData.height
  const data = imageData.data
  const bytesPerPixel = 4 // RGBA
  const rowSize = width * bytesPerPixel
  const tempRow = new Uint8ClampedArray(rowSize)

  for (let y = 0; y < height / 2; y++) {
    const topRowStart = y * rowSize
    const bottomRowStart = (height - 1 - y) * rowSize

    // Save the top row to the temp row
    tempRow.set(data.subarray(topRowStart, topRowStart + rowSize))

    // Copy the bottom row to the top row
    data.copyWithin(topRowStart, bottomRowStart, bottomRowStart + rowSize)

    // Copy the saved top row to the bottom row
    data.set(tempRow, bottomRowStart)
  }

  return imageData
}

export function uint16ToFloat16(uint16: number) {
  const exponent = (uint16 >> 10) & 0x1f
  const fraction = uint16 & 0x3ff
  const sign = (uint16 >> 15) & 0x1

  if (exponent === 0) {
    return (sign ? -1 : 1) * Math.pow(2, -14) * (fraction / Math.pow(2, 10))
  } else if (exponent === 31) {
    return fraction === 0 ? (sign ? -Infinity : Infinity) : NaN
  }

  // Normalize
  return (sign ? -1 : 1) * Math.pow(2, exponent - 15) * (1 + fraction / Math.pow(2, 10))
}
