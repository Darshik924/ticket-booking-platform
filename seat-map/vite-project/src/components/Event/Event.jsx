import React, { useEffect, useState, useRef } from 'react'
import ImageUpload from '../ImageUpload/ImageUpload'
import { Link, useParams } from 'react-router-dom'
import Venue from '../Venue/Venue.jsx'
import axios from 'axios'
import LayoutCreate from '../LayoutCreate/LayoutCreate.jsx'

function Event() {
  const fileRef = useRef(null)
  const [fileName, setFileName] = useState(null)
  const { type } = useParams()
  const venues = useRef([])
  const event = useRef(null)
  const [displayVenue, setDisplayVenue] = useState(false)
  const [displayLayout, setDisplayLayout] = useState(false)
  const [existingVenues, setExistingVenues] = useState([])
  const [formData, setformData] = useState(null);
  const formRef = useRef(null)

  const getExistingVenues = async () => {
    const URL = 'http://localhost:5000/api/admin/getAllVenues'

    try {
      const response = await axios.get(URL)
      venues.current = response.data
    } catch (error) {
      console.error(error)
    }
  }

  const getEventDetails = async (id) => {
    const URL = `http://localhost:5000/api/admin/getEvent/${id}`

    try {
      const response = await axios.get(URL)
      event.current = response.data
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

  const addEventDetails = async () => {

  }
  // useEffect(() => {
  //   getExistingVenues()
  //   if (type !== 'add') {
  //     getEventDetails(type)
  //   }
  // }, [])

  return (
    <>
      {(!displayLayout) ? (
        <div className='pl-1'>
          <form action="post" ref={formRef} onSubmit={(e) => { e.preventDefault() }}>
            <div className='m-1'>
              <label htmlFor="title" className='m-1'>Event Title</label>
              <input type="text" id='title' name='title' placeholder='Enter Event Title' className='pl-1 border rounded m-1' />
            </div>

            <div className='m-1'>
              <label htmlFor="description" className='m-1' defaultValue={(event.current?.description) ? event.current.description : ''}>Event Description</label>
              <input type="text" id='description' name='description' placeholder='Enter Event Description' className='pl-1 border rounded m-1' />
            </div>

            <div className='m-1'>
              <label htmlFor="tags" className='m-1'>Event Tags</label>
              <input type="text" id='tags' name='tags' placeholder='e.g. Music, Sports, Comedy' className='pl-1 border rounded m-1' />
            </div>

            <div className='m-1'>
              <label htmlFor="category" className='m-1'>Event Category</label>
              <select name="category" id='category' className='pl-1 border rounded m-1'>
                <option value="sport">Sport</option>
                <option value="concert">Concert</option>
                <option value="movie">Movie</option>
                <option value="show">Show</option>
              </select>
            </div>

            <div className='m-1'>
              <label htmlFor="file-upload" className='m-1'>Event Logo</label>
              <input type="file" id='file-upload' name='eventLogo' accept="image/*" onChange={handleEventLogo} ref={fileRef} className='cursor-pointer border border-white rounded bg-[#072d4f] pl-1 w-22' />
              {fileName && (
                <span className='pl-2'>{fileName}</span>
              )}
            </div>

            <div className='m-1'>
              <label htmlFor="startDate" className='m-1'>Event Start Date</label>
              <input type="datetime-local" id='startDate' name='startDate' className='pl-1 border rounded m-1' />
            </div>

            <div className='m-1'>
              <label htmlFor="endDate" className='m-1'>Event End Date (Optional)</label>
              <input type="datetime-local" id='endDate' name='endDate' className='pl-1 border rounded m-1' />
            </div>

            <div className='m-1'>
              <label htmlFor="duration" className='m-1'>Event Duration (Optional)</label>
              <input type="time" id='duration' name='duration' className='pl-1 border rounded m-1' />
            </div>

            <div className='m-1'>
              <label htmlFor="ageLimit" className='m-1'>Age Limit</label>
              <input type="Number" min={1} max={18} defaultValue={18} id='ageLimit' name='ageLimit' className='pl-1 border rounded m-1' />
            </div>

            <div className='flex'>
              <button className='border rounded m-1 cursor-pointer pl-1 pr-1 bg-[#072d4f]' onClick={() => { setDisplayVenue(true) }}>Add Venue</button>
              <div className='text-blue-400 m-1'> OR </div>

              <label htmlFor="venuechoose" className='m-1'>Choose from Existing</label>
              <select name="venue" id="venuechoose" className='pl-1 border rounded m-1 cursor-pointer '>
                <option value="">-- Choose a Venue --</option>
                {!(existingVenues.length) && (
                  <option value={'none'}>No Existing Venue</option>
                )}
                {existingVenues.map((element, index) => {
                  return (
                    <option value={element.id}>{`${element.name}, ${element.address}, ${element.city}, ${element.state}, ${element.country}, ${element.pincode}`}</option>
                  )
                })}
              </select>
            </div>

            {displayVenue &&
              (<Venue setDisplayLayout={setDisplayLayout} setformData={setformData} formRef={formRef} />)
            }
          </form>
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
        </div>
      ) :
        (
          <LayoutCreate setDisplayLayout={setDisplayLayout} setformData={setformData} />
        )
      }
    </>
  )
}

export default Event
