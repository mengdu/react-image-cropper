# react-image-cropper

A image cropper component for React

[Live Demo](https://mengdu.github.io/react-image-cropper/)

## Usage

```sh
npm install @lanyue/react-image-cropper
```

```jsx
import { useState } from 'react'
import { ColorPicker } from '@lanyue/react-image-cropper'
import '@lanyue/react-image-cropper/dist/style.css'

export default function App() {
  const [img, setImg] = useState('/demo.png')
  const [blob, setBlob] = useState<Blob | null>()
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (!/^image\/.+$/.test(file.type)) return
    setImg(URL.createObjectURL(file))
  }
  return (
    <>
      <input type="file" onChange={handleFile} />
      <ImageCropper
        src={img}
        size={{w: 128, h: 128}}
        style={{width: '300px', height: '300px'}}
        onComplete={e => setBlob(e.blob)}
      />
      {blob && <img src={URL.createObjectURL(blob)} alt="" />}
    </>
  )
}
```
