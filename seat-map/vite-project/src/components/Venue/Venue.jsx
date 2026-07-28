import React from 'react'
import { Link, useParams } from 'react-router-dom'

function Venue({ setDisplayLayout, setformData, formRef }) {
  const { type } = useParams()
  // const [layout, setLayout] = useState(false)

  const saveFormData = () => {
    const formData = new FormData(formRef?.current)
    let data = Object.fromEntries(formData.entries())
    data.venueId = null
    setformData(data)
    console.log(data)
    setDisplayLayout('create')
  }

  return (
    <>

      <div className='m-1'>
        <label htmlFor="venueName" className='m-1'>Venue Name</label>
        <input type="text" id='venueName' name='venueName' placeholder='Enter Venue Name' className='pl-1 border rounded m-1' />
      </div>

      <div className='m-1'>
        <label htmlFor="venueAddress" className='m-1'>Venue Local Address</label>
        <input type="text" id='venueAddress' name='venueAddress' placeholder='Enter Venue Address' className='pl-1 border rounded m-1' />
      </div>

      <div className='m-1'>
        <label htmlFor="venueCity" className='m-1'>Venue City</label>
        <input type="text" id='venueCity' name='venueCity' placeholder='Enter Venue City' className='pl-1 border rounded m-1' />
      </div>

      <div className='m-1'>
        <label htmlFor="venueState" className='m-1'>Venue State</label>
        <input type="text" id='venueState' name='venueState' placeholder='Enter Venue State' className='pl-1 border rounded m-1' />
      </div>

      <div className='m-1'>
        <label htmlFor="venueCountry" className='m-1'>Venue Country</label>
        <input type="text" id='venueCountry' name='venueCountry' placeholder='Enter Venue Country' className='pl-1 border rounded m-1' />
      </div>

      <div className='m-1'>
        <label htmlFor="venuePincode" className='m-1'>Venue Pincode</label>
        <input type="text" id='venuePincode' name='venuePincode' placeholder='Enter Venue Pincode' className='pl-1 border rounded m-1' />
      </div>

      <div className='m-1'>
        <button className='border rounded pl-1 pr-1 bg-[#072d4f] cursor-pointer' onClick={saveFormData}>Add Seat Layout</button>
      </div>

      {}
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
