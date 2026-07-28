import React, { useEffect, useState, useRef, Fragment } from 'react'
import ImageUpload from '../ImageUpload/ImageUpload'
import { Link, useParams } from 'react-router-dom'
import Venue from '../Venue/Venue.jsx'
import axios from 'axios'
import LayoutCreate from '../LayoutCreate/LayoutCreate.jsx'
import LayoutDisplay from '../LayoutDisplay/LayoutDisplay.jsx'

function Event() {
  const fileRef = useRef(null)
  const [fileName, setFileName] = useState(null)
  const { type } = useParams()
  const [event, setEvent] = useState(null)
  const [displayVenue, setDisplayVenue] = useState(false)
  const [displayLayout, setDisplayLayout] = useState('none')
  const [existingVenues, setExistingVenues] = useState([])
  const [formData, setformData] = useState(null);
  const formRef = useRef(null)
  const [venueId, setVenueId] = useState(null)
  const [defaultVenue, setDefaultVenue] = useState('')

  const getExistingVenues = async () => {
    const URL = 'http://localhost:5000/api/events/venues'

    try {
      const response = await axios.get(URL)
      setExistingVenues(response.data.venues)
      console.log(response)
    } catch (error) {
      console.error(error)
    }
  }

  const getEventDetails = async (id) => {
    const URL = `http://localhost:5000/api/events/${id}`

    try {
      const response = await axios.get(URL)
      setEvent(response.data.event)
      if (response.data.event) {
        existingVenues.map((element, index) => {
          if (element.id === response.data.event.venueId) {
            setDefaultVenue(
              `${element.name}, ${element.address}, ${element.city}, ${element.state}, ${element.country}, ${element.pincode}`
            )
          }
        })
      } else {
        setDefaultVenue('')
      }
      console.log(response.data)
    } catch (error) {
      console.error(error)
    }
  }

  const handleEventLogo = (e) => {
    const file = e.target.files[0]
    if (file?.name) {
      setFileName(file.name)
    } else {
      setFileName(null)
    }
  }

  const handleVenueSelection = (e) => {
    if (e.target.value) {
      setDefaultVenue(e.target.value)
      setVenueId(e.target.value)
      setDisplayLayout('display')
      const formData = new FormData(formRef?.current)
      let data = Object.fromEntries(formData.entries())
      data.venueId = parseInt(data.venueId)
      setformData(data)
      console.log(data)
    }
  }


  const addEventDetails = async () => {

  }

  useEffect(() => {
    getExistingVenues()
    if (type !== 'add') {
      getEventDetails(type)
    }
  }, [])

  const deleteEvent = async () => {
    try {
      const response = await axios.delete(`http://localhost:5000/api/events/${type}`)
      alert('The Event is deleted successfully')
      console.log(response)
    } catch (error) {
      console.error(error)
    }
  }

  const updateEvent = async () => {
    const formData = new FormData(formRef?.current)
    let data = Object.fromEntries(formData.entries())
    console.log(event)
    data.venueId = event.venueId ? event.venueId : null
    console.log({ ...event, ...data })

    try {
      const response = await axios.delete(`http://localhost:5000/api/events/${type}`)
      const update = await axios.post('http://localhost:5000/api/events', { ...event, ...data })
      alert('Event data is updated')
    } catch (error) {
      console.error(error)
    }

  }


  return (
    <>
      {(displayLayout === 'none') ? (
        <div className='pl-1'>
          <form action="post" ref={formRef} onSubmit={(e) => { e.preventDefault() }}>
            <div className='m-1'>
              <label htmlFor="title" className='m-1'>Event Title</label>
              <input type="text" id='title' name='title' placeholder='Enter Event Title' className='pl-1 border rounded m-1' required defaultValue={(event?.title) ? event.title : ''} />
            </div>

            <div className='m-1'>
              <label htmlFor="description" className='m-1' >Event Description</label>
              <input type="text" id='description' name='description' defaultValue={(event?.description) ? event.description : ''} placeholder='Enter Event Description' className='pl-1 border rounded m-1' />
            </div>

            <div className='m-1'>
              <label htmlFor="tags" className='m-1'>Event Tags</label>
              <input type="text" id='tags' name='tag' placeholder='e.g. Music, Sports, Comedy' className='pl-1 border rounded m-1' defaultValue={(event?.tag) ? event.tag : ''} />
            </div>

            <div className='m-1'>
              <label htmlFor="category" className='m-1'>Event Category</label>
              <select name="category" id='category' className='pl-1 border rounded m-1' defaultValue={(event?.category) ? event.category : ''}>
                <option value="sport">Sport</option>
                <option value="concert">Concert</option>
                <option value="movie">Movie</option>
                <option value="show">Show</option>
              </select>
            </div>

            <div className='m-1'>
              <label htmlFor="file-upload" className='m-1'>Event Logo</label>
              <input type="file" id='file-upload' accept="image/*" onChange={handleEventLogo} ref={fileRef} className='cursor-pointer border border-white rounded bg-[#072d4f] pl-1 w-22' />
              {fileName && (
                <span className='pl-2'>{fileName}</span>
              )}
            </div>

            <div className='m-1'>
              <label htmlFor="startDate" className='m-1'>Event Start Date</label>
              <input type="datetime-local" id='startDate' name='startDate' className='pl-1 border rounded m-1' defaultValue={(event?.startDate) ? event.startDate.slice(0, 16) : ''} />
            </div>

            <div className='m-1'>
              <label htmlFor="endDate" className='m-1'>Event End Date (Optional)</label>
              <input type="datetime-local" id='endDate' name='endDate' className='pl-1 border rounded m-1' defaultValue={(event?.endDate) ? event.endDate.slice(0, 16) : ''} />
            </div>

            <div className='m-1'>
              <label htmlFor="duration" className='m-1'>Event Duration (Optional)</label>
              <input type="time" id='duration' name='duration' className='pl-1 border rounded m-1' defaultValue={(event?.duration) ? event.duration : ''} />
            </div>

            <div className='m-1'>
              <label htmlFor="ageLimit" className='m-1'>Age Limit</label>
              <input type="Number" min={1} max={18} defaultValue={(event?.description) ? event.description : 18} id='ageLimit' name='ageLimit' className='pl-1 border rounded m-1' />
            </div>

            {type === 'add' && (
              <div className='flex'>
                <button className='border rounded m-1 cursor-pointer pl-1 pr-1 bg-[#072d4f]' onClick={() => { setDisplayVenue(true) }}>Add Venue</button>
                <div className='text-blue-400 m-1'> OR </div>

                <label htmlFor="venuechoose" className='m-1'>Choose from Existing</label>
                <select name="venueId" id="venuechoose" className='pl-1 border rounded m-1 cursor-pointer ' onChange={handleVenueSelection} value={defaultVenue}>
                  <option value=''>-- Choose a Venue --</option>
                  {!(existingVenues.length) && (
                    <option value=''>No Existing Venue</option>
                  )}
                  {existingVenues.map((element, index) => {
                    return (
                      <option value={element.id} className='cursor-pointer' key={index}>{`${element.name}, ${element.address}, ${element.city}, ${element.state}, ${element.country}, ${element.pincode}`}</option>
                    )
                  })}
                </select>
              </div>
            )}

            {displayVenue &&
              (<Venue setDisplayLayout={setDisplayLayout} setformData={setformData} formRef={formRef} />)
            }
          </form>
          <div>
            {(type !== "add") &&
              (
                <div className='flex'>
                  <button className='m-2 border rounded pr-2 pl-2 cursor-pointer bg-[#074f07]' onClick={updateEvent}>Save</button>
                  <Link to={'/'} className='m-2 border rounded pr-2 pl-2 cursor-pointer bg-[#990e0e]' onClick={deleteEvent}>Deleted Event</Link>
                </div>
              )
            }
          </div>
        </div>
      ) :
        (
          <Fragment>
            {(displayLayout === 'create') ? (
              <LayoutCreate setDisplayLayout={setDisplayLayout} formData={formData} />
            ) :
              (
                <LayoutDisplay setDisplayLayout={setDisplayLayout} formData={formData} venueId={venueId} />
              )
            }
          </Fragment>
        )
      }
    </>
  )
}

export default Event
