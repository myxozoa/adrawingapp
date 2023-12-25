export function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)

  if (!shader) throw new Error("Unable to create WebGL shader")

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS) as boolean

  if (success) {
    return shader
  }

  throw new Error("Shader Compile error: " + gl.getShaderInfoLog(shader))
  gl.deleteShader(shader)
}

export function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  const program = gl.createProgram()

  if (!program) throw new Error("Unable to create WebGL program")

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.validateProgram(program)

  const successLink = gl.getProgramParameter(program, gl.LINK_STATUS) as boolean
  const successValidation = gl.getProgramParameter(program, gl.VALIDATE_STATUS) as boolean

  if (successLink && successValidation) {
    return program
  }

  throw new Error("Program validation error: " + gl.getProgramInfoLog(program))
  gl.deleteProgram(program)
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

// export function createVAO(gl) {

//   return vao
// }

// grab pixel
// const format1 = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT)
// const type1 = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE)

// const pixelValues1 = new Uint16Array(4);

// gl.readPixels(0, 0, 1, 1, format1, type1, pixelValues1);

export default {
  createShader,
  createProgram,
  getUniformLocations,
  getAttributeLocations,
}
