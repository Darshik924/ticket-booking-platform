import React from 'react'
import { Link, useParams } from 'react-router-dom'

function Venue({ setDisplayLayout, setformData, formRef }) {
  const { type } = useParams()

  const saveFormData = () => {
    const formData = new FormData(formRef?.current)
    const data = Object.fromEntries(formData.entries())
    setformData(data)
    console.log(data)
    setDisplayLayout('create')
  }

  return (
    <>

      <div className='m-1'>
        <label htmlFor="name" className='m-1'>Venue Name</label>
        <input type="text" id='name' name='name' placeholder='Enter Venue Name' className='pl-1 border rounded m-1' />
      </div>

      <div className='m-1'>
        <label htmlFor="address" className='m-1'>Venue Local Address</label>
        <input type="text" id='address' name='address' placeholder='Enter Venue Address' className='pl-1 border rounded m-1' />
      </div>

      <div className='m-1'>
        <label htmlFor="city" className='m-1'>Venue City</label>
        <input type="text" id='city' name='city' placeholder='Enter Venue City' className='pl-1 border rounded m-1' />
      </div>

      <div className='m-1'>
        <label htmlFor="state" className='m-1'>Venue State</label>
        <input type="text" id='state' name='state' placeholder='Enter Venue State' className='pl-1 border rounded m-1' />
      </div>

      <div className='m-1'>
        <label htmlFor="country" className='m-1'>Venue Country</label>
        <input type="text" id='country' name='country' placeholder='Enter Venue Country' className='pl-1 border rounded m-1' />
      </div>

      <div className='m-1'>
        <label htmlFor="pincode" className='m-1'>Venue Pincode</label>
        <input type="text" id='pincode' name='pincode' placeholder='Enter Venue Pincode' className='pl-1 border rounded m-1' />
      </div>

      <div className='m-1'>
        <button className='border rounded pl-1 pr-1 bg-[#072d4f] cursor-pointer' onClick={saveFormData}>Add Seat Layout</button>
      </div>

      {/* <div>
        {(type === "add") ?
          (
            <button className='m-3 border rounded pr-2 pl-2 cursor-pointer bg-[#074f07]'>Save</button>
          ) :
          (
            <button className='m-3 border rounded pr-2 pl-2 cursor-pointer bg-[#074f07]'>Edit</button>
          )
        }
      </div> */}

    </>
  )
}

export default Venue
