/**
 * @throws If the shader was unable to be created
 */
export function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)

  if (!shader) throw new Error("Unable to create WebGL shader")

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  return shader
}

/**
 * @throws If the program was unable to be created or linked
 */
export function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  const program = gl.createProgram()

  if (!program) throw new Error("Unable to create WebGL program")

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.validateProgram(program)

  const successLink = gl.getProgramParameter(program, gl.LINK_STATUS) as boolean

  if (!successLink) {
    throw new Error(`
    Link failed: ${gl.getProgramInfoLog(program)}
    
    vs info-log: ${gl.getShaderInfoLog(vertexShader)}

    fs info-log: ${gl.getShaderInfoLog(fragmentShader)}
    `)
  }

  return program
}

// export function initializeGL(gl: WebGL2RenderingContext) {

// }

export function getUniformLocations(gl: WebGL2RenderingContext, program: WebGLProgram, list: string[]) {
  const uniforms: Record<string, WebGLUniformLocation> = {}

  for (const uniform of list) {
    const location = gl.getUniformLocation(program, uniform)

    if (location) {
      uniforms[uniform] = location
    }
  }

  return uniforms
}

export function getAttributeLocations(gl: WebGL2RenderingContext, program: WebGLProgram, list: string[]) {
  const attributes: Record<string, GLint> = {}

  for (const attribute of list) {
    attributes[attribute] = gl.getAttribLocation(program, attribute)
  }

  return attributes
}

/**
 * @throws If unable to create texture or lacks support for some extensions
 */
export function createTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  imageFormat: number,
  mipmap: boolean,
  minFilterType?: number,
  magFilterType?: number,
): WebGLTexture {
  const texture = gl.createTexture()

  if (!texture) {
    throw new Error("Error creating render texture")
  }

  gl.bindTexture(gl.TEXTURE_2D, texture)

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

  const levels = mipmap ? 5 : 1

  gl.texStorage2D(gl.TEXTURE_2D, levels, imageFormat, width, height)

  if (mipmap) {
    gl.generateMipmap(gl.TEXTURE_2D)

    if (minFilterType) gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilterType)
    if (magFilterType) gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilterType)
  } else {
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  }

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  // Unbind
  gl.bindTexture(gl.TEXTURE_2D, null)

  return texture
}

/**
 * @throws If unable to create buffer
 */
export function createBuffer(
  gl: WebGL2RenderingContext,
  data: BufferSource,
  usageHint: number = gl.STATIC_DRAW,
  target: number = gl.ARRAY_BUFFER,
): WebGLBuffer {
  const buffer = gl.createBuffer()

  if (!buffer) throw new Error("Unable to create WebGL buffer")

  gl.bindBuffer(target, buffer)

  gl.bufferData(target, data, usageHint)

  // Unbind
  gl.bindBuffer(target, null)

  return buffer
}

/**
 * @throws If unable to create vertex array
 */
export function createVAO(gl: WebGL2RenderingContext, attribute: number, size = 2): WebGLVertexArrayObject {
  const vao = gl.createVertexArray()

  if (!vao) throw new Error("Unable to create WebGL vertex array")

  gl.bindVertexArray(vao)

  gl.enableVertexAttribArray(attribute)

  gl.vertexAttribPointer(attribute, size, gl.FLOAT, false, 0, 0)

  // Unbind
  gl.bindVertexArray(null)

  return vao
}

/**
 * @throws If unable to create framebuffer
 */
export function createFramebuffer(gl: WebGL2RenderingContext, textures: WebGLTexture[]): WebGLFramebuffer {
  const fb = gl.createFramebuffer()

  if (!fb) throw new Error("Unable to create WebGL framebuffer")

  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)

  for (let i = 0; i < textures.length; i++) {
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, textures[i], 0)
  }

  const framebufferStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER)

  if (framebufferStatus !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`Framebuffer error: ${framebufferStatus}`)
  }

  // Unbind
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  return fb
}

export function setupProgramAttributesUniforms(
  gl: WebGL2RenderingContext,
  fragmentShaderString: string,
  vertexShaderString: string,
  attributeNames: string[],
  uniformNames: string[],
) {
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderString)
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderString)

  const program = createProgram(gl, vertexShader, fragmentShader)

  const attributes = getAttributeLocations(gl, program, attributeNames)

  const uniforms = getUniformLocations(gl, program, uniformNames)

  return { attributes, program, uniforms }
}
// grab pixel
// const format1 = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT)
// const type1 = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE)

// const pixelValues1 = new Uint16Array(4);

// gl.readPixels(0, 0, 1, 1, format1, type1, pixelValues1);

export function clipSumOfBoundingBoxes(
  gl: WebGL2RenderingContext,
  x1: number,
  y1: number,
  width1: number,
  height1: number,
  x2: number,
  y2: number,
  width2: number,
  height2: number,
) {
  const newX = Math.min(x1, x2)
  const newY = Math.min(y1, y2)

  const newUpperRightX = Math.max(x1 + width1, x2 + width2)
  const newUpperRightY = Math.max(y1 + height1, y2 + height2)

  const newWidth = newUpperRightX - newX
  const newHeight = newUpperRightY - newY

  gl.scissor(newX, newY, newWidth, newHeight)
}
