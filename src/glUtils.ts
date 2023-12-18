export function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)

  if (success) {
    return shader
  }
 
  throw new Error(gl.getShaderInfoLog(shader))
  gl.deleteShader(shader)
}

export function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  const program = gl.createProgram()

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.validateProgram(program)
  
  const successLink = gl.getProgramParameter(program, gl.LINK_STATUS)
  const successValidation = gl.getProgramParameter(program, gl.VALIDATE_STATUS)

  if (successLink && successValidation) {
    return program
  }

 
  throw new Error(gl.getProgramInfoLog(program))
  gl.deleteProgram(program)
}

// export function initializeGL(gl: WebGL2RenderingContext) {
  
// }

export function getUniformLocations(gl, program, list: string[]) {
  const uniforms = {}

  for (const uniform of list) {
    uniforms[uniform] = gl.getUniformLocation(program, uniform)
  }

  return uniforms
}

export function getAttributeLocations(gl: WebGL2RenderingContext, program: WebGLProgram, list: string[]) {
  const attributes = {}

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
  getAttributeLocations
}