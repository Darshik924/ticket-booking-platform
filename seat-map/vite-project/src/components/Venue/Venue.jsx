import React, { Fragment, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LayoutCreate from '../LayoutCreate/LayoutCreate'
import axios from 'axios'

function Venue({ setDisplayLayout, setformData, formRef }) {
  const navigate = useNavigate()
  const { type } = useParams()
  const [venue, setVenue] = useState(null)
  const [Name, setName] = useState('')
  const [Address, setAddress] = useState('')
  const [City, setCity] = useState('')
  const [State, setState] = useState('')
  const [Country, setCountry] = useState('')
  const [Pincode, setPincode] = useState('')
  const [showLayout, setShowLayout] = useState(false)

  const saveFormData = () => {
    console.log(type)
    if(formRef) {
    const formData = new FormData(formRef?.current)
    let data = Object.fromEntries(formData.entries())
    data.venueId = null
    setformData(data)
    console.log(data)
    setDisplayLayout('create')
  }else if (type === 'add') {
    let venueDetail = {
      venueName: Name,
      venueAddress: Address,
      venueState: State,
      venueCity: City,
      venueCountry: Country,
      venuePincode: Pincode
    }
    setVenue(venueDetail)
    setShowLayout(true)

  } else if (parseInt(type)) {
    if (venue) {
      let newVenue = { ...venue }
      newVenue.name = Name || newVenue.name
      newVenue.address = Address || newVenue.address
      newVenue.state = State || newVenue.state
      newVenue.city = City || newVenue.city
      newVenue.country = Country || newVenue.country
      newVenue.pincode = Pincode || newVenue.pincode
      console.log(newVenue)
      axios.put(`http://localhost:5000/api/events/venue`, { venue: newVenue })
        .then((response) => {
          console.log(response)
          navigate(`/layoutCreate/${newVenue.id}`)
        })
    }
  }
}
useEffect(() => {
  if (parseInt(type)) {
    axios.get(`http://localhost:5000/api/events/venue/${type}`)
      .then((response) => {
        setVenue(response.data.venue)
        console.log(response.data)
      })
  }
}, [])

const deleteVenue = async()=>{
  
}

return (
  <>
    {(!showLayout) ? (
      <Fragment>
        <div className='m-1'>
          <label htmlFor="venueName" className='m-1'>Venue Name</label>
          <input type="text" id='venueName' name='venueName' placeholder='Enter Venue Name' className='pl-1 border rounded m-1' defaultValue={venue?.name ? venue?.name : ''} onChange={(e) => { setName(e.target.value) }} />
        </div>

        <div className='m-1'>
          <label htmlFor="venueAddress" className='m-1'>Venue Local Address</label>
          <input type="text" id='venueAddress' name='venueAddress' placeholder='Enter Venue Address' className='pl-1 border rounded m-1' defaultValue={venue?.address ? venue?.address : ''} onChange={(e) => { setAddress(e.target.value) }} />
        </div>

        <div className='m-1'>
          <label htmlFor="venueCity" className='m-1'>Venue City</label>
          <input type="text" id='venueCity' name='venueCity' placeholder='Enter Venue City' className='pl-1 border rounded m-1' defaultValue={venue?.city ? venue?.city : ''} onChange={(e) => { setCity(e.target.value) }} />
        </div>

        <div className='m-1'>
          <label htmlFor="venueState" className='m-1'>Venue State</label>
          <input type="text" id='venueState' name='venueState' placeholder='Enter Venue State' className='pl-1 border rounded m-1' defaultValue={venue?.state ? venue?.state : ''} onChange={(e) => { setState(e.target.value) }} />
        </div>

        <div className='m-1'>
          <label htmlFor="venueCountry" className='m-1'>Venue Country</label>
          <input type="text" id='venueCountry' name='venueCountry' placeholder='Enter Venue Country' className='pl-1 border rounded m-1' defaultValue={venue?.country ? venue?.country : ''} onChange={(e) => { setCountry(e.target.value) }} />
        </div>

        <div className='m-1'>
          <label htmlFor="venuePincode" className='m-1'>Venue Pincode</label>
          <input type="text" id='venuePincode' name='venuePincode' placeholder='Enter Venue Pincode' className='pl-1 border rounded m-1' defaultValue={venue?.pincode ? venue?.pincode : ''} onChange={(e) => { setPincode(e.target.value) }} />
        </div>

        <div className='m-1 flex gap-3'>
          <button className='border rounded pl-1 pr-1 bg-[#072d4f] cursor-pointer' onClick={saveFormData}>Add Seat Layout</button>
          {!formRef && (
            <button className='border rounded pl-1 pr-1 bg-[#931010] cursor-pointer' onClick={deleteVenue}>Delete Venue</button>
          )}
        </div>
      </Fragment>

    ) : (
      <LayoutCreate venueDetail={venue} />
    )
    }

  </>
)
}

export default Venue
