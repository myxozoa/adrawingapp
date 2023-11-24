export function getRelativeMousePos(canvas, mouseState) {
  const rect = canvas.getBoundingClientRect()
  const relativePosition = {
    x: mouseState.x - rect.left,
    y: mouseState.y - rect.top
  }

  return {
    inbounds: relativePosition.x >= 0 && relativePosition.y >= 0 && relativePosition.x <= rect.width && relativePosition.y <= rect.height,
    ...mouseState,
    ...relativePosition
  }
}

export function throttle(func, timeFrame = 200) {
  let lastTime = 0;
  return function () {
      const now = Date.now();
      if (now - lastTime >= timeFrame) {
          func();
          lastTime = now;
      }
  };
}

export function getDistance(point0, point1) {
  if (!point0 || !point1) return 0
  const a = point0.x - point1.x;
  const b = point0.y - point1.y;

  const c = Math.sqrt( a*a + b*b );

  return c
}

export function countPoints(elements) {
  let pointCount = 0

  elements.forEach(element => {
    pointCount += element.points.length
  })

  return pointCount
}

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
   ] : null;
}

export function componentToHex(c) {
  const hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

export function rgbToHex(color) {
  return "#" + componentToHex(color[0]) + componentToHex(color[1]) + componentToHex(color[2]);
}