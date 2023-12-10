import { useReducer, useRef, useEffect, MutableRefObject } from 'react'

import './styles.css'

import { getRelativeMousePos, initializeCanvas, degreesToRadians, radiansToDegrees, scaleNumberToRange, HSVtoRGB, RGBtoHSV, getDistance } from '../../utils'

import { COLOR_PICKER_ACTIONS } from '../../constants'
import { ColorArray } from '../../types'


// TODO: Maybe an SVG Version would be better than canvas?

function getHSV(value: ColorArray) {  
  const { h, s, v } = RGBtoHSV(value[0], value[1], value[2])

  // TODO: Get rid of the value inversion here
  return { hue: h * 360, saturation: s * 100, value: 100 - (v * 100) }
}

function getDimensions(context: CanvasRenderingContext2D, hsvState: HSV) {
  const rect = context.canvas.getBoundingClientRect()

  const canvasWidth = rect.width
  const canvasHeight = rect.height
  
  const radius = (canvasWidth / 2)
  
  const circleTrackSelectorInnerWidth = radius * 0.8
  
  const circleTrackSelectorWidth = radius - circleTrackSelectorInnerWidth
  const hueIndicatorTrack = radius - (circleTrackSelectorWidth / 2)
  
  const hueIndicatorX = hueIndicatorTrack + hueIndicatorTrack * Math.cos(degreesToRadians(hsvState.hue)) + (circleTrackSelectorWidth / 2)
  const hueIndicatorY = hueIndicatorTrack + hueIndicatorTrack * Math.sin(degreesToRadians(hsvState.hue))+ (circleTrackSelectorWidth / 2)

  const indicatorSize = (circleTrackSelectorWidth * 0.8) / 2
  const indicatorLineWidth = 2
    
  const svBoxWidth = circleTrackSelectorInnerWidth * 1.2
  
  const svBoxX = (canvasWidth / 2) - (svBoxWidth / 2)
  const svBoxY = (canvasHeight / 2) - (svBoxWidth / 2)

  const saturation = scaleNumberToRange(hsvState.saturation, 0, 100, 0, svBoxWidth)
  const value = scaleNumberToRange(hsvState.value, 0, 100, 0, svBoxWidth)

  const svIndicatorX = saturation + svBoxX
  const svIndicatorY = value + svBoxY

  return {
    canvasWidth,
    canvasHeight,
    radius,
    circleTrackSelectorInnerWidth,
    circleTrackSelectorWidth,
    hueIndicatorTrack,
    indicatorSize,
    indicatorLineWidth,
    hueIndicatorX,
    hueIndicatorY,
    svBoxWidth,
    svBoxX,
    svBoxY,
    svIndicatorX,
    svIndicatorY
  }
}


const drawSVPanel = (context: CanvasRenderingContext2D, hsvState: HSV) => {
  const {
    svBoxX,
    svBoxY,
    svBoxWidth,
  } = getDimensions(context, hsvState)

  context.save()
  // Saturation and Value Panel Drawing
  context.clearRect(svBoxX, svBoxY, svBoxWidth, svBoxWidth)

  const brightnessGradient = context.createLinearGradient(svBoxX, svBoxY, svBoxX, svBoxWidth + svBoxY)
  brightnessGradient.addColorStop(0, "white")
  brightnessGradient.addColorStop(1, "black")

  const saturationGradient = context.createLinearGradient(svBoxX, svBoxY, svBoxWidth + svBoxX, svBoxY)
  saturationGradient.addColorStop(0, "hsla(" + hsvState.hue + ", 100%, 50%, 0.0)")
  saturationGradient.addColorStop(1, "hsla(" + hsvState.hue + ", 100%, 50%, 1.0)")

  context.fillStyle = brightnessGradient
  context.fillRect(svBoxX, svBoxY, svBoxWidth, svBoxWidth)

  context.fillStyle = saturationGradient
  context.globalCompositeOperation = "multiply"
  context.fillRect(svBoxX, svBoxY, svBoxWidth, svBoxWidth)
  context.restore()
}

const drawSVIndicator = (context: CanvasRenderingContext2D, hsvState: HSV) => {
  const {
    svIndicatorY,
    svIndicatorX,
    indicatorSize
  } = getDimensions(context, hsvState)

  // Saturation and Value Indicator Drawing
  context.beginPath()
  context.arc(svIndicatorX, svIndicatorY, indicatorSize, 0, Math.PI * 2, true)
  context.closePath()
  context.stroke()
}

const drawHueIndicator = (context: CanvasRenderingContext2D, hsvState: HSV) => {
  const {
    canvasHeight,
    canvasWidth,
    indicatorLineWidth,
    hueIndicatorX,
    hueIndicatorY,
    indicatorSize
  } = getDimensions(context, hsvState)

  context.save()
  // Hue Ring Indicator Drawing
  context.clearRect(0, 0, canvasWidth, canvasHeight)

  context.fillStyle = 'black'
  context.strokeStyle = 'rgb(255, 255, 255)'
  context.lineWidth = indicatorLineWidth
  context.beginPath()
  context.arc(hueIndicatorX, hueIndicatorY, indicatorSize, 0, Math.PI * 2, true)
  context.closePath()
  context.stroke()
  context.save()
}

const drawHueRing = (context: CanvasRenderingContext2D, hsvState: HSV) => {
  const { radius, circleTrackSelectorInnerWidth, canvasWidth, canvasHeight } = getDimensions(context, hsvState)
  const step = 1 / radius
  
  context.save()
  context.clearRect(0, 0, canvasWidth, canvasHeight)
  
  // Drawing One Line Per Hue from Center Outward for Hue Ring
  for(let i = 0; i < 360; i += step) {
    const angle = degreesToRadians(i)
    context.strokeStyle = `hsl(${i}, 100%, 50%)`
    context.beginPath()
    context.moveTo(radius, radius)
    context.lineTo(radius + radius * Math.cos(angle), radius + radius * Math.sin(angle))
    context.stroke()
  }

  // Drawing Inside Circle
  context.fillStyle = '#333333'
  context.beginPath()
  context.arc(radius, radius, circleTrackSelectorInnerWidth, 0, Math.PI * 2, true)
  context.closePath()
  context.fill()


  // Outside Hue Ring Stroke Drawing
  context.strokeStyle = '#333333'
  context.lineWidth = 2
  context.beginPath()
  context.arc(radius, radius, radius + 1, 0, Math.PI * 2, true)
  context.stroke()
  context.restore()
}

// TODO: make these types actually work
interface HSV { hue: number; saturation: number; value: number }

interface hue { type: COLOR_PICKER_ACTIONS.SET_HUE; data: Partial<HSV> }
interface sat { type: COLOR_PICKER_ACTIONS.SET_SAT_VAL; data: Partial<HSV> }
interface val { type: COLOR_PICKER_ACTIONS.SET_HUE_SAT_VAL; data: Partial<HSV> }

type HSVAction = hue | sat | val

function hsvReducer(state: HSV, action: HSVAction): HSV {
  switch(action.type) {
    case COLOR_PICKER_ACTIONS.SET_HUE:
      return { ...state, hue: action.data.hue! }
    case COLOR_PICKER_ACTIONS.SET_SAT_VAL:
      return { ...state, saturation: action.data.saturation!, value: action.data.value! }
    case COLOR_PICKER_ACTIONS.SET_HUE_SAT_VAL:
      return { ...state, hue: action.data.hue!, saturation: action.data.saturation!, value: action.data.value! }
  }

  throw new Error("Unknown HSV Reducer Action")
}

function ColorPicker({ size, value, onChange }: { size: number, value: ColorArray, onChange: (event: ColorArray) => void }) {
  const pickerRef = useRef() as MutableRefObject<HTMLCanvasElement>
  const indicatorRef = useRef() as MutableRefObject<HTMLCanvasElement>

  const selectingHue = useRef(false)
  const selectingSV = useRef(false)

  const [hsvState, hsvDispatch] = useReducer(hsvReducer, getHSV(value))
  
  useEffect(() => {
    initializeCanvas(pickerRef.current, size, size, true)
    initializeCanvas(indicatorRef.current, size, size, true)

    window.addEventListener("pointermove", mouseMove)
    window.addEventListener("pointerup", mouseUp)

    return () => {
      window.removeEventListener("pointermove", mouseMove)
      window.removeEventListener("pointerup", mouseUp)
    }
  }, [])

  // Sync Local State with Outer State
  useEffect(() => {
    const hsv = getHSV(value)

    hsvDispatch({ type: COLOR_PICKER_ACTIONS.SET_HUE_SAT_VAL, data: hsv })
  }, [])

  // Sync Outer State with Local State
  useEffect(() => {
    const saturationPercentage = hsvState.saturation / 100
    const valuePercentage = hsvState.value / 100
  
    const { r, g, b } = HSVtoRGB(hsvState.hue / 360, saturationPercentage, 1 - valuePercentage)

    onChange([r, g, b])
  }, [hsvState])

  const selectHue = (event: PointerEvent | React.PointerEvent<HTMLCanvasElement>) => {
    const {x: relativeX, y: relativeY} = getRelativeMousePos(indicatorRef.current, { x: event.clientX, y: event.clientY })

    const centerX = (indicatorRef.current.width / 2) * window.devicePixelRatio
    const centerY = (indicatorRef.current.height / 2) * window.devicePixelRatio
    const angle = Math.atan2(relativeY - centerY, relativeX - centerX);

    let angleDegrees = radiansToDegrees(angle)

    // Ensure angle goes from 0...360 rather than -180...180
    angleDegrees = (angleDegrees + 360) % 360

    hsvDispatch({ type: COLOR_PICKER_ACTIONS.SET_HUE, data: { hue: angleDegrees } })
  }

  const selectSaturationValue = (event: PointerEvent | React.PointerEvent<HTMLCanvasElement>) => {
    const {x: relativeX, y: relativeY} = getRelativeMousePos(indicatorRef.current, { x: event.clientX, y: event.clientY })
    
    const indicatorContext = indicatorRef.current.getContext('2d') as CanvasRenderingContext2D

    const {
      svBoxWidth,
      svBoxX,
      svBoxY
    } = getDimensions(indicatorContext, hsvState)

    const relativePosition = {
      x: (relativeX * window.devicePixelRatio) - svBoxX * window.devicePixelRatio,
      y: (relativeY * window.devicePixelRatio) - svBoxY * window.devicePixelRatio
    }

    const saturation = scaleNumberToRange(relativePosition.x, 0, svBoxWidth, 0, 100)
    const value = scaleNumberToRange(relativePosition.y, 0, svBoxWidth, 0, 100)

    hsvDispatch({ type: COLOR_PICKER_ACTIONS.SET_SAT_VAL, data: { saturation, value }})

  }

  const mouseDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if(selectingHue.current || selectingSV.current) return
  
    const indicatorContext = indicatorRef.current.getContext('2d') as CanvasRenderingContext2D

    const {
      circleTrackSelectorInnerWidth,
      radius
    } = getDimensions(indicatorContext, hsvState)

    const {x, y} = getRelativeMousePos(indicatorRef.current, { x: event.clientX, y: event.clientY })

    // Setting Saturation/Value if click landed on inside circle for more forgiving target
    if (getDistance({ x, y }, { x: radius, y: radius }) <= circleTrackSelectorInnerWidth) {
      selectingSV.current = true
      selectSaturationValue(event)
    } else {
      selectingHue.current = true
      selectHue(event)
    }
  }

  const mouseMove = (event: PointerEvent) => {
    if(selectingHue.current) selectHue(event)
    else if(selectingSV.current) selectSaturationValue(event)
  }

  const mouseUp = () => {
    selectingHue.current = false
    selectingSV.current = false
  }

  // Draw Hue Ring
  useEffect(() => {
    const context = pickerRef.current.getContext('2d') as CanvasRenderingContext2D

    drawHueRing(context, hsvState)
  }, [])

  // Draw Saturation/Value Box and Indicators
  useEffect(() => {
    const pickerContext = pickerRef.current.getContext('2d') as CanvasRenderingContext2D
    const indicatorContext = indicatorRef.current.getContext('2d') as CanvasRenderingContext2D
      
      drawHueIndicator(indicatorContext, hsvState)
  
      drawSVPanel(pickerContext, hsvState)
  
      drawSVIndicator(indicatorContext, hsvState)
    }, [hsvState.hue, hsvState.saturation, hsvState.value])

  return (
    <div className='color-picker-container' style={{ width: `${size}px`, height: `${size}px` }}>
      <canvas width={size} height={size} className="color-picker-indicator-canvas" ref={indicatorRef} onPointerDown={(e) => mouseDown(e)} />
      <canvas width={size} height={size} className='color-picker-canvas' ref={pickerRef} />
    </div>
  )
}

export default ColorPicker
