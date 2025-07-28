import React, { useContext } from 'react'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'
import { Link } from 'react-router-dom'

const CourseCard = ({ course }) => {
  const { currency, calculateRating } = useContext(AppContext)

  // Safety check to prevent rendering if course data is incomplete
  if (!course || !course._id || !course.courseTitle) {
    return null;
  }

  return (
    <Link to={'/course/' + course._id} onClick={() => scrollTo(0, 0)}
      className='border border-gray-500/30 pb-6 overflow-hidden rounded-lg'>
      <img className='w-full' src={course.courseThumbnail} alt="courseThumbnail" />
      <div className='p-3 text-left'>
        <h3 className='text-base font-semibold'>{course.courseTitle}</h3>
        <p className='text-gray-500'>{course.educator?.name || 'Unknown Educator'}</p>

        <div className='flex items-center space-x-2'>
          <p>{calculateRating(course)}</p>
          <div className='flex'>
            {[...Array(5)].map((_, i) => (
              <img className='w-3.5 h-3.5' key={i} src={i < Math.floor(calculateRating(course)) ? assets.star : assets.star_blank} alt='star' />
            ))}
          </div>
          <p className='text-gray-500'>{course.courseRatings?.length || 0}</p>
        </div>
        <p className='text-base font-semibold text-gray-800'>{currency} {((course.coursePrice || 0) - ((course.discount || 0) * (course.coursePrice || 0) / 100)).toFixed(2)}</p>
      </div>
    </Link>
  )
}

export default CourseCard
