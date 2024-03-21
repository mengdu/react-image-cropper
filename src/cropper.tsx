import { useEffect, useRef, useState } from 'react'

function getImageSize (src: string) {
  return new Promise<{width: number; height: number;}>((resolve, reject) => {
    const img = new Image()
    img.onload = function () {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height
      })
    }

    img.onerror = function (err) {
      reject(err)
    }

    img.src = src
  })
}

const useMouseMove = (fn: (ox: number, oy: number) => void, options: {
  mousedown?: () => void
  mouseup?: () => void
  preventDefault?: boolean
  stopPropagation?: boolean
}) => {
  return (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    options.mousedown && options.mousedown()
    if (options.preventDefault) e.preventDefault()
    if (options.stopPropagation) e.stopPropagation()

    const startX = e.clientX
    const startY = e.clientY
    
    const onMouseMove = (e: MouseEvent) => {
      const x = e.clientX - startX
      const y = e.clientY - startY
      fn(x, y)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove, false)
      document.removeEventListener('mouseup', onMouseUp, false)
      options.mouseup && options.mouseup()
    }

    document.addEventListener('mousemove', onMouseMove, false)
    document.addEventListener('mouseup', onMouseUp, false)
  }
}

export interface CropData {
  blob?: Blob | null
  vw: number
  vh: number
  area: {
    w: number
    h: number
    x: number
    y: number
  }
  img: {
    src: string
    rw: number
    rh: number
    w: number
    h: number
    x: number
    y: number
    scale: number
  }
}

export interface ImageCropperProps {
  src: string
  size?: {
    w: number
    h: number
  }
  fixedCropArea?: boolean
  className?: string
  style?: React.CSSProperties
  customCrop?: boolean
  onComplete?: (data: CropData) => void
}

export default function ImageCropper(props: ImageCropperProps) {
  const view = useRef<HTMLDivElement>(null)
  const imgEl = useRef<HTMLImageElement>(null)
  const areaEl = useRef<HTMLDivElement>(null)
  const [isMove, setIsMove] = useState(false)
  const [img, setImg] = useState({
    src: '',
    rw: 0,
    rh: 0,
    err: ''
  })
  const [area, setArea] = useState({
    w: props.size?.w || 100,
    h: props.size?.h || 100,
    x: 0,
    y: 0
  })
  const [transform, setTransform] = useState<{matrix: DOMMatrix | null;}>({
    matrix: null
  })
  const handleViewMouseDown = useMouseMove((x, y) => {
    const matrix = new DOMMatrix(transform.matrix?.toString())
    matrix.translateSelf(x / matrix.a, y / matrix.a)
    setTransform({
      ...transform,
      matrix,
    })
  }, {
    mousedown () {
      setIsMove(true)
    },
    mouseup () {
      setIsMove(false)
      onComplete()
    },
    preventDefault: true,
    stopPropagation: true
  })
  const handleAreaMouseDown = useMouseMove((x, y) => {
    if (props.fixedCropArea) return
    const rect = view.current?.getBoundingClientRect()
    x = area.x + x
    y = area.y + y

    if (x < 0) x = 0
    if (y < 0) y = 0
    if (rect) {
      if (rect.width < (x + area.w)) {
        x = rect.width - area.w
      }
      if (rect.height < (y + area.h)) {
        y = rect.height - area.h
      }
    }
    setArea({
      ...area,
      x: x,
      y: y
    })
  }, {
    mouseup () {
      onComplete()
    },
    preventDefault: true,
    stopPropagation: true
  })

  const onComplete = () => {
    if (!props.onComplete) return
    if (!view.current) return
    if (!imgEl.current) return
    if (!areaEl.current) return
    const vrect = view.current.getBoundingClientRect()
    const irect = imgEl.current.getBoundingClientRect()
    const arect = areaEl.current.getBoundingClientRect()
    const data: CropData = {
      vw: vrect.width,
      vh: vrect.height,
      area: {
        w: arect.width,
        h: arect.height,
        x: arect.left - vrect.left,
        y: arect.top - vrect.top
      },
      img: {
        src: img.src,
        rw: img.rw,
        rh: img.rh,
        w: irect.width,
        h: irect.height,
        x: irect.left - vrect.left,
        y: irect.top - vrect.top,
        scale: irect.width / img.rw
      }
    }
    if (props.customCrop) {
      props.onComplete(data)
      return
    }

    const target = document.createElement('canvas')
    target.width = data.area.w
    target.height = data.area.h
    const targetctx = target.getContext('2d')!
    targetctx.drawImage(imgEl.current,
      (data.area.x - data.img.x) / data.img.scale,
      (data.area.y - data.img.y) / data.img.scale,
      data.area.w / data.img.scale,
      data.area.h / data.img.scale,
      0, 0, data.area.w, data.area.h)
    target.toBlob((e) => {
      data.blob = e
      props.onComplete!(data)
    }, 'image/png', '1')
  }

  const onAnimationEnd = () => {
    onComplete()
  }

  const imgToCenter = () => {
    if (!view.current) return
    if (!img.src) return

    const vrect = view.current.getBoundingClientRect()
    const scale = Math.min((vrect.width - 20) / img.rw, (vrect.height - 20) / img.rh)
    const x = vrect.width / 2 - (img.rw / 2)
    const y = vrect.height / 2 - (img.rh / 2)
    const matrix = new DOMMatrix()
    // reset default
    matrix.translateSelf(0, 0)
    matrix.scaleSelf(1)
    // move img center to view center and scale
    matrix.translateSelf(x, y)
    matrix.scaleSelf(scale)
    setTransform({
      matrix
    })
  }

  const imgToScale1 = () => {
    if (!view.current) return
    if (!img.src) return

    const vrect = view.current.getBoundingClientRect()
    const x = vrect.width / 2 - (img.rw / 2)
    const y = vrect.height / 2 - (img.rh / 2)
    const matrix = new DOMMatrix()
    // reset default
    matrix.translateSelf(0, 0)
    matrix.scaleSelf(1)
    // move img center to view center
    matrix.translateSelf(x, y)
    setTransform({
      matrix
    })
  }

  const imgScaleTo = (v: number) => {
    const matrix = new DOMMatrix()
    matrix.e = transform.matrix?.e || 0
    matrix.f = transform.matrix?.f || 0
    matrix.scaleSelf(v)
    setTransform({
      matrix
    })
  }

  useEffect(() => {
    if (!view.current) return
    const target = view.current
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (!imgEl.current) return
      const direction = e.deltaY < 0 ? 'up' : 'down'
      const normalizedDeltaY = 1 + Math.abs(e.deltaY) / 200
      const scale = direction === 'up' ? normalizedDeltaY : 1 / normalizedDeltaY

      const matrix = new DOMMatrix(transform.matrix?.toString())
      const rect = imgEl.current.getBoundingClientRect()
      const ox = (e.clientX - rect.left - rect.width / 2) / matrix.a
      const oy = (e.clientY - rect.top - rect.height / 2) / matrix.a
      matrix.translateSelf(ox, oy)
      matrix.scaleSelf(scale)
      matrix.translateSelf(-ox, -oy)
      setTransform({
        ...transform,
        matrix
      })
      // onComplete()
    }
    target.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      target?.removeEventListener('wheel', handleWheel, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, transform])

  useEffect(() => {
    imgToCenter()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img])

  useEffect(() => {
    const data: {w: number; h: number; x?: number; y?: number} = {
      w: props.size?.w || 100,
      h: props.size?.h || 100,
    }
    if (view.current) {
      const vrect = view.current!.getBoundingClientRect()
      data.x = vrect.width / 2 - data.w / 2
      data.y = vrect.height / 2 - data.h / 2
    }
    setArea({
      ...area,
      ...data,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.size?.w, props.size?.h])

  useEffect(() => {
    getImageSize(props.src).then(res => {
      setImg({
        src: props.src,
        rw: res.width,
        rh: res.height,
        err: ''
      })
    }).catch((err: Error) => {
      setImg({
        ...img,
        err: err.message
      })
    })
    if (view.current) {
      const vrect = view.current!.getBoundingClientRect()
      setArea({
        ...area,
        x: vrect.width / 2 - area.w / 2,
        y: vrect.height / 2 - area.w / 2
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.src])
  const scale = Number(((transform.matrix ? transform.matrix.a : 1) * 100).toFixed(2))
  return (
    <div className={['cropper', props.className].filter(e => e).join(' ')} style={props.style}>
      <div
        className={['cropper-view', isMove ? 'is-move' : ''].filter(e => e).join(' ')}
        ref={view}
        onMouseDown={handleViewMouseDown}
        >
        <img 
          className="cropper-img"
          ref={imgEl}
          src={img.src}
          width={img.rw}
          height={img.rh}
          style={{
            transform: transform.matrix ? transform.matrix.toString() : ''
          }}
          onTransitionEnd={onAnimationEnd}/>
        <div
          className="cropper-area"
          ref={areaEl}
          style={{
            width: area.w + 'px',
            height: area.h + 'px',
            left: area.x + 'px',
            top: area.y + 'px',
          }}
          onMouseDown={handleAreaMouseDown}>
          <div className="ant ant-t"></div>
          <div className="ant ant-r"></div>
          <div className="ant ant-b"></div>
          <div className="ant ant-l"></div>
        </div>
        <div className="control-box">
          <button onClick={() => imgScaleTo((transform.matrix?.a || 1) + 0.1)} title='Zoom In'>+</button>
          <button onClick={() => imgScaleTo((transform.matrix?.a || 1) - 0.1)} title='Zoom Out'>-</button>
          <button onClick={imgToCenter} title='Overview'>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
            <path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm256-96a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"/>
            </svg>
          </button>
          <button onClick={() => imgScaleTo((transform.matrix?.a || 1) + 1)} style={{width: '50px'}} title="Scale">{scale}%</button>
          <button onClick={imgToScale1} title='1:1'>1:1</button>
        </div>
      </div>
    </div>
  )
}
