import React, { useState, useRef } from 'react'

function ImageUpload({ setImage }) {
  const urlRef = useRef(null)
  const fileRef = useRef(null)

  const handleUrlUpload = (e) => {
    setImage(e.target.value?.trim())
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImage(url?.trim())
      urlRef.current.value = file.name ? file.name : ''
    }
  }

  return (
    <div className='flex m-1'>
      <div className='m-1'>
        <label htmlFor="url-upload">Enter Image</label>
        <input type='text' placeholder='Enter Image URL or choose file' id='url-upload' ref={urlRef} onChange={handleUrlUpload} className='pl-1 ml-2 border border-white rounded' />
      </div>

      <div className='text-blue-400 m-1'> OR </div>

      <div className='cursor-pointer m-1'>
        <input type="file" id='file-upload' accept="image/*" onChange={handleFileUpload} ref={fileRef} className='cursor-pointer border border-white rounded bg-[#072d4f] w-22 pl-1' />
      </div>

      {urlRef.current?.value && (
        <button onClick={() => { setImage(null); urlRef.current.value = '' }} className='bg-[#7f1313] pl-1 pr-1 rounded ml-2 cursor-pointer'>Remove Image</button>
      )}
    </div>
  )
}

export default ImageUpload
